const { test } = require('node:test');
const assert = require('node:assert/strict');

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';

test('OPTIONS preflight returns correct CORS headers', async () => {
  const res = await fetch(`${BASE}/submissions`, {
    method: 'OPTIONS',
    headers: {
      'Origin': 'http://localhost:5500',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type',
    },
  });
  assert.ok(res.headers.get('access-control-allow-origin'), 'Missing CORS allow-origin header');
  assert.ok([200, 204].includes(res.status), `Expected 200/204, got ${res.status}`);
});

test('Cross-origin POST to /submissions is accepted (not blocked by CORS)', async () => {
  // Node fetch doesn't enforce CORS — we just verify the response header is present
  const res = await fetch(`${BASE}/submissions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'http://localhost:5500',
    },
    body: JSON.stringify({ widgetId: 'nonexistent-id', data: { name: 'Test' } }),
  });
  // 404 is fine (widget not found) — what matters is the CORS header is present
  assert.notEqual(res.status, 0, 'Should not be a network error');
  assert.ok(
    res.headers.get('access-control-allow-origin'),
    'Missing access-control-allow-origin on cross-origin POST response'
  );
});

test('GET /widgets/:id/config returns CORS header', async () => {
  const res = await fetch(`${BASE}/widgets/nonexistent/config`, {
    headers: { 'Origin': 'http://other-site.example.com' },
  });
  // 404 is fine — we just check the header
  assert.ok(
    res.headers.get('access-control-allow-origin'),
    'Missing CORS header on /widgets/:id/config'
  );
});

test('GET /widget.js returns CORS header and correct content-type', async () => {
  const res = await fetch(`${BASE}/widget.js`, {
    headers: { 'Origin': 'http://other-site.example.com' },
  });
  assert.ok(
    res.headers.get('access-control-allow-origin'),
    'Missing CORS header on /widget.js'
  );
  assert.ok(
    res.headers.get('content-type')?.includes('javascript'),
    `Expected javascript content-type, got: ${res.headers.get('content-type')}`
  );
});
