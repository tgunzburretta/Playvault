// server.js — PLAYVAULT starter: seller subscriptions (Silver/Gold), Connect
// escrow for buyer-protected sales, and the webhook that ties both together.
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
const { randomUUID } = require("crypto");
const db = require("./db");
const { logInfo, logError, alertOps } = require("./logger");
const { homePage, donePage } = require("./views");

const {
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET,
  SILVER_PRICE_ID,
  GOLD_PRICE_ID,
  PORT,
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
const PORT_NUM = Number(PORT) || 4242;
const BASE_URL = `http://localhost:${PORT_NUM}`;

// Map a Stripe price ID -> the seller fee rate that tier unlocks.
// This is the "clever bit": the subscription just changes which number you plug in.
const FEE_RATE_BY_PRICE = {
  [SILVER_PRICE_ID]: 0.06, // Silver: 6%
  [GOLD_PRICE_ID]: 0.03,   // Gold: 3%
};
const DEFAULT_FEE_RATE = 0.10; // Bronze / no sub: 10%

async function updateSellerFeeRate(customerId, feeRate) {
  db.setSellerFeeRate(customerId, feeRate);
  logInfo("seller fee rate updated", { customerId, feeRatePercent: Math.round(feeRate * 100) });
}

function currentFeeRateFor(customerId) {
  return db.getSellerFeeRate(customerId) ?? DEFAULT_FEE_RATE;
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
    logError("failed to start subscription checkout", err, { tier: req.params.tier });
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
    logError("failed to open billing portal", err, { customerId: req.body.customerId });
    res.status(500).json({ error: "Could not open portal." });
  }
});

// ── 3. Connect onboarding (sellers need a payout-capable account for escrow) ─
// POST /connect/onboard  body: { "customerId": "cus_xxx" }
app.post("/connect/onboard", express.json(), async (req, res) => {
  const { customerId } = req.body;
  if (!customerId) return res.status(400).json({ error: "customerId is required." });
  try {
    let accountId = db.getSellerConnectAccount(customerId);
    if (!accountId) {
      const account = await stripe.accounts.create({ type: "express" });
      accountId = account.id;
      db.setSellerConnectAccount(customerId, accountId);
    }
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${BASE_URL}/`,
      return_url: `${BASE_URL}/done`,
      type: "account_onboarding",
    });
    res.json({ url: accountLink.url });
  } catch (err) {
    logError("failed to start Connect onboarding", err, { customerId });
    res.status(500).json({ error: "Could not start onboarding." });
  }
});

// ── 4. Buy: escrow checkout for a marketplace sale ───────────────────────────
// POST /buy  body: { sellerCustomerId, amount (cents), currency?, description? }
// Funds land on the platform first; the webhook moves the order into escrow
// once payment succeeds. Release-to-seller is a separate step, not built yet.
app.post("/buy", express.json(), async (req, res) => {
  const { sellerCustomerId, amount, currency = "usd", description = "Playvault item" } = req.body;
  if (!sellerCustomerId || !amount) {
    return res.status(400).json({ error: "sellerCustomerId and amount are required." });
  }
  const connectAccountId = db.getSellerConnectAccount(sellerCustomerId);
  if (!connectAccountId || !db.isSellerOnboarded(connectAccountId)) {
    return res.status(400).json({ error: "Seller is not onboarded for payouts yet." });
  }
  const orderId = randomUUID();
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        price_data: { currency, unit_amount: amount, product_data: { name: description } },
        quantity: 1,
      }],
      metadata: { orderId, sellerCustomerId, connectAccountId },
      success_url: `${BASE_URL}/done?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/`,
    });
    res.redirect(303, session.url);
  } catch (err) {
    logError("failed to start escrow checkout", err, { sellerCustomerId });
    res.status(500).json({ error: "Could not start checkout." });
  }
});

// ── 5. Refund an escrowed order back to the buyer ─────────────────────────────
app.post("/orders/:id/refund", express.json(), async (req, res) => {
  const order = db.getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: "Unknown order." });
  try {
    await stripe.refunds.create({ payment_intent: order.payment_intent_id });
    db.markOrderRefunded(order.id);
    logInfo("order refunded to buyer", { orderId: order.id });
    res.json({ refunded: true });
  } catch (err) {
    logError("failed to refund order", err, { orderId: order.id });
    res.status(500).json({ error: "Could not refund." });
  }
});

app.get("/orders/:id", (req, res) => {
  const order = db.getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: "Unknown order." });
  res.json(order);
});

// ── 6. Webhook: subscriptions -> fee rate, Connect status, escrow orders ─────
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
    // Bad signature: never a case worth retrying, so 400 (not 500) tells
    // Stripe's dashboard this delivery failed for good.
    console.error("⚠️  Bad webhook signature:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Idempotency: Stripe retries webhooks (network issues, slow 2xx, etc.), so
  // the same event id can arrive more than once. Treat a repeat as a no-op
  // rather than double-applying a fee change or a transfer.
  if (db.hasProcessedEvent(event.id)) {
    logInfo("duplicate webhook event ignored", { eventId: event.id, type: event.type });
    return res.json({ received: true, duplicate: true });
  }

  const obj = event.data.object;

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const priceId = obj.items?.data?.[0]?.price?.id;
        const active = ["active", "trialing"].includes(obj.status);
        const rate = active ? (FEE_RATE_BY_PRICE[priceId] ?? DEFAULT_FEE_RATE) : DEFAULT_FEE_RATE;
        await updateSellerFeeRate(obj.customer, rate);
        break;
      }
      case "customer.subscription.deleted":
        await updateSellerFeeRate(obj.customer, DEFAULT_FEE_RATE);
        break;
      case "invoice.payment_failed":
        alertOps(`Payment failed for ${obj.customer} — chase or downgrade.`);
        break;
      case "account.updated": {
        const onboarded = !!(obj.charges_enabled && obj.details_submitted);
        db.setSellerOnboarded(obj.id, onboarded);
        logInfo("connect account updated", { accountId: obj.id, onboarded });
        break;
      }
      case "checkout.session.completed": {
        const { orderId, sellerCustomerId, connectAccountId } = obj.metadata || {};
        // Only escrow-flow sessions (from /buy) carry this metadata; plain
        // subscription checkouts fall through untouched.
        if (orderId && sellerCustomerId && connectAccountId && obj.mode === "payment") {
          const feeRate = currentFeeRateFor(sellerCustomerId);
          const amount = obj.amount_total;
          const feeAmount = Math.round(amount * feeRate);
          db.createOrder({
            id: orderId,
            seller_customer_id: sellerCustomerId,
            connect_account_id: connectAccountId,
            payment_intent_id: obj.payment_intent,
            amount,
            fee_amount: feeAmount,
            currency: obj.currency,
          });
          logInfo("order held in escrow", { orderId, amount, feeAmount });
        }
        break;
      }
      default:
        break; // ignore the rest for now
    }
    db.markEventProcessed(event.id, event.type);
    res.json({ received: true });
  } catch (err) {
    // Respond 500 so Stripe retries this event with backoff; the idempotency
    // check above makes that safe to do.
    logError("webhook handler failed", err, { eventId: event.id, type: event.type });
    res.status(500).json({ error: "Webhook handler failed." });
  }
});

app.get("/", (_req, res) => res.send(homePage()));
app.get("/done", (_req, res) => res.send(donePage()));

app.listen(PORT_NUM, () => console.log("PLAYVAULT server on " + BASE_URL));
