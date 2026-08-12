const { PROMPTS } = require("../content/prompts");

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function layout({ title, body, user }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} · PMBrief</title>
<style>
  :root { --ink:#1a1a2e; --sub:#5b5b76; --line:#e6e6ef; --brand:#3d5afe; --bg:#fafafe; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; color:var(--ink); background:var(--bg); line-height:1.5; }
  header { display:flex; justify-content:space-between; align-items:center; padding:20px 32px; border-bottom:1px solid var(--line); background:#fff; }
  header a.logo { font-weight:700; font-size:18px; color:var(--ink); text-decoration:none; }
  nav a { color:var(--sub); text-decoration:none; margin-left:20px; font-size:14px; }
  main { max-width:880px; margin:0 auto; padding:48px 24px; }
  h1 { font-size:32px; margin:0 0 12px; }
  h2 { font-size:22px; margin:36px 0 8px; }
  p.lead { color:var(--sub); font-size:17px; max-width:640px; }
  .btn { display:inline-block; background:var(--brand); color:#fff; padding:12px 22px; border-radius:8px; text-decoration:none; font-weight:600; border:none; cursor:pointer; font-size:15px; }
  .btn.secondary { background:#fff; color:var(--brand); border:1px solid var(--brand); }
  .card { background:#fff; border:1px solid var(--line); border-radius:12px; padding:24px; margin-bottom:16px; }
  .tier { display:flex; gap:16px; flex-wrap:wrap; margin:24px 0; }
  .tier .card { flex:1; min-width:240px; }
  .price { font-size:28px; font-weight:700; margin:8px 0; }
  .price span { font-size:14px; color:var(--sub); font-weight:400; }
  .tag { display:inline-block; font-size:12px; color:var(--brand); background:#eef0ff; padding:2px 8px; border-radius:999px; margin-bottom:8px; }
  .prompt-text { background:#f4f4fb; border-radius:8px; padding:14px; font-family: ui-monospace, Menlo, monospace; font-size:13.5px; white-space:pre-wrap; margin:10px 0; }
  form.stack input { display:block; width:100%; padding:10px 12px; border:1px solid var(--line); border-radius:8px; margin-bottom:12px; font-size:15px; }
  .locked { opacity:0.55; filter: blur(2px); pointer-events:none; user-select:none; }
  .flash { background:#fff4e5; border:1px solid #ffd699; padding:10px 14px; border-radius:8px; margin-bottom:20px; font-size:14px; }
  footer { text-align:center; color:var(--sub); font-size:13px; padding:32px; }
</style>
</head>
<body>
<header>
  <a class="logo" href="/">PMBrief</a>
  <nav>
    ${user ? `<a href="/dashboard">Library</a><form style="display:inline" method="post" action="/logout"><button class="btn secondary" style="margin-left:20px; padding:6px 14px;">Log out</button></form>` : `<a href="/login">Log in</a><a href="/signup">Sign up</a>`}
  </nav>
</header>
<main>${body}</main>
<footer>PMBrief · AI prompts for product managers · <a href="/">pmbrief</a></footer>
</body>
</html>`;
}

function landingPage({ user, flash }) {
  const previewPrompts = PROMPTS.slice(0, 2);
  const body = `
    ${flash ? `<div class="flash">${escapeHtml(flash)}</div>` : ""}
    <span class="tag">15 flagship prompts, one new one added monthly</span>
    <h1>Product-management prompts that don't sound like they came from a listicle.</h1>
    <p class="lead">Each prompt in PMBrief ships with the reasoning behind it and a usage tip from real PM work — not just the raw prompt text. Copy it, fill the brackets, use it in your next research session, roadmap review, or PRD.</p>
    <a class="btn" href="/signup">Get the library</a>

    <h2>Free preview</h2>
    ${previewPrompts.map(promptCard).join("")}

    <h2>Pricing</h2>
    <div class="tier">
      <div class="card">
        <div class="tag">Core</div>
        <div class="price">$19<span>/mo</span></div>
        <p>All 15 flagship prompts, full usage notes, new prompt added monthly.</p>
        <a class="btn secondary" href="/signup">Start Core</a>
      </div>
      <div class="card">
        <div class="tag">Pro</div>
        <div class="price">$49<span>/mo</span></div>
        <p>Everything in Core, plus early access to new prompts and a monthly live prompt-writing session.</p>
        <a class="btn secondary" href="/signup">Start Pro</a>
      </div>
    </div>
  `;
  return layout({ title: "AI prompts for product managers", body, user });
}

function promptCard(p, locked) {
  return `<div class="card ${locked ? "locked" : ""}">
    <div class="tag">${escapeHtml(p.category)}</div>
    <h3 style="margin:6px 0;">${escapeHtml(p.title)}</h3>
    <div class="prompt-text">${escapeHtml(p.prompt)}</div>
    <p><strong>Why it works:</strong> ${escapeHtml(p.whyItWorks)}</p>
    <p><strong>Usage tip:</strong> ${escapeHtml(p.usageTip)}</p>
  </div>`;
}

function authPage({ mode, csrf, error }) {
  const isSignup = mode === "signup";
  const body = `
    <h1>${isSignup ? "Create your account" : "Log in"}</h1>
    ${error ? `<div class="flash">${escapeHtml(error)}</div>` : ""}
    <form class="stack" method="post" action="/${isSignup ? "signup" : "login"}" style="max-width:360px;">
      <input type="hidden" name="_csrf" value="${escapeHtml(csrf)}">
      <input type="email" name="email" placeholder="Email" required>
      <input type="password" name="password" placeholder="Password (10+ characters)" minlength="10" required>
      <button class="btn" type="submit" style="width:100%;">${isSignup ? "Sign up" : "Log in"}</button>
    </form>
    <p style="margin-top:16px; font-size:14px; color:#5b5b76;">
      ${isSignup ? `Already have an account? <a href="/login">Log in</a>` : `New here? <a href="/signup">Sign up</a>`}
    </p>
  `;
  return layout({ title: isSignup ? "Sign up" : "Log in", body });
}

function dashboardPage({ user, csrf }) {
  const isActive = user.subscriptionStatus === "active";
  const body = `
    <h1>Your prompt library</h1>
    <p class="lead">${isActive ? `Plan: ${escapeHtml(user.subscriptionTier || "core")}. Manage billing any time.` : "You're on the free preview. Subscribe to unlock all 15 prompts."}</p>
    ${
      isActive
        ? `<form method="post" action="/billing-portal"><input type="hidden" name="_csrf" value="${escapeHtml(csrf)}"><button class="btn secondary" type="submit">Manage billing</button></form>`
        : `<a class="btn" href="/subscribe/core">Subscribe — Core $19/mo</a> <a class="btn secondary" href="/subscribe/pro">Subscribe — Pro $49/mo</a>`
    }
    <h2>Library</h2>
    ${PROMPTS.map((p) => promptCard(p, !isActive && !isFreePreview(p))).join("")}
  `;
  return layout({ title: "Your library", body, user });
}

function isFreePreview(p) {
  return PROMPTS.indexOf(p) < 2;
}

module.exports = { layout, landingPage, authPage, dashboardPage, escapeHtml };
