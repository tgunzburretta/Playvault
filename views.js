// views.js — self-contained HTML for the PLAYVAULT test server.
// No build step, no CDN fonts/scripts: everything inlined so the page
// renders identically offline. Swap for real templates/a frontend once
// this stops being a Stripe integration test harness.

const shell = (body, { center = false } = {}) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>PLAYVAULT</title>
<style>
  :root {
    color-scheme: dark;
    --bg-0: #0a0a12;
    --bg-1: #12121e;
    --accent-1: #7c5cff;
    --accent-2: #22d3ee;
    --accent-3: #f472b6;
    --text-0: #f5f5fa;
    --text-1: #a8a8bd;
    --border: rgba(255,255,255,0.09);
  }
  * { box-sizing: border-box; }
  html, body { height: 100%; }
  body {
    margin: 0;
    min-height: 100vh;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif;
    color: var(--text-0);
    background:
      radial-gradient(1200px 600px at 12% -10%, rgba(124,92,255,0.35), transparent 60%),
      radial-gradient(1000px 500px at 110% 10%, rgba(34,211,238,0.25), transparent 55%),
      radial-gradient(800px 500px at 50% 120%, rgba(244,114,182,0.18), transparent 55%),
      linear-gradient(180deg, var(--bg-0), var(--bg-1));
    display: flex;
    justify-content: center;
    padding: 6vh 20px;
  }
  body.center { align-items: center; }
  .wrap { width: 100%; max-width: 960px; }
  .check {
    display: inline-flex; align-items: center; justify-content: center;
    width: 26px; height: 26px; border-radius: 50%; margin-left: 4px;
    background: linear-gradient(120deg, var(--accent-1), var(--accent-2));
    vertical-align: middle;
  }
  .check svg { width: 15px; height: 15px; }
  .badge {
    display: inline-flex; align-items: center; gap: 8px;
    font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase;
    color: var(--text-1); border: 1px solid var(--border);
    padding: 6px 12px; border-radius: 999px; background: rgba(255,255,255,0.03);
  }
  .badge .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent-2); box-shadow: 0 0 8px var(--accent-2); }
  h1 {
    font-size: clamp(2.4rem, 6vw, 3.6rem);
    line-height: 1.05;
    margin: 20px 0 8px;
    letter-spacing: -0.02em;
    background: linear-gradient(120deg, #fff 10%, var(--accent-2) 50%, var(--accent-1) 90%);
    -webkit-background-clip: text; background-clip: text; color: transparent;
  }
  p.lede { color: var(--text-1); font-size: 1.05rem; max-width: 56ch; margin: 0 0 40px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; }
  .card {
    position: relative;
    border-radius: 18px;
    padding: 28px 26px;
    background: linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.02));
    border: 1px solid var(--border);
    backdrop-filter: blur(14px);
    overflow: hidden;
    transition: transform .18s ease, border-color .18s ease;
  }
  .card:hover { transform: translateY(-4px); border-color: rgba(255,255,255,0.22); }
  .card::before {
    content: ""; position: absolute; inset: -1px;
    background: var(--glow, none);
    opacity: .5; filter: blur(30px); z-index: -1;
  }
  .card.silver { --glow: radial-gradient(200px 120px at 20% 0%, rgba(168,168,189,0.35), transparent); }
  .card.gold   { --glow: radial-gradient(200px 120px at 20% 0%, rgba(250,204,21,0.28), transparent); }
  .card.feature { --glow: radial-gradient(200px 120px at 20% 0%, rgba(124,92,255,0.28), transparent); }
  .tier { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-1); margin: 0 0 6px; }
  .price { font-size: 2.2rem; font-weight: 650; margin: 0 0 4px; }
  .price small { font-size: 0.95rem; color: var(--text-1); font-weight: 400; }
  .fee { color: var(--accent-2); font-size: 0.9rem; margin: 0 0 18px; }
  ul.perks { list-style: none; margin: 0 0 22px; padding: 0; color: var(--text-1); font-size: 0.92rem; }
  ul.perks li { padding: 5px 0; padding-left: 22px; position: relative; }
  ul.perks li::before { content: "✓"; position: absolute; left: 0; color: var(--accent-2); }
  a.btn {
    display: inline-block; width: 100%; text-align: center;
    padding: 12px 18px; border-radius: 12px; text-decoration: none;
    font-weight: 600; font-size: 0.95rem;
    background: linear-gradient(120deg, var(--accent-1), var(--accent-2));
    color: #0a0a12;
    transition: filter .15s ease;
  }
  a.btn:hover { filter: brightness(1.08); }
  a.btn.ghost {
    background: transparent; color: var(--text-0);
    border: 1px solid var(--border);
  }
  .section-title { margin: 56px 0 16px; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-1); }
  .icon { font-size: 1.6rem; margin-bottom: 10px; display: block; }
  footer { margin-top: 60px; color: var(--text-1); font-size: 0.82rem; text-align: center; }
  code { background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 6px; font-size: 0.85em; }
</style>
</head>
<body class="${center ? "center" : ""}">
  <div class="wrap">
    ${body}
  </div>
</body>
</html>`;

function homePage() {
  return shell(`
    <span class="badge"><span class="dot"></span> Stripe test mode</span>
    <h1>PLAYVAULT</h1>
    <p class="lede">Seller subscriptions that flip your marketplace fee, plus Connect escrow for buyer-protected sales — wired end-to-end with Stripe webhooks.</p>

    <div class="grid">
      <div class="card silver">
        <p class="tier">Silver</p>
        <p class="price">$5<small>/mo</small></p>
        <p class="fee">6% marketplace fee</p>
        <ul class="perks">
          <li>Lower fee on every sale</li>
          <li>Escrow-protected checkout</li>
          <li>Cancel anytime</li>
        </ul>
        <a class="btn" href="/subscribe/silver">Subscribe to Silver</a>
      </div>
      <div class="card gold">
        <p class="tier">Gold</p>
        <p class="price">$15<small>/mo</small></p>
        <p class="fee">3% marketplace fee</p>
        <ul class="perks">
          <li>Lowest fee tier</li>
          <li>Escrow-protected checkout</li>
          <li>Priority support</li>
        </ul>
        <a class="btn" href="/subscribe/gold">Subscribe to Gold</a>
      </div>
      <div class="card feature">
        <span class="icon">🔒</span>
        <p class="tier">Buyer protection</p>
        <p style="color: var(--text-1); font-size: 0.92rem; margin: 0 0 22px;">
          Payments settle to escrow on <code>checkout.session.completed</code> and can be refunded in one call via <code>/orders/:id/refund</code> until released.
        </p>
        <a class="btn ghost" href="/">Learn more</a>
      </div>
    </div>

    <p class="section-title">Manage a subscription</p>
    <div class="card" style="max-width: 420px;">
      <p style="color: var(--text-1); font-size: 0.92rem; margin: 0 0 16px;">Already subscribed? Open the Customer Portal to change tiers or cancel — <code>POST /portal</code> with your <code>customerId</code>.</p>
    </div>

    <footer>PLAYVAULT test server &middot; running against Stripe test keys only</footer>
  `);
}

function donePage() {
  return shell(`
    <span class="badge"><span class="dot"></span> Success</span>
    <h1>You're all set
      <span class="check">
        <svg viewBox="0 0 24 24" fill="none" stroke="#0a0a12" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="4 12 9 18 20 6"></polyline>
        </svg>
      </span>
    </h1>
    <p class="lede">Check the terminal — the webhook has logged the fee-rate update or the escrow order it just created.</p>
    <a class="btn" style="max-width:220px" href="/">Back to PLAYVAULT</a>
    <footer>Powered by Stripe Checkout &middot; test mode</footer>
  `, { center: true });
}

module.exports = { homePage, donePage };
