// server.js — PLAYVAULT subscriptions starter (Silver/Gold + Customer Portal + fee-tier webhook)
//
// This is step 2–3 of the plan: stand up subscriptions and flip each seller's
// fee rate when their tier changes. Connect escrow (step 4) is a separate brick.
//
// SAFETY: keys come ONLY from environment variables. Never paste a key into this
// file, a repo, a screenshot, or a chat. This refuses to start on a live key.
//
// ── SETUP ───────────────────────────────────────────────────────────────────
//   npm init -y
//   npm install express stripe
//
//   You need four env vars. Get the price IDs from setup-playvault-stripe.js.
//   Get the webhook secret by running, in a second terminal:
//       stripe listen --forward-to localhost:4242/webhook
//   It prints a whsec_... — that's STRIPE_WEBHOOK_SECRET.
//
//   Then start the server (macOS/Linux):
//       STRIPE_SECRET_KEY=sk_test_xxx \
//       STRIPE_WEBHOOK_SECRET=whsec_xxx \
//       SILVER_PRICE_ID=price_xxx \
//       GOLD_PRICE_ID=price_xxx \
//       node server.js
//
//   Test the flow: open http://localhost:4242/subscribe/silver in a browser,
//   pay with card 4242 4242 4242 4242 (any future expiry, any CVC), and watch
//   the terminal — the webhook will log the seller's new fee rate.
// ─────────────────────────────────────────────────────────────────────────────

const express = require("express");

const {
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET,
  SILVER_PRICE_ID,
  GOLD_PRICE_ID,
} = process.env;

if (!STRIPE_SECRET_KEY || !STRIPE_SECRET_KEY.startsWith("sk_test_")) {
  console.error("❌ Set STRIPE_SECRET_KEY to your TEST key (starts with sk_test_).");
  process.exit(1);
}
if (!SILVER_PRICE_ID || !GOLD_PRICE_ID) {
  console.error("❌ Set SILVER_PRICE_ID and GOLD_PRICE_ID (from setup-playvault-stripe.js).");
  process.exit(1);
}

const stripe = require("stripe")(STRIPE_SECRET_KEY);
const app = express();
const BASE_URL = "http://localhost:4242";

// Map a Stripe price ID -> the seller fee rate that tier unlocks.
// This is the "clever bit": the subscription just changes which number you plug in.
const FEE_RATE_BY_PRICE = {
  [SILVER_PRICE_ID]: 0.06, // Silver: 6%
  [GOLD_PRICE_ID]: 0.03,   // Gold: 3%
};
const DEFAULT_FEE_RATE = 0.10; // Bronze / no sub: 10%

// TODO: replace with a real DB write. For now it just logs.
async function updateSellerFeeRate(customerId, feeRate) {
  console.log(`→ Seller ${customerId} fee rate is now ${(feeRate * 100).toFixed(0)}%`);
}

// ── 1. Start a subscription checkout ─────────────────────────────────────────
// GET /subscribe/silver or /subscribe/gold -> redirects to Stripe Checkout.
app.get("/subscribe/:tier", async (req, res) => {
  const priceId = req.params.tier === "gold" ? GOLD_PRICE_ID : SILVER_PRICE_ID;
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${BASE_URL}/done?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/`,
      // automatic_tax handles VAT on the subscription for you:
      automatic_tax: { enabled: true },
    });
    res.redirect(303, session.url);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Could not start checkout.");
  }
});

// ── 2. Customer Portal (self-serve cancel / change tier) ─────────────────────
// POST /portal  body: { "customerId": "cus_xxx" }
app.post("/portal", express.json(), async (req, res) => {
  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: req.body.customerId,
      return_url: BASE_URL,
    });
    res.json({ url: portal.url });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Could not open portal." });
  }
});

// ── 3. Webhook: keep the seller's fee rate in sync with their subscription ────
// IMPORTANT: raw body + signature verification. Mounted BEFORE any json parser
// on this path so the signature check works.
app.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers["stripe-signature"],
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("⚠️  Bad webhook signature:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const sub = event.data.object;

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const priceId = sub.items?.data?.[0]?.price?.id;
      const active = ["active", "trialing"].includes(sub.status);
      const rate = active ? (FEE_RATE_BY_PRICE[priceId] ?? DEFAULT_FEE_RATE) : DEFAULT_FEE_RATE;
      await updateSellerFeeRate(sub.customer, rate);
      break;
    }
    case "customer.subscription.deleted":
      await updateSellerFeeRate(sub.customer, DEFAULT_FEE_RATE);
      break;
    case "invoice.payment_failed":
      console.log(`→ Payment failed for ${sub.customer} — chase or downgrade.`);
      break;
    default:
      break; // ignore the rest for now
  }

  res.json({ received: true });
});

app.get("/", (_req, res) =>
  res.send('PLAYVAULT test server. Try <a href="/subscribe/silver">/subscribe/silver</a>.')
);
app.get("/done", (_req, res) => res.send("✅ Subscribed. Check the terminal for the fee-rate update."));

app.listen(4242, () => console.log("PLAYVAULT server on " + BASE_URL));
