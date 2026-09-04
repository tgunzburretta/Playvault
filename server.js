// server.js — PLAYVAULT subscriptions + Connect escrow starter
//
// Three bricks, all wired up now:
//   1. Silver/Gold subscriptions + Customer Portal (checkout & self-serve).
//   2. Webhook keeps each seller's fee rate in sync with their subscription,
//      backed by a real DB (db.js / SQLite), idempotent against redelivery.
//   3. Connect escrow: onboard sellers as Connect Express accounts, take a
//      buyer payment into the platform balance (held), then release it to
//      the seller's connected account minus the seller's current fee rate.
//
// SAFETY: keys come ONLY from environment variables. Never paste a key into
// this file, a repo, a screenshot, or a chat. This refuses to start on a
// live key.
//
// ── SETUP ───────────────────────────────────────────────────────────────────
//   npm install
//
//   You need four Stripe env vars. Get the price IDs from
//   setup-playvault-stripe.js. Get the webhook secret by running, in a
//   second terminal:
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
//   Subscriptions: open http://localhost:4242/subscribe/silver, pay with
//   card 4242 4242 4242 4242 (any future expiry, any CVC), and watch the
//   terminal — the webhook will log + persist the seller's new fee rate.
//
//   Connect escrow (needs Connect enabled on your Stripe account):
//     1. POST /connect/onboard { "customerId": "cus_seller" } -> follow the
//        returned url to finish Express onboarding (test mode: any details).
//     2. GET /buy/cus_seller?amount=2000 -> pay as a buyer. Funds land on the
//        platform balance, held against an order row.
//     3. POST /orders/:id/release -> transfers (amount - seller's fee) to
//        the seller's connected account. POST /orders/:id/refund instead if
//        the order falls through.
// ─────────────────────────────────────────────────────────────────────────────

const crypto = require("crypto");
const express = require("express");
const db = require("./db");
const { logInfo, logError, alertOps } = require("./alert");

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
if (!STRIPE_WEBHOOK_SECRET) {
  console.error("❌ Set STRIPE_WEBHOOK_SECRET (from `stripe listen --forward-to localhost:4242/webhook`).");
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
  logInfo("seller fee rate updated", { customerId, feeRatePct: (feeRate * 100).toFixed(0) + "%" });
}

function currentFeeRateFor(customerId) {
  const seller = db.getSeller(customerId);
  return seller ? seller.fee_rate : DEFAULT_FEE_RATE;
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

// ── 3. Connect escrow: onboarding ────────────────────────────────────────────
// POST /connect/onboard  body: { "customerId": "cus_seller" }
// Creates (or reuses) a Connect Express account for the seller and returns an
// onboarding link. Re-callable: if onboarding was abandoned, this mints a
// fresh link for the same account instead of creating a duplicate one.
app.post("/connect/onboard", express.json(), async (req, res) => {
  const { customerId } = req.body;
  if (!customerId) return res.status(400).json({ error: "customerId is required." });

  try {
    let seller = db.getSeller(customerId);
    let accountId = seller && seller.connect_account_id;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: { playvaultCustomerId: customerId },
      });
      accountId = account.id;
      db.setSellerConnectAccount(customerId, accountId);
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${BASE_URL}/connect/refresh/${customerId}`,
      return_url: `${BASE_URL}/connect/return/${customerId}`,
      type: "account_onboarding",
    });

    res.json({ url: accountLink.url, accountId });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Could not start Connect onboarding." });
  }
});

// GET /connect/refresh/:customerId — Stripe sends the seller back here if the
// onboarding link expired; mint a new one and bounce them straight to it.
app.get("/connect/refresh/:customerId", async (req, res) => {
  const seller = db.getSeller(req.params.customerId);
  if (!seller || !seller.connect_account_id) return res.status(404).send("Unknown seller.");
  try {
    const accountLink = await stripe.accountLinks.create({
      account: seller.connect_account_id,
      refresh_url: `${BASE_URL}/connect/refresh/${req.params.customerId}`,
      return_url: `${BASE_URL}/connect/return/${req.params.customerId}`,
      type: "account_onboarding",
    });
    res.redirect(303, accountLink.url);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Could not refresh onboarding link.");
  }
});

// GET /connect/return/:customerId — Stripe sends the seller back here after
// onboarding. account.updated webhook is the source of truth for status;
// this is just a friendly landing page.
app.get("/connect/return/:customerId", (req, res) => {
  res.send("✅ Onboarding submitted. Check the terminal for account status once Stripe confirms it.");
});

// ── 4. Connect escrow: take a buyer payment and hold it ──────────────────────
// GET /buy/:sellerCustomerId?amount=2000  (amount in cents, defaults to 2000)
// Charges the buyer to the PLATFORM balance (no destination yet) — that's the
// "escrow": PLAYVAULT holds the funds until /orders/:id/release lets them go.
app.get("/buy/:sellerCustomerId", async (req, res) => {
  const { sellerCustomerId } = req.params;
  const amount = Math.max(50, parseInt(req.query.amount, 10) || 2000); // Stripe minimum ~$0.50

  const seller = db.getSeller(sellerCustomerId);
  if (!seller || !seller.connect_account_id) {
    return res.status(400).send("Seller has not started Connect onboarding yet.");
  }
  if (!seller.connect_onboarded) {
    return res.status(400).send("Seller's Connect account isn't ready to accept transfers yet.");
  }

  const orderId = crypto.randomUUID();

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `PLAYVAULT order ${orderId}` },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      // No transfer_data here on purpose: money lands on the platform
      // account first (held), and we move it with a Transfer at release time.
      payment_intent_data: {
        metadata: { orderId, sellerCustomerId, connectAccountId: seller.connect_account_id },
      },
      metadata: { orderId, sellerCustomerId, connectAccountId: seller.connect_account_id },
      success_url: `${BASE_URL}/done?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/`,
    });
    res.redirect(303, session.url);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Could not start checkout.");
  }
});

// ── 5. Connect escrow: release or refund a held order ────────────────────────
// POST /orders/:id/release — pays the seller (amount minus their current fee
// rate) out of the platform balance into their connected account.
app.post("/orders/:id/release", express.json(), async (req, res) => {
  const order = db.getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: "Unknown order." });
  if (order.status !== "held") {
    return res.status(409).json({ error: `Order is ${order.status}, not held.` });
  }

  const payoutAmount = order.amount - order.fee_amount;
  try {
    const transfer = await stripe.transfers.create({
      amount: payoutAmount,
      currency: order.currency,
      destination: order.connect_account_id,
      transfer_group: order.id,
      metadata: { orderId: order.id },
    });
    db.markOrderReleased(order.id, transfer.id);
    logInfo("order released to seller", { orderId: order.id, payoutAmount, transferId: transfer.id });
    res.json({ released: true, transferId: transfer.id, payoutAmount });
  } catch (err) {
    logError("failed to release order", err, { orderId: order.id });
    res.status(500).json({ error: "Could not release funds." });
  }
});

// POST /orders/:id/refund — refunds the buyer instead of paying the seller.
app.post("/orders/:id/refund", express.json(), async (req, res) => {
  const order = db.getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: "Unknown order." });
  if (order.status !== "held") {
    return res.status(409).json({ error: `Order is ${order.status}, not held.` });
  }

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

app.get("/", (_req, res) =>
  res.send('PLAYVAULT test server. Try <a href="/subscribe/silver">/subscribe/silver</a>.')
);
app.get("/done", (_req, res) => res.send("✅ Done. Check the terminal for details."));

app.listen(PORT_NUM, () => console.log("PLAYVAULT server on " + BASE_URL));
