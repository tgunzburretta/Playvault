# Playvault Stripe starter

This repo contains a minimal starter to manage seller subscription tiers (Silver/Gold) and to update seller fee rates via webhooks.

Files:
- server.js — subscription starter and webhook handler (provided by you)
- setup-playvault-stripe.js — script to create Playvault Silver/Gold products and prices and print price IDs
- package.json — scripts and dependencies

Quick start

1. Install dependencies
   npm install

2. Create test API key in your Stripe dashboard and export it only in your shell (do NOT commit it):
   export STRIPE_SECRET_KEY=sk_test_xxx

3. Create products and prices (prints price IDs):
   npm run setup-stripe

4. Start webhook forwarding in a second terminal (this prints STRIPE_WEBHOOK_SECRET):
   stripe listen --forward-to localhost:4242/webhook

5. Start the server (use the test key and the price IDs printed earlier):
   STRIPE_SECRET_KEY=sk_test_xxx \
   STRIPE_WEBHOOK_SECRET=whsec_xxx \
   SILVER_PRICE_ID=price_xxx \
   GOLD_PRICE_ID=price_xxx \
   npm start

6. Test in a browser:
   Open http://localhost:4242/subscribe/silver and complete Checkout with test card 4242 4242 4242 4242.

Security
- Never commit secret keys or .env files. Use environment variables or a secret manager.
- The starter refuses to start on a live key (sk_live_). Switch keys only when ready to go to production.

Next steps
- Replace the in-memory updateSellerFeeRate() with a real DB write.
- Implement Connect escrow (if you need to hold marketplace funds) and payouts to connected accounts.
- Add webhook signature verification, idempotency, retry/backoff and logging/alerting for production.
