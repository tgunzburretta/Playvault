const { PROMPTS } = require("../content/prompts");

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,500&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">`;

const STYLES = `<style>
  :root {
    --ink: #16121f;
    --paper: #faf8fc;
    --surface: #ffffff;
    --surface-2: #f1ecf8;
    --line: #e3deee;
    --sub: #6c6480;
    --accent: #f0562e;
    --accent-ink: #ffffff;
    --accent-soft: #fde9e2;
    --good: #1c8a5b;
    --good-soft: #e4f5ec;
    --warn: #b4690a;
    --warn-soft: #fbeedd;
    --danger: #c22e1f;
    --danger-soft: #fbe6e2;
    --shadow: 0 1px 2px rgba(22,18,31,0.04), 0 10px 30px -14px rgba(22,18,31,0.16);
    --display: "Fraunces", Georgia, "Iowan Old Style", serif;
    --body: "IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    --mono: "IBM Plex Mono", ui-monospace, "SF Mono", Menlo, monospace;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --ink: #f3effa;
      --paper: #14111d;
      --surface: #1c1828;
      --surface-2: #241f33;
      --line: #33304a;
      --sub: #b0a8c6;
      --accent: #ff7a52;
      --accent-ink: #1b0d06;
      --accent-soft: #3a2015;
      --good: #4fd398;
      --good-soft: #123425;
      --warn: #ffc069;
      --warn-soft: #3a2607;
      --danger: #ff6b57;
      --danger-soft: #3a1712;
      --shadow: 0 1px 2px rgba(0,0,0,0.35), 0 10px 30px -14px rgba(0,0,0,0.55);
    }
  }
  :root[data-theme="dark"] {
    --ink: #f3effa;
    --paper: #14111d;
    --surface: #1c1828;
    --surface-2: #241f33;
    --line: #33304a;
    --sub: #b0a8c6;
    --accent: #ff7a52;
    --accent-ink: #1b0d06;
    --accent-soft: #3a2015;
    --good: #4fd398;
    --good-soft: #123425;
    --warn: #ffc069;
    --warn-soft: #3a2607;
    --danger: #ff6b57;
    --danger-soft: #3a1712;
    --shadow: 0 1px 2px rgba(0,0,0,0.35), 0 10px 30px -14px rgba(0,0,0,0.55);
  }

  * { box-sizing: border-box; }
  html { background: var(--paper); }
  body {
    margin: 0;
    background: var(--paper);
    color: var(--ink);
    font-family: var(--body);
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }
  ::selection { background: var(--accent-soft); color: var(--ink); }
  a { color: inherit; }
  :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 4px; }
  @media (prefers-reduced-motion: reduce) {
    * { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }
  }

  header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 20px clamp(20px, 4vw, 48px);
    border-bottom: 1px solid var(--line);
    background: var(--surface);
    position: sticky; top: 0; z-index: 10;
  }
  .logo { display: inline-flex; align-items: center; gap: 9px; text-decoration: none; color: var(--ink); }
  .logo-mark {
    font-family: var(--mono); font-weight: 600; font-size: 12.5px; letter-spacing: 0.02em;
    background: var(--accent); color: var(--accent-ink);
    padding: 4px 7px; border-radius: 6px;
  }
  .logo-word { font-family: var(--display); font-style: italic; font-weight: 500; font-size: 19px; }
  nav { display: flex; align-items: center; gap: 22px; }
  nav a { text-decoration: none; color: var(--sub); font-size: 14.5px; font-weight: 500; }
  nav a:hover { color: var(--ink); }
  nav form { margin: 0; }
  .btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    font-family: var(--body); font-weight: 600; font-size: 14.5px;
    background: var(--accent); color: var(--accent-ink);
    padding: 11px 20px; border-radius: 9px; text-decoration: none; border: none; cursor: pointer;
    transition: transform 0.12s ease, box-shadow 0.12s ease;
  }
  .btn:hover { transform: translateY(-1px); box-shadow: 0 6px 18px -8px color-mix(in srgb, var(--accent) 60%, transparent); }
  .btn.secondary { background: transparent; color: var(--ink); border: 1.5px solid var(--line); }
  .btn.secondary:hover { border-color: var(--accent); color: var(--accent); }
  .btn.small { padding: 7px 14px; font-size: 13.5px; }
  .btn.full { width: 100%; }

  main.page { max-width: 980px; margin: 0 auto; padding: 0 clamp(20px, 4vw, 48px) 96px; }

  .eyebrow {
    font-family: var(--mono); font-size: 12.5px; letter-spacing: 0.08em; text-transform: uppercase;
    color: var(--accent); margin: 0 0 16px; display: flex; align-items: center; gap: 8px;
  }
  .eyebrow::before { content: ""; width: 16px; height: 1.5px; background: var(--accent); }

  h1 {
    font-family: var(--display); font-weight: 500; font-size: clamp(34px, 5.2vw, 54px);
    line-height: 1.05; margin: 0 0 18px; text-wrap: balance; letter-spacing: -0.01em;
  }
  h1 em { font-style: italic; color: var(--accent); }
  .dek { color: var(--sub); font-size: 18px; max-width: 46ch; margin: 0 0 32px; line-height: 1.55; }

  h2 {
    font-family: var(--display); font-weight: 500; font-size: 27px; margin: 0 0 8px; letter-spacing: -0.005em;
  }
  h3 { font-family: var(--body); font-weight: 600; font-size: 16px; margin: 0; }
  .section-note { color: var(--sub); font-size: 14.5px; margin: 0 0 24px; max-width: 60ch; }
  section { margin-top: 68px; }
  section:first-of-type { margin-top: 56px; }

  .hero { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 48px; align-items: start; padding-top: 12px; }
  @media (max-width: 780px) { .hero { grid-template-columns: 1fr; gap: 32px; } }
  .hero-copy .cta-row { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
  .hero-copy .cta-note { font-size: 13.5px; color: var(--sub); margin-top: 12px; }

  .demo-card {
    background: var(--surface); border: 1px solid var(--line); border-radius: 16px;
    box-shadow: var(--shadow); overflow: hidden;
  }
  .demo-card .demo-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 18px; border-bottom: 1px solid var(--line); background: var(--surface-2);
  }
  .demo-card .demo-head .tag { margin: 0; }
  .demo-card .demo-head .dots { display: flex; gap: 6px; }
  .demo-card .demo-head .dots span { width: 8px; height: 8px; border-radius: 50%; background: var(--line); }
  .demo-card .demo-body { padding: 20px; }
  .demo-card .demo-body h4 { font-size: 15.5px; margin: 0 0 10px; }

  .tag {
    display: inline-block; font-family: var(--mono); font-size: 11px; letter-spacing: 0.02em;
    color: var(--accent); background: var(--accent-soft); padding: 3px 9px; border-radius: 999px;
    margin-bottom: 10px; font-weight: 600;
  }
  .tag.neutral { color: var(--sub); background: var(--surface-2); }
  .tag.good { color: var(--good); background: var(--good-soft); }
  .tag.warn { color: var(--warn); background: var(--warn-soft); }

  .prompt-text {
    background: var(--surface-2); border: 1px solid var(--line); border-radius: 9px;
    padding: 14px 16px; font-family: var(--mono); font-size: 13px; line-height: 1.6;
    white-space: pre-wrap; margin: 12px 0; overflow-x: auto;
  }
  .prompt-note { font-size: 13.5px; margin: 10px 0 0; }
  .prompt-note strong { color: var(--ink); }

  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media (max-width: 640px) { .grid-2 { grid-template-columns: 1fr; } }

  .card {
    background: var(--surface); border: 1px solid var(--line); border-radius: 14px;
    padding: 24px; box-shadow: var(--shadow); position: relative;
  }

  .pricing-card .price {
    font-family: var(--mono); font-variant-numeric: tabular-nums; font-weight: 600;
    font-size: 32px; margin: 10px 0 4px; display: flex; align-items: baseline; gap: 4px;
  }
  .pricing-card .price .per { font-size: 14px; color: var(--sub); font-weight: 400; font-family: var(--body); }
  .pricing-card.featured { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent), var(--shadow); }
  .pricing-card ul { list-style: none; margin: 16px 0 20px; padding: 0; display: flex; flex-direction: column; gap: 8px; }
  .pricing-card ul li { font-size: 14px; color: var(--sub); display: flex; gap: 8px; align-items: flex-start; }
  .pricing-card ul li::before { content: "\\2713"; color: var(--good); font-weight: 700; flex: none; }

  .library-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media (max-width: 720px) { .library-grid { grid-template-columns: 1fr; } }

  .prompt-card { display: flex; flex-direction: column; }
  .prompt-card.locked { padding: 0; overflow: hidden; }
  .locked-inner { padding: 24px; filter: blur(3px); opacity: 0.5; user-select: none; pointer-events: none; }
  .locked-overlay {
    position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 10px; text-align: center; padding: 20px;
    background: color-mix(in srgb, var(--surface) 55%, transparent);
    backdrop-filter: blur(0.5px);
  }
  .locked-overlay .lock-icon {
    width: 34px; height: 34px; border-radius: 10px; background: var(--surface-2); border: 1px solid var(--line);
    display: flex; align-items: center; justify-content: center; font-size: 15px;
  }
  .locked-overlay p { margin: 0; font-size: 13px; color: var(--sub); max-width: 22ch; }

  .flash {
    background: var(--good-soft); border: 1px solid color-mix(in srgb, var(--good) 35%, transparent);
    color: var(--good); padding: 12px 16px; border-radius: 10px; margin-bottom: 24px; font-size: 14px; font-weight: 500;
  }
  .flash.warn { background: var(--warn-soft); color: var(--warn); border-color: color-mix(in srgb, var(--warn) 35%, transparent); }

  .status-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 28px; }
  .pill {
    display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600;
    padding: 6px 12px; border-radius: 999px; font-family: var(--mono);
  }
  .pill.active { background: var(--good-soft); color: var(--good); }
  .pill.free { background: var(--surface-2); color: var(--sub); }
  .pill.past_due { background: var(--warn-soft); color: var(--warn); }
  .pill .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

  form.stack { max-width: 380px; }
  form.stack label { display: block; font-size: 13.5px; font-weight: 500; margin-bottom: 6px; color: var(--sub); }
  form.stack input {
    display: block; width: 100%; padding: 12px 14px; border: 1.5px solid var(--line); border-radius: 9px;
    margin-bottom: 16px; font-size: 15px; font-family: var(--body); background: var(--surface); color: var(--ink);
  }
  form.stack input:focus { border-color: var(--accent); outline: none; }
  .auth-card { max-width: 400px; margin: 40px auto 0; padding: 32px; }
  .auth-switch { margin-top: 18px; font-size: 14px; color: var(--sub); text-align: center; }
  .auth-switch a { color: var(--accent); font-weight: 600; text-decoration: none; }

  code.inline {
    font-family: var(--mono); background: var(--surface-2); padding: 1px 6px; border-radius: 5px; font-size: 0.9em;
  }

  footer {
    margin-top: 80px; padding: 28px clamp(20px, 4vw, 48px); border-top: 1px solid var(--line);
    color: var(--sub); font-size: 13px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px;
  }
</style>`;

function shell({ title, body, user }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} · PMBrief</title>
${FONTS}
${STYLES}
</head>
<body>
<header>
  <a class="logo" href="/"><span class="logo-mark">PM</span><span class="logo-word">Brief</span></a>
  <nav>
    ${
      user
        ? `<a href="/dashboard">Library</a><form method="post" action="/logout"><button class="btn secondary small" type="submit">Log out</button></form>`
        : `<a href="/login">Log in</a><a class="btn small" href="/signup">Get the library</a>`
    }
  </nav>
</header>
<main class="page">${body}</main>
<footer>
  <span>PMBrief — AI prompts for product managers, with the reasoning attached.</span>
  <span>&copy; ${new Date().getFullYear()} PMBrief</span>
</footer>
</body>
</html>`;
}

function tierLabel(tier) {
  return tier === "pro" ? "Pro" : "Core";
}

function promptCard(p, locked) {
  if (locked) {
    return `<div class="card prompt-card locked">
      <div class="locked-inner">
        <div class="tag neutral">${escapeHtml(p.category)}</div>
        <h3>${escapeHtml(p.title)}</h3>
        <div class="prompt-text">${escapeHtml(p.prompt)}</div>
      </div>
      <div class="locked-overlay">
        <div class="lock-icon">&#128274;</div>
        <p><strong style="color:var(--ink);">${escapeHtml(p.title)}</strong><br>Subscribe to unlock</p>
        <a class="btn small" href="/subscribe/core">Unlock this prompt</a>
      </div>
    </div>`;
  }
  return `<div class="card prompt-card">
    <div class="tag">${escapeHtml(p.category)}</div>
    <h3>${escapeHtml(p.title)}</h3>
    <div class="prompt-text">${escapeHtml(p.prompt)}</div>
    <p class="prompt-note"><strong>Why it works:</strong> ${escapeHtml(p.whyItWorks)}</p>
    <p class="prompt-note"><strong>Usage tip:</strong> ${escapeHtml(p.usageTip)}</p>
  </div>`;
}

function isFreePreview(p) {
  return PROMPTS.indexOf(p) < 2;
}

function landingPage({ user, flash }) {
  const demo = PROMPTS[0];
  const previewPrompts = PROMPTS.slice(0, 2);
  const body = `
    ${flash ? `<div class="flash">${escapeHtml(flash)}</div>` : ""}
    <section class="hero">
      <div class="hero-copy">
        <div class="eyebrow">15 flagship prompts · one new one added monthly</div>
        <h1>Product prompts that don't read like a <em>listicle</em>.</h1>
        <p class="dek">Every prompt in PMBrief ships with the reasoning behind it and a real usage tip — not just text to copy-paste and hope. Fill the brackets, run it in your next research session, roadmap review, or PRD.</p>
        <div class="cta-row">
          <a class="btn" href="/signup">Get the library — $19/mo</a>
          <a class="btn secondary" href="#pricing">See pricing</a>
        </div>
        <p class="cta-note">2 full prompts free below, no signup needed to read them.</p>
      </div>
      <div class="demo-card">
        <div class="demo-head">
          <div class="dots"><span></span><span></span><span></span></div>
          <span class="tag neutral" style="margin:0;">${escapeHtml(demo.category)}</span>
        </div>
        <div class="demo-body">
          <h4>${escapeHtml(demo.title)}</h4>
          <div class="prompt-text">${escapeHtml(demo.prompt)}</div>
          <p class="prompt-note"><strong>Why it works:</strong> ${escapeHtml(demo.whyItWorks)}</p>
        </div>
      </div>
    </section>

    <section>
      <h2>Free preview</h2>
      <p class="section-note">Two of the fifteen, in full — read them, use them, no account required.</p>
      <div class="grid-2">${previewPrompts.map((p) => promptCard(p, false)).join("")}</div>
    </section>

    <section id="pricing">
      <h2>Pricing</h2>
      <p class="section-note">Priced like a tool your employer would expense without blinking, not a $5 side-hustle download.</p>
      <div class="grid-2">
        <div class="card pricing-card">
          <div class="tag neutral">Core</div>
          <div class="price">$19<span class="per">/mo</span></div>
          <p class="section-note" style="margin-bottom:0;">Everything you need to start.</p>
          <ul>
            <li>All 15 flagship prompts + usage notes</li>
            <li>New prompt added monthly</li>
            <li>No account limits, cancel anytime</li>
          </ul>
          <a class="btn secondary full" href="/signup">Start Core</a>
        </div>
        <div class="card pricing-card featured">
          <div class="tag">Pro</div>
          <div class="price">$49<span class="per">/mo</span></div>
          <p class="section-note" style="margin-bottom:0;">For teams who lean on this weekly.</p>
          <ul>
            <li>Everything in Core</li>
            <li>Early access to new prompts</li>
            <li>Monthly live prompt-writing session</li>
          </ul>
          <a class="btn full" href="/signup">Start Pro</a>
        </div>
      </div>
    </section>
  `;
  return shell({ title: "AI prompts for product managers", body, user });
}

function authPage({ mode, csrf, error }) {
  const isSignup = mode === "signup";
  const body = `
    <div class="card auth-card">
      <h2 style="margin-bottom:6px;">${isSignup ? "Create your account" : "Welcome back"}</h2>
      <p class="section-note" style="margin-bottom:20px;">${isSignup ? "Two minutes to your first prompt." : "Log in to your library."}</p>
      ${error ? `<div class="flash warn">${escapeHtml(error)}</div>` : ""}
      <form class="stack" method="post" action="/${isSignup ? "signup" : "login"}">
        <input type="hidden" name="_csrf" value="${escapeHtml(csrf)}">
        <label for="email">Email</label>
        <input id="email" type="email" name="email" placeholder="you@company.com" required>
        <label for="password">Password</label>
        <input id="password" type="password" name="password" placeholder="10+ characters" minlength="10" maxlength="72" required>
        <button class="btn full" type="submit">${isSignup ? "Sign up" : "Log in"}</button>
      </form>
      <p class="auth-switch">
        ${isSignup ? `Already have an account? <a href="/login">Log in</a>` : `New here? <a href="/signup">Sign up</a>`}
      </p>
    </div>
  `;
  return shell({ title: isSignup ? "Sign up" : "Log in", body });
}

function dashboardPage({ user, csrf }) {
  const isActive = user.subscriptionStatus === "active";
  const isPastDue = user.subscriptionStatus === "past_due";
  const pillClass = isActive ? "active" : isPastDue ? "past_due" : "free";
  const pillText = isActive ? `${tierLabel(user.subscriptionTier)} — active` : isPastDue ? "Payment failed" : "Free preview";
  const body = `
    <section style="margin-top:0;">
      <h2>Your library</h2>
      <div class="status-row">
        <span class="pill ${pillClass}"><span class="dot"></span>${escapeHtml(pillText)}</span>
        ${
          isActive
            ? `<form method="post" action="/billing-portal"><input type="hidden" name="_csrf" value="${escapeHtml(csrf)}"><button class="btn secondary small" type="submit">Manage billing</button></form>`
            : `<a class="btn small" href="/subscribe/core">Subscribe — Core $19/mo</a><a class="btn secondary small" href="/subscribe/pro">Pro $49/mo</a>`
        }
      </div>
      ${isPastDue ? `<div class="flash warn">Your last payment failed. <a href="/billing-portal" style="color:inherit; text-decoration:underline;">Update your card</a> to keep access.</div>` : ""}
      <div class="library-grid">
        ${PROMPTS.map((p) => promptCard(p, !isActive && !isFreePreview(p))).join("")}
      </div>
    </section>
  `;
  return shell({ title: "Your library", body, user });
}

module.exports = { landingPage, authPage, dashboardPage, escapeHtml };
