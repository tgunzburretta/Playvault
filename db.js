// db.js — persistence for PLAYVAULT: seller fee rates, Connect accounts,
// escrowed orders, and webhook idempotency. Backed by SQLite (better-sqlite3)
// so the starter has a real, file-based DB with zero external services to
// stand up. Swap this module out for Postgres/etc. later — callers only
// depend on the exported functions below, not on SQLite itself.

const path = require("path");
const Database = require("better-sqlite3");

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, "playvault.db");
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS sellers (
    customer_id TEXT PRIMARY KEY,
    fee_rate REAL NOT NULL DEFAULT 0.10,
    connect_account_id TEXT,
    connect_onboarded INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS webhook_events (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    received_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    seller_customer_id TEXT NOT NULL,
    connect_account_id TEXT NOT NULL,
    payment_intent_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    fee_amount INTEGER NOT NULL,
    currency TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'held',
    created_at TEXT NOT NULL,
    released_at TEXT,
    transfer_id TEXT
  );
`);

// ── Sellers / fee rates ──────────────────────────────────────────────────────

function getSeller(customerId) {
  return db.prepare("SELECT * FROM sellers WHERE customer_id = ?").get(customerId);
}

function setSellerFeeRate(customerId, feeRate) {
  db.prepare(
    `INSERT INTO sellers (customer_id, fee_rate, updated_at)
     VALUES (@customer_id, @fee_rate, @updated_at)
     ON CONFLICT(customer_id) DO UPDATE SET fee_rate = @fee_rate, updated_at = @updated_at`
  ).run({ customer_id: customerId, fee_rate: feeRate, updated_at: new Date().toISOString() });
}

function setSellerConnectAccount(customerId, connectAccountId) {
  db.prepare(
    `INSERT INTO sellers (customer_id, connect_account_id, updated_at)
     VALUES (@customer_id, @connect_account_id, @updated_at)
     ON CONFLICT(customer_id) DO UPDATE SET connect_account_id = @connect_account_id, updated_at = @updated_at`
  ).run({ customer_id: customerId, connect_account_id: connectAccountId, updated_at: new Date().toISOString() });
}

function setSellerOnboarded(connectAccountId, onboarded) {
  db.prepare(
    `UPDATE sellers SET connect_onboarded = ?, updated_at = ? WHERE connect_account_id = ?`
  ).run(onboarded ? 1 : 0, new Date().toISOString(), connectAccountId);
}

function getSellerByConnectAccount(connectAccountId) {
  return db.prepare("SELECT * FROM sellers WHERE connect_account_id = ?").get(connectAccountId);
}

// ── Webhook idempotency ──────────────────────────────────────────────────────
// Stripe can and will deliver the same event more than once (retries,
// duplicate endpoints, etc). Recording the event id lets us treat re-delivery
// as a no-op instead of double-applying a fee change or a transfer.

function hasProcessedEvent(eventId) {
  return !!db.prepare("SELECT 1 FROM webhook_events WHERE id = ?").get(eventId);
}

function markEventProcessed(eventId, type) {
  db.prepare(
    "INSERT OR IGNORE INTO webhook_events (id, type, received_at) VALUES (?, ?, ?)"
  ).run(eventId, type, new Date().toISOString());
}

// ── Escrow orders ────────────────────────────────────────────────────────────

function createOrder(order) {
  db.prepare(
    `INSERT INTO orders
       (id, seller_customer_id, connect_account_id, payment_intent_id, amount, fee_amount, currency, status, created_at)
     VALUES (@id, @seller_customer_id, @connect_account_id, @payment_intent_id, @amount, @fee_amount, @currency, 'held', @created_at)`
  ).run({ ...order, created_at: new Date().toISOString() });
}

function getOrder(orderId) {
  return db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId);
}

function markOrderReleased(orderId, transferId) {
  db.prepare(
    "UPDATE orders SET status = 'released', transfer_id = ?, released_at = ? WHERE id = ?"
  ).run(transferId, new Date().toISOString(), orderId);
}

function markOrderRefunded(orderId) {
  db.prepare(
    "UPDATE orders SET status = 'refunded', released_at = ? WHERE id = ?"
  ).run(new Date().toISOString(), orderId);
}

module.exports = {
  getSeller,
  setSellerFeeRate,
  setSellerConnectAccount,
  setSellerOnboarded,
  getSellerByConnectAccount,
  hasProcessedEvent,
  markEventProcessed,
  createOrder,
  getOrder,
  markOrderReleased,
  markOrderRefunded,
};
