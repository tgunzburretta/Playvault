// alert.js — structured logging plus a single choke point for paging ops.
// Swap alertOps()'s body for a real integration (Slack webhook, PagerDuty,
// email) when you have one. Until then it escalates to stderr with a marker
// that log-based monitors (Datadog, CloudWatch Alarms, etc.) can match on.

function logInfo(msg, meta = {}) {
  console.log(JSON.stringify({ level: "info", msg, ...meta, time: new Date().toISOString() }));
}

function logError(msg, err, meta = {}) {
  console.error(
    JSON.stringify({
      level: "error",
      msg,
      err: err && (err.message || String(err)),
      ...meta,
      time: new Date().toISOString(),
    })
  );
  alertOps(msg, err);
}

function alertOps(msg, err) {
  // TODO: wire this to Slack/PagerDuty/email for production.
  console.error(`🚨 ALERT: ${msg}${err ? " — " + (err.message || err) : ""}`);
}

module.exports = { logInfo, logError, alertOps };
