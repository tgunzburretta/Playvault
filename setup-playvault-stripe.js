// setup-playvault-stripe.js
// Creates Playvault Silver and Gold subscription products and prices and prints
// the price IDs. Run with your test key only.
//
// Usage:
//   STRIPE_SECRET_KEY=sk_test_xxx node setup-playvault-stripe.js

const assert = require('assert');
const Stripe = require('stripe');

const { STRIPE_SECRET_KEY } = process.env;
if (!STRIPE_SECRET_KEY || !STRIPE_SECRET_KEY.startsWith('sk_test_')) {
  console.error('❌ Set STRIPE_SECRET_KEY to your TEST key (starts with sk_test_).');
  process.exit(1);
}

const stripe = Stripe(STRIPE_SECRET_KEY);

async function createIfMissingProduct(name, lookupKey) {
  // Try to find by lookup_key first
  const existing = await stripe.products.list({ limit: 10, lookup_keys: [lookupKey] }).catch(()=>null);
  if (existing && existing.data && existing.data.length) return existing.data[0];
  return stripe.products.create({ name, lookup_key: lookupKey });
}

async function createPrice(productId, unitAmount) {
  return stripe.prices.create({
    product: productId,
    unit_amount: unitAmount,
    currency: 'usd',
    recurring: { interval: 'month' },
  });
}

(async () => {
  try {
    const silver = await createIfMissingProduct('Playvault Silver', 'playvault_silver');
    const gold = await createIfMissingProduct('Playvault Gold', 'playvault_gold');

    // You can change amounts here (amounts in cents)
    const silverPrice = await createPrice(silver.id, 500); // $5/mo
    const goldPrice = await createPrice(gold.id, 1500);  // $15/mo

    console.log('SILVER_PRICE_ID=' + silverPrice.id);
    console.log('GOLD_PRICE_ID=' + goldPrice.id);

    console.log('\nAdd those to your env or .env and run the server:');
    console.log('STRIPE_SECRET_KEY=sk_test_xxx');
    console.log('SILVER_PRICE_ID=' + silverPrice.id);
    console.log('GOLD_PRICE_ID=' + goldPrice.id);
    console.log('\nThen in another terminal run: stripe listen --forward-to localhost:4242/webhook');
  } catch (err) {
    console.error('Error creating products/prices:', err.message || err);
    process.exit(1);
  }
})();
