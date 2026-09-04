# Playvault Stripe starter

This repo contains a starter to manage seller subscription tiers (Silver/Gold),
persist seller fee rates in a real database, and hold marketplace funds in
escrow via Stripe Connect until they're released to the seller.

Files:
- server.js — subscriptions, Connect escrow, and the webhook handler
- db.js — SQLite persistence for seller fee rates, Connect accounts, escrow orders, and webhook idempotency
- alert.js — structured logging + a single choke point to wire up real alerting
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

Seller fee rates now live in `playvault.db` (SQLite, created automatically on
first run — see `db.js`). The webhook writes to it instead of just logging.

Connect escrow

This needs Connect enabled on your Stripe account (test mode is fine).

1. Onboard a seller as a Connect Express account:
   curl -X POST localhost:4242/connect/onboard -H "Content-Type: application/json" \
     -d '{"customerId":"cus_seller123"}'
   Open the returned `url` and complete the (test-mode) onboarding form.
   Stripe sends an `account.updated` webhook once the account can accept
   transfers — watch the terminal for `connect account updated`.

2. Take a buyer payment, held on the platform balance (the "escrow"):
   Open http://localhost:4242/buy/cus_seller123?amount=2000 and pay with
   4242 4242 4242 4242. The webhook records an order row with status `held`.

3. Release funds to the seller (amount minus their current fee rate) once
   you're ready to pay out:
   curl -X POST localhost:4242/orders/<orderId>/release
   Or refund the buyer instead of paying the seller:
   curl -X POST localhost:4242/orders/<orderId>/refund

`GET /orders/:id` returns the current state of an order at any point.

Security
- Never commit secret keys or .env files. Use environment variables or a secret manager.
- The starter refuses to start on a live key (sk_live_). Switch keys only when ready to go to production.

Webhook hardening
- Signature verification: every event is checked with `stripe.webhooks.constructEvent` before anything else runs.
- Idempotency: each event id is recorded in the `webhook_events` table; redelivered events are treated as a no-op instead of double-applying a fee change or transfer.
- Retry/backoff: handler errors return HTTP 500 so Stripe's own retry/backoff schedule redelivers the event — safe to do because of the idempotency check above. Only a bad signature returns 400 (no retry, since it will never succeed).
- Logging/alerting: `alert.js` gives structured JSON logs and a single `alertOps()` choke point — wire that function to Slack/PagerDuty/email for production paging.

Next steps
- Swap SQLite (`db.js`) for Postgres/MySQL if you need multi-instance deployments.
- Add authentication in front of `/connect/onboard`, `/buy/:sellerCustomerId`, and `/orders/:id/*` — this starter trusts whoever calls them.
- Consider Stripe's `application_fee_amount` + `transfer_data.destination` (destination charges) instead of separate charges/transfers if you don't need to hold funds before paying sellers out.
