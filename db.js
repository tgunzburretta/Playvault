// db.js — in-memory store for the PLAYVAULT demo server.
// TODO: replace with a real database (Postgres, etc.) before going to production.
// State is lost on restart, which is fine for local testing against
// `stripe listen` but not for anything else.

const sellers = new Map(); // customerId -> { feeRate, connectAccountId }
const connectAccounts = new Map(); // connectAccountId -> { onboarded }
const orders = new Map(); // orderId -> order
const processedEvents = new Map(); // eventId -> event type

function getSellerFeeRate(customerId) {
  return sellers.get(customerId)?.feeRate;
}

function setSellerFeeRate(customerId, feeRate) {
  const seller = sellers.get(customerId) || {};
  seller.feeRate = feeRate;
  sellers.set(customerId, seller);
}

function setSellerConnectAccount(customerId, connectAccountId) {
  const seller = sellers.get(customerId) || {};
  seller.connectAccountId = connectAccountId;
  sellers.set(customerId, seller);
}

function getSellerConnectAccount(customerId) {
  return sellers.get(customerId)?.connectAccountId;
}

function setSellerOnboarded(connectAccountId, onboarded) {
  connectAccounts.set(connectAccountId, { onboarded });
}

function isSellerOnboarded(connectAccountId) {
  return !!connectAccounts.get(connectAccountId)?.onboarded;
}

function createOrder(order) {
  orders.set(order.id, { ...order, status: "escrow" });
}

function getOrder(id) {
  return orders.get(id);
}

function markOrderRefunded(id) {
  const order = orders.get(id);
  if (order) order.status = "refunded";
}

function hasProcessedEvent(eventId) {
  return processedEvents.has(eventId);
}

function markEventProcessed(eventId, type) {
  processedEvents.set(eventId, type);
}

module.exports = {
  getSellerFeeRate,
  setSellerFeeRate,
  setSellerConnectAccount,
  getSellerConnectAccount,
  setSellerOnboarded,
  isSellerOnboarded,
  createOrder,
  getOrder,
  markOrderRefunded,
  hasProcessedEvent,
  markEventProcessed,
};
