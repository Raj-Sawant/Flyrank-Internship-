const { test } = require('node:test');
const assert = require('node:assert/strict');

// We test the geo service directly with mocked fetch
// Each test clears the require cache to get a fresh module instance

test('getGeo returns country and city on provider A success', async (t) => {
  t.mock.method(global, 'fetch', async (url) => {
    if (String(url).includes('ip-api.com')) {
      return {
        ok: true,
        json: async () => ({ status: 'success', country: 'United States', city: 'New York' }),
      };
    }
    throw new Error('Should not call provider B');
  });

  delete require.cache[require.resolve('../src/services/geo')];
  const { getGeo } = require('../src/services/geo');
  const result = await getGeo('8.8.8.8');
  assert.equal(result.country, 'United States');
  assert.equal(result.city, 'New York');
});

test('getGeo falls back to provider B when provider A fails', async (t) => {
  t.mock.method(global, 'fetch', async (url) => {
    if (String(url).includes('ip-api.com')) {
      throw new Error('Provider A down');
    }
    if (String(url).includes('ipapi.co')) {
      return {
        ok: true,
        json: async () => ({ country_name: 'Germany', city: 'Berlin' }),
      };
    }
    throw new Error('Unknown URL');
  });

  delete require.cache[require.resolve('../src/services/geo')];
  const { getGeo } = require('../src/services/geo');
  const result = await getGeo('8.8.8.8');
  assert.equal(result.country, 'Germany');
  assert.equal(result.city, 'Berlin');
});

test('getGeo returns empty object when all providers fail', async (t) => {
  t.mock.method(global, 'fetch', async () => {
    throw new Error('All providers down');
  });

  delete require.cache[require.resolve('../src/services/geo')];
  const { getGeo } = require('../src/services/geo');
  const result = await getGeo('8.8.8.8');
  assert.deepEqual(result, {});
});

test('getGeo returns Local for loopback IP without calling providers', async (t) => {
  let fetchCalled = false;
  t.mock.method(global, 'fetch', async () => {
    fetchCalled = true;
    throw new Error('Should not call fetch for local IP');
  });

  delete require.cache[require.resolve('../src/services/geo')];
  const { getGeo } = require('../src/services/geo');
  const result = await getGeo('127.0.0.1');
  assert.equal(result.country, 'Local');
  assert.equal(fetchCalled, false, 'fetch should not be called for local IPs');
});

test('getGeo returns Local for private 192.168.x.x IP', async (t) => {
  let fetchCalled = false;
  t.mock.method(global, 'fetch', async () => {
    fetchCalled = true;
    throw new Error('Should not call fetch for private IP');
  });

  delete require.cache[require.resolve('../src/services/geo')];
  const { getGeo } = require('../src/services/geo');
  const result = await getGeo('192.168.1.100');
  assert.equal(result.country, 'Local');
  assert.equal(fetchCalled, false, 'fetch should not be called for private IPs');
});
