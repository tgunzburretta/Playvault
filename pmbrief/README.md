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

## Deploy to Render

The repo root has a different, unrelated app in it, so point Render at the
`pmbrief` subfolder rather than using its root-level auto-detection.

**Option A — Blueprint (recommended, uses `render.yaml`):**
1. Render dashboard → **New** → **Blueprint** → connect the `Playvault` repo.
2. When it asks for the Blueprint file location, enter `pmbrief/render.yaml`
   (not the default root path).
3. Render will prompt for the `sync: false` values before deploying:
   `STRIPE_SECRET_KEY` (your `sk_test_...` key), `CORE_PRICE_ID`,
   `PRO_PRICE_ID` — get these by running `npm run setup-stripe` locally first.
   Leave `STRIPE_WEBHOOK_SECRET` blank for now — step 5 below fills it in.
4. Deploy. Render builds with `npm install` and starts with `npm start`.
   `SESSION_SECRET` is auto-generated; `PORT` is supplied by Render
   automatically (`server.js` already reads it).
5. Once you have a live URL (`https://pmbrief-xxxx.onrender.com`), go to the
   Stripe dashboard → **Developers → Webhooks → Add endpoint**, set it to
   `https://pmbrief-xxxx.onrender.com/webhook`, subscribe to
   `customer.subscription.created`, `customer.subscription.updated`, and
   `customer.subscription.deleted`. Stripe shows a signing secret
   (`whsec_...`) — copy it into the `STRIPE_WEBHOOK_SECRET` env var in
   Render's dashboard and redeploy.

**Option B — manual Web Service (no Blueprint):**
New → Web Service → connect the repo → set **Root Directory** to `pmbrief` →
Build Command `npm install` → Start Command `npm start` → add the same six
env vars above in the dashboard's Environment tab → Deploy. Same webhook
step (5 above) applies afterward.

Render's free tier spins the service down after 15 minutes of no traffic —
the first request after idle takes a few extra seconds to wake it back up.
Fine for early testing; worth a paid instance once real subscribers depend
on checkout not timing out.

## Security posture (what's already handled, and what isn't)

Handled: password hashing (bcrypt, 12 rounds, length-capped to avoid
bcrypt's silent 72-byte truncation), signed httpOnly/sameSite session
cookies via `cookie-session` (no server-side session store — nothing to
leak memory over time, nobody gets logged out just because the process
restarted on a redeploy), CSRF tokens on every form post, rate limiting on
login/signup, `helmet` security headers (CSP scoped to allow only Google
Fonts as a third-party origin), webhook signature verification, checkout
URLs derived from the actual request host (not hardcoded to localhost, so
this doesn't break the moment it's deployed anywhere), a guard against a
subscribed user accidentally starting a second stacked subscription,
`invoice.payment_failed` handling so a declined card shows up as "payment
failed" instead of silently staying fully active, secrets read only from
environment variables, refuses to boot on a live Stripe key or a weak
session secret.

Trade-off worth knowing: because sessions live in a signed cookie instead
of a server-side store, there's no way to force-log-out a specific session
from the server (e.g. "log me out of my other devices") without rotating
`SESSION_SECRET`, which logs out everyone. Fine for an MVP at this scale;
revisit with a real session store if that becomes a real user request.

Not handled yet — do these before scaling past an early cohort of users:
- Swap the JSON file store for a real database with proper migrations.
- Add email verification and a password-reset flow.
- Put this behind HTTPS (a platform like Render/Fly/Railway does this for you).
- Add structured logging/alerting on webhook failures and failed logins.
- Load-test the rate limiter's thresholds for your actual traffic.
- Turn `automatic_tax` back on in the Stripe Checkout Session call once
  Stripe Tax is configured in the dashboard (business address, etc.) —
  left off deliberately so first checkout doesn't fail on an unconfigured
  account.
