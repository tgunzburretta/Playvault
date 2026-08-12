// Minimal JSON-file user store. Deliberately dependency-free (no native
// module compile step) so this starter installs cleanly anywhere.
//
// Replace with a real database (Postgres, etc.) before taking real signups
// at any scale — this is fine for the first few hundred users, not forever.

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "users.json");

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ users: [] }, null, 2));
}

function readAll() {
  ensureStore();
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function writeAll(data) {
  ensureStore();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function findByEmail(email) {
  const { users } = readAll();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
}

function findById(id) {
  const { users } = readAll();
  return users.find((u) => u.id === id) || null;
}

function findByStripeCustomerId(customerId) {
  const { users } = readAll();
  return users.find((u) => u.stripeCustomerId === customerId) || null;
}

function createUser({ id, email, passwordHash }) {
  const data = readAll();
  const user = {
    id,
    email,
    passwordHash,
    stripeCustomerId: null,
    subscriptionStatus: "none", // none | active | past_due | canceled
    subscriptionTier: null, // core | pro
    createdAt: new Date().toISOString(),
  };
  data.users.push(user);
  writeAll(data);
  return user;
}

function updateUser(id, patch) {
  const data = readAll();
  const idx = data.users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  data.users[idx] = { ...data.users[idx], ...patch };
  writeAll(data);
  return data.users[idx];
}

module.exports = {
  findByEmail,
  findById,
  findByStripeCustomerId,
  createUser,
  updateUser,
};
