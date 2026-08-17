async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function getGeo(ip) {
  // Skip geo for local/private IPs
  if (!ip || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip === '::1') {
    return { country: 'Local', city: 'Local' };
  }

  // Provider A: ip-api.com (free, no key, 45 req/min)
  try {
    const data = await fetchJson(`http://ip-api.com/json/${ip}?fields=country,city,status`);
    if (data.status === 'success') {
      return { country: data.country, city: data.city };
    }
  } catch (err) {
    console.warn('Geo provider A failed:', err.message);
  }

  // Provider B: ipapi.co (free tier ~1000/day)
  try {
    const data = await fetchJson(`https://ipapi.co/${ip}/json/`);
    if (data.country_name) {
      return { country: data.country_name, city: data.city || null };
    }
  } catch (err) {
    console.warn('Geo provider B failed:', err.message);
  }

  // All providers down — degrade gracefully
  console.warn('All geo providers down, storing submission without geo data');
  return {};
}

module.exports = { getGeo };
