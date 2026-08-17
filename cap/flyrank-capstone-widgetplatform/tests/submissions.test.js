const { test, before } = require('node:test');
const assert = require('node:assert/strict');

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';

let token, widgetId;

before(async () => {
  // Register a fresh test user
  const reg = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `test-${Date.now()}@example.com`, password: 'password123' }),
  });
  const regData = await reg.json();
  assert.ok(regData.token, `Registration failed: ${JSON.stringify(regData)}`);
  token = regData.token;

  // Create a widget for this user
  const w = await fetch(`${BASE}/widgets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: 'Test Widget',
      type: 'signup',
      fields: [{ name: 'email', label: 'Email', type: 'email', required: true }],
    }),
  });
  const wData = await w.json();
  assert.ok(wData.id, `Widget creation failed: ${JSON.stringify(wData)}`);
  widgetId = wData.id;
});

test('Valid submission is stored and returns 201', async () => {
  const res = await fetch(`${BASE}/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ widgetId, data: { email: 'visitor@example.com' }, honeypot: '' }),
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.ok(body.ok);
  assert.ok(body.id);
});

test('Submission without honeypot field still works (honeypot is optional)', async () => {
  const res = await fetch(`${BASE}/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ widgetId, data: { email: 'visitor2@example.com' } }),
  });
  assert.equal(res.status, 201);
});

test('Malformed payload returns 400 — missing widgetId', async () => {
  const res = await fetch(`${BASE}/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { email: 'x@x.com' } }),
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.ok(body.error);
});

test('Malformed payload returns 400 — data is not an object', async () => {
  const res = await fetch(`${BASE}/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ widgetId, data: 'not-an-object' }),
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.ok(body.error);
});

test('Oversized field value returns 400 (Zod rejects > 1000 chars)', async () => {
  const res = await fetch(`${BASE}/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ widgetId, data: { email: 'x'.repeat(1001) } }),
  });
  assert.ok([400, 413].includes(res.status), `Expected 400/413, got ${res.status}`);
});

test('Too many fields (>20) returns 400', async () => {
  const bigData = {};
  for (let i = 0; i < 21; i++) bigData[`field${i}`] = 'value';
  const res = await fetch(`${BASE}/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ widgetId, data: bigData }),
  });
  assert.equal(res.status, 400);
});

test('Honeypot field filled returns 200 (silent drop)', async () => {
  const res = await fetch(`${BASE}/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ widgetId, data: { email: 'bot@spam.com' }, honeypot: 'i-am-a-bot' }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.ok);
});

test('Non-existent widgetId returns 404', async () => {
  const res = await fetch(`${BASE}/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ widgetId: 'does-not-exist-xyz', data: { email: 'x@x.com' } }),
  });
  assert.equal(res.status, 404);
});

test('Dashboard shows submission after it was stored', async () => {
  // First submit
  const sub = await fetch(`${BASE}/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ widgetId, data: { email: 'dashboard-check@example.com' } }),
  });
  assert.equal(sub.status, 201);
  const { id } = await sub.json();

  // Then check dashboard
  const dash = await fetch(`${BASE}/dashboard/submissions?widgetId=${widgetId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(dash.status, 200);
  const rows = await dash.json();
  const found = rows.find(r => r.id === id);
  assert.ok(found, 'Submission not found in dashboard results');
});
