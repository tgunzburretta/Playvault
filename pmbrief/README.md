# PMBrief

A subscription AI-prompt library for product managers, built as a working
starter: real login, real Stripe subscriptions (test mode), real security
basics. This is the actual codebase for the "select the best 15 PM prompts,
build a subscription business around them" product — see the business plan
artifact for pricing rationale, the 6-month plan, and go-to-market strategy.

Files:
- `server.js` — the app: auth, session, Stripe checkout/portal/webhook, security middleware
- `lib/store.js` — JSON-file user store (swap for a real DB before scaling)
- `lib/auth.js` — password hashing, CSRF, login-required guard
- `lib/views.js` — server-rendered HTML (landing, auth, dashboard)
- `content/prompts.js` — the 15 curated prompts (the actual paid product)
- `setup-pmbrief-stripe.js` — creates Core/Pro Stripe products+prices

## Quick start

1. Install dependencies
   ```
   npm install
   ```

2. Export a Stripe **test** key (never commit it):
   ```
   export STRIPE_SECRET_KEY=sk_test_xxx
   ```

3. Create products and prices (prints price IDs):
   ```
   npm run setup-stripe
   ```

4. In a second terminal, forward webhooks (prints `STRIPE_WEBHOOK_SECRET`):
   ```
   stripe listen --forward-to localhost:4300/webhook
   ```

5. Start the server:
   ```
   SESSION_SECRET=$(openssl rand -hex 32) \
   STRIPE_SECRET_KEY=sk_test_xxx \
   STRIPE_WEBHOOK_SECRET=whsec_xxx \
   CORE_PRICE_ID=price_xxx \
   PRO_PRICE_ID=price_xxx \
   npm start
   ```

6. Open http://localhost:4300, sign up, subscribe with test card
   `4242 4242 4242 4242` (any future expiry, any CVC).

## Security posture (what's already handled, and what isn't)

Handled: password hashing (bcrypt, 12 rounds), httpOnly/sameSite session
cookies, CSRF tokens on every form post, rate limiting on login/signup,
`helmet` security headers, webhook signature verification, secrets read only
from environment variables, refuses to boot on a live Stripe key or a weak
session secret.

Not handled yet — do these before real users' money touches this:
- Swap the JSON file store for a real database with proper migrations.
- Add email verification and a password-reset flow.
- Put this behind HTTPS (a platform like Render/Fly/Railway does this for you).
- Add structured logging/alerting on webhook failures and failed logins.
- Load-test the rate limiter's thresholds for your actual traffic.
