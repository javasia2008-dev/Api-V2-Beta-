function normalizeKeys(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

function getExpectedKeys() {
  const keys = [
    ...normalizeKeys(process.env.API_KEY),
    ...normalizeKeys(process.env.API_KEYS)
  ];
  return [...new Set(keys)];
}

function readProvidedKey(req) {
  const headerKey = req.headers['x-api-key'];
  const queryKey = req.query.apikey || req.query.apiKey;
  return String(headerKey || queryKey || '').trim();
}

function requireApiKey(req) {
  const expectedKeys = getExpectedKeys();
  const providedKey = readProvidedKey(req);

  if (expectedKeys.length === 0) {
    return {
      ok: false,
      status: 500,
      body: {
        success: false,
        error: 'API key belum dikonfigurasi di server',
        hint: 'Tambahkan environment variable API_KEY di Vercel'
      }
    };
  }

  if (!providedKey) {
    return {
      ok: false,
      status: 401,
      body: {
        success: false,
        error: 'Invalid API Key',
        hint: 'Kirim via header x-api-key atau query apikey'
      }
    };
  }

  if (!expectedKeys.includes(providedKey)) {
    return {
      ok: false,
      status: 401,
      body: {
        success: false,
        error: 'Invalid API Key',
        hint: 'Kirim via header x-api-key atau query apikey'
      }
    };
  }

  return { ok: true, key: providedKey };
}

module.exports = { requireApiKey };
