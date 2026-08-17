async function notify({ submissionId, widgetId, data, geo }) {
  // In a real system, send an email or fire a webhook here.
  // For this capstone: log to console (Mailpit or similar can intercept).
  // This function is called with .catch() — it may throw and that's fine.
  console.log(`[NOTIFY] New submission #${submissionId} for widget ${widgetId}`, {
    data,
    geo,
  });
  // Simulate: if NOTIFY_FAIL env is set, throw to test graceful degradation
  if (process.env.NOTIFY_FAIL === 'true') {
    throw new Error('Simulated notification failure');
  }
}

module.exports = { notify };
