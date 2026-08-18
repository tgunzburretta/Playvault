// logger.js — structured logging + ops alerting helpers.
// Swap for a real logger/pager (pino, Sentry, PagerDuty, Slack...) before
// production; this keeps every call site in server.js consistent in the
// meantime and gives alerts one place to plug an integration into later.

function logInfo(message, meta = {}) {
  console.log(JSON.stringify({ level: "info", message, ...meta, time: new Date().toISOString() }));
}

function logError(message, err, meta = {}) {
  console.error(JSON.stringify({
    level: "error",
    message,
    error: err?.message || String(err),
    ...meta,
    time: new Date().toISOString(),
  }));
}

function alertOps(message) {
  // TODO: wire up to Slack/PagerDuty. For now a loud console line is the alert.
  console.error(`🚨 OPS ALERT: ${message}`);
}

module.exports = { logInfo, logError, alertOps };
