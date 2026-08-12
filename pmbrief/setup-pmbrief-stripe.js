// setup-pmbrief-stripe.js
// Creates the PMBrief Core and Pro subscription products/prices and prints
// the price IDs. Run with a TEST key only.
//
// Usage:
//   STRIPE_SECRET_KEY=sk_test_xxx node setup-pmbrief-stripe.js

const { STRIPE_SECRET_KEY } = process.env;
if (!STRIPE_SECRET_KEY || !STRIPE_SECRET_KEY.startsWith("sk_test_")) {
  console.error("❌ Set STRIPE_SECRET_KEY to your TEST key (starts with sk_test_).");
  process.exit(1);
}

const stripe = require("stripe")(STRIPE_SECRET_KEY);

async function createIfMissingProduct(name, lookupKey) {
  const existing = await stripe.products.list({ limit: 10, lookup_keys: [lookupKey] }).catch(() => null);
  if (existing && existing.data && existing.data.length) return existing.data[0];
  return stripe.products.create({ name, lookup_key: lookupKey });
}

async function createPrice(productId, unitAmount) {
  return stripe.prices.create({
    product: productId,
    unit_amount: unitAmount,
    currency: "usd",
    recurring: { interval: "month" },
  });
}

(async () => {
  try {
    const core = await createIfMissingProduct("PMBrief Core", "pmbrief_core");
    const pro = await createIfMissingProduct("PMBrief Pro", "pmbrief_pro");

    const corePrice = await createPrice(core.id, 1900); // $19/mo
    const proPrice = await createPrice(pro.id, 4900); // $49/mo

    console.log("CORE_PRICE_ID=" + corePrice.id);
    console.log("PRO_PRICE_ID=" + proPrice.id);
    console.log("\nAdd those to your .env and run: npm start");
    console.log("Then in another terminal: stripe listen --forward-to localhost:4300/webhook");
  } catch (err) {
    console.error("Error creating products/prices:", err.message || err);
    process.exit(1);
  }
})();
