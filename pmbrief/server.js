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
const cookieSession = require("cookie-session");
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
const isProd = NODE_ENV === "production";

// Derived per-request, not hardcoded — a fixed localhost BASE_URL would send
// every deployed user's Stripe redirect back to a URL that only exists on
// the dev machine. `trust proxy` makes req.protocol honor Render's
// X-Forwarded-Proto so this resolves to https in production.
function baseUrl(req) {
  return `${req.protocol}://${req.get("host")}`;
}

app.set("trust proxy", 1);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        "font-src": ["'self'", "https://fonts.gstatic.com"],
      },
    },
  })
);

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
    case "invoice.payment_failed": {
      // A failed card charge doesn't fire a subscription.updated event by
      // itself — without this, a subscriber whose card was declined would
      // keep full access with no signal to them or to you that billing is
      // broken until Stripe eventually cancels the subscription outright.
      const user = store.findByStripeCustomerId(obj.customer);
      if (user) store.updateUser(user.id, { subscriptionStatus: "past_due" });
      break;
    }
    default:
      break;
  }

  res.json({ received: true });
});

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
// Signed, stateless cookie sessions — no server-side store, so nothing to
// leak memory over time and nobody gets logged out just because Render
// restarted the process on a redeploy. Session payload here is tiny
// (a user id + a CSRF token), well within the 4KB cookie limit.
app.use(
  cookieSession({
    name: "pmbrief.sid",
    keys: [SESSION_SECRET],
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    maxAge: 1000 * 60 * 60 * 24 * 14, // 14 days
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
  req.session = null; // cookie-session has no server-side store to destroy
  res.redirect("/");
});

// ── Library (gated) ─────────────────────────────────────────────────────────
app.get("/dashboard", requireLogin, (req, res) => {
  res.send(dashboardPage({ user: currentUser(req), csrf: csrfToken(req) }));
});

// ── Stripe checkout ──────────────────────────────────────────────────────
app.get("/subscribe/:tier", requireLogin, async (req, res) => {
  const priceId = req.params.tier === "pro" ? PRO_PRICE_ID : CORE_PRICE_ID;
  const user = currentUser(req);
  // Already paying — send them to the portal instead of starting a second,
  // stacked subscription against the same card.
  if (user.subscriptionStatus === "active") return res.redirect("/dashboard");
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: user.stripeCustomerId || undefined,
      customer_email: user.stripeCustomerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl(req)}/dashboard?msg=Subscribed! Welcome to PMBrief.`,
      cancel_url: `${baseUrl(req)}/dashboard`,
      // automatic_tax requires Stripe Tax to be configured (business address
      // etc.) or Checkout Session creation fails outright — that would break
      // every single checkout on a freshly created account. Turn this back
      // on in the Stripe dashboard once Tax is set up, not before.
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
      return_url: `${baseUrl(req)}/dashboard`,
    });
    res.redirect(303, portal.url);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Could not open billing portal.");
  }
});

app.listen(PORT_NUM, () => console.log(`PMBrief running at http://localhost:${PORT_NUM}`));
