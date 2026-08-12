// PMBrief — subscription-gated AI-prompt library for product managers.
//
// SECURITY NOTES (read before deploying):
//   - Secrets come ONLY from environment variables. Never commit a key.
//   - Refuses to start on a Stripe live key or a missing/weak SESSION_SECRET.
//   - Passwords are hashed with bcrypt (12 rounds), never stored in plaintext.
//   - Sessions are httpOnly + sameSite=lax; `secure` is forced on in production.
//   - Login/signup are rate-limited to slow down credential stuffing.
//   - All state-changing form posts require a per-session CSRF token.
//   - The Stripe webhook route verifies the signature before trusting any event.
//
// ── SETUP ───────────────────────────────────────────────────────────────────
//   cd pmbrief && npm install
//
//   Required env vars (see .env.example):
//     SESSION_SECRET      any long random string
//     STRIPE_SECRET_KEY   sk_test_...  (test key only — see safety check below)
//     STRIPE_WEBHOOK_SECRET
//     CORE_PRICE_ID, PRO_PRICE_ID   from `npm run setup-stripe`
//
//   Then:
//     npm run setup-stripe          # creates Core/Pro products+prices, prints IDs
//     stripe listen --forward-to localhost:4300/webhook   # in a second terminal
//     npm start
// ─────────────────────────────────────────────────────────────────────────────

const express = require("express");
const helmet = require("helmet");
const session = require("express-session");
const rateLimit = require("express-rate-limit");

const store = require("./lib/store");
const {
  hashPassword,
  verifyPassword,
  isValidEmail,
  isValidPassword,
  newId,
  requireLogin,
  csrfToken,
  requireCsrf,
} = require("./lib/auth");
const { landingPage, authPage, dashboardPage } = require("./lib/views");

const {
  SESSION_SECRET,
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET,
  CORE_PRICE_ID,
  PRO_PRICE_ID,
  PORT,
  NODE_ENV,
} = process.env;

if (!SESSION_SECRET || SESSION_SECRET.length < 16) {
  console.error("❌ Set SESSION_SECRET to a long random string (16+ chars).");
  process.exit(1);
}
if (!STRIPE_SECRET_KEY || !STRIPE_SECRET_KEY.startsWith("sk_test_")) {
  console.error("❌ Set STRIPE_SECRET_KEY to your TEST key (starts with sk_test_).");
  process.exit(1);
}
if (!CORE_PRICE_ID || !PRO_PRICE_ID) {
  console.error("❌ Set CORE_PRICE_ID and PRO_PRICE_ID (from `npm run setup-stripe`).");
  process.exit(1);
}

const stripe = require("stripe")(STRIPE_SECRET_KEY);
const app = express();
const PORT_NUM = Number(PORT) || 4300;
const BASE_URL = `http://localhost:${PORT_NUM}`;
const isProd = NODE_ENV === "production";

app.set("trust proxy", 1);
app.use(helmet());

// Stripe webhook needs the RAW body for signature verification, so it's
// mounted before the JSON/urlencoded parsers, on its own path only.
app.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"], STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("⚠️  Bad webhook signature:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const obj = event.data.object;

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const user = store.findByStripeCustomerId(obj.customer);
      if (user) {
        const priceId = obj.items?.data?.[0]?.price?.id;
        const tier = priceId === PRO_PRICE_ID ? "pro" : "core";
        const active = ["active", "trialing"].includes(obj.status);
        store.updateUser(user.id, {
          subscriptionStatus: active ? "active" : obj.status,
          subscriptionTier: active ? tier : null,
        });
      }
      break;
    }
    case "customer.subscription.deleted": {
      const user = store.findByStripeCustomerId(obj.customer);
      if (user) store.updateUser(user.id, { subscriptionStatus: "canceled", subscriptionTier: null });
      break;
    }
    default:
      break;
  }

  res.json({ received: true });
});

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      maxAge: 1000 * 60 * 60 * 24 * 14, // 14 days
    },
  })
);

function currentUser(req) {
  if (!req.session.userId) return null;
  return store.findById(req.session.userId);
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many attempts. Try again in a few minutes.",
});

// ── Marketing ─────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.send(landingPage({ user: currentUser(req), flash: req.query.msg }));
});

// ── Auth ─────────────────────────────────────────────────────────────────
app.get("/signup", (req, res) => res.send(authPage({ mode: "signup", csrf: csrfToken(req) })));
app.get("/login", (req, res) => res.send(authPage({ mode: "login", csrf: csrfToken(req) })));

app.post("/signup", authLimiter, requireCsrf, async (req, res) => {
  const { email, password } = req.body;
  if (!isValidEmail(email) || !isValidPassword(password)) {
    return res.status(400).send(authPage({ mode: "signup", csrf: csrfToken(req), error: "Enter a valid email and a password of 10+ characters." }));
  }
  if (store.findByEmail(email)) {
    return res.status(400).send(authPage({ mode: "signup", csrf: csrfToken(req), error: "An account with that email already exists." }));
  }
  const user = store.createUser({ id: newId(), email, passwordHash: hashPassword(password) });
  req.session.userId = user.id;
  res.redirect("/dashboard");
});

app.post("/login", authLimiter, requireCsrf, async (req, res) => {
  const { email, password } = req.body;
  const user = store.findByEmail(email || "");
  if (!user || !verifyPassword(password || "", user.passwordHash)) {
    return res.status(401).send(authPage({ mode: "login", csrf: csrfToken(req), error: "Incorrect email or password." }));
  }
  req.session.userId = user.id;
  res.redirect("/dashboard");
});

app.post("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

// ── Library (gated) ─────────────────────────────────────────────────────────
app.get("/dashboard", requireLogin, (req, res) => {
  res.send(dashboardPage({ user: currentUser(req), csrf: csrfToken(req) }));
});

// ── Stripe checkout ──────────────────────────────────────────────────────
app.get("/subscribe/:tier", requireLogin, async (req, res) => {
  const priceId = req.params.tier === "pro" ? PRO_PRICE_ID : CORE_PRICE_ID;
  const user = currentUser(req);
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: user.stripeCustomerId || undefined,
      customer_email: user.stripeCustomerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${BASE_URL}/dashboard?msg=Subscribed! Welcome to PMBrief.`,
      cancel_url: `${BASE_URL}/dashboard`,
      automatic_tax: { enabled: true },
      metadata: { userId: user.id },
    });
    // Stripe creates the customer immediately for subscription-mode Checkout
    // Sessions, so `session.customer` is already set here — persist it now
    // so the webhook can find this user by customer id later.
    if (session.customer) store.updateUser(user.id, { stripeCustomerId: session.customer });
    res.redirect(303, session.url);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Could not start checkout.");
  }
});

app.post("/billing-portal", requireLogin, requireCsrf, async (req, res) => {
  const user = currentUser(req);
  if (!user.stripeCustomerId) return res.redirect("/dashboard");
  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${BASE_URL}/dashboard`,
    });
    res.redirect(303, portal.url);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Could not open billing portal.");
  }
});

app.listen(PORT_NUM, () => console.log(`PMBrief running at ${BASE_URL}`));
