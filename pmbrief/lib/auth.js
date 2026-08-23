const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const SALT_ROUNDS = 12;

function hashPassword(password) {
  return bcrypt.hashSync(password, SALT_ROUNDS);
}

function verifyPassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password) {
  // Upper bound matters, not just style: bcrypt silently truncates at 72
  // bytes, so an unbounded password would let two different long passwords
  // (identical only in their first 72 bytes) both authenticate as the same
  // account without either user knowing.
  return typeof password === "string" && password.length >= 10 && password.length <= 72;
}

function newId() {
  return crypto.randomBytes(16).toString("hex");
}

// Session guard for routes that require a logged-in user.
function requireLogin(req, res, next) {
  if (!req.session.userId) return res.redirect("/login");
  next();
}

// Minimal double-submit CSRF: a token lives in the session and must be echoed
// back by every state-changing form. No external dependency required.
function csrfToken(req) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(24).toString("hex");
  }
  return req.session.csrfToken;
}

function requireCsrf(req, res, next) {
  const sent = req.body && req.body._csrf;
  if (!sent || sent !== req.session.csrfToken) {
    return res.status(403).send("Form expired or invalid. Go back and try again.");
  }
  next();
}

module.exports = {
  hashPassword,
  verifyPassword,
  isValidEmail,
  isValidPassword,
  newId,
  requireLogin,
  csrfToken,
  requireCsrf,
};
