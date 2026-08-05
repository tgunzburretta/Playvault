# Playvault Stripe starter

This repo contains a starter to manage seller subscription tiers (Silver/Gold), flip seller
fee rates via webhooks, and run Connect escrow for buyer-protected marketplace sales
(hold funds on `checkout.session.completed`, refund via `/orders/:id/refund`).

Files:
- server.js — routes: subscriptions, portal, Connect onboarding, escrow checkout, refunds, webhook
- db.js — in-memory store for seller fee rates, Connect account status, orders, processed webhook events (swap for a real DB before production)
- logger.js — structured `logInfo`/`logError` plus an `alertOps` stub for paging/Slack
- views.js — the HTML for `/` and `/done`
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

Escrow flow
1. Seller onboards for payouts: `POST /connect/onboard` `{ "customerId": "cus_xxx" }` -> redirect the seller to the returned `url`. Stripe's `account.updated` webhook flips them to onboarded once `charges_enabled && details_submitted`.
2. Buyer purchases: `POST /buy` `{ "sellerCustomerId": "cus_xxx", "amount": 1999, "description": "..." }` -> redirects to Checkout. On `checkout.session.completed` the webhook creates an escrowed order.
3. Refund if needed: `POST /orders/:id/refund` refunds the payment intent and marks the order refunded.
4. Look up an order: `GET /orders/:id`.

Next steps
- Replace db.js's in-memory Maps with a real DB write.
- Add a release-to-seller step (Stripe Transfer) once the buyer confirms receipt — currently orders only move from escrow to refunded.
- Wire logger.js's alertOps() into a real pager/Slack integration.
