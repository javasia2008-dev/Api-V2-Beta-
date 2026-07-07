function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
}

function normalizeKeys(value) {
  return String(value || '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);
}

function getExpectedKeys() {
  const keys = normalizeKeys(process.env.API_KEYS || process.env.API_KEY);
  return keys;
}

function getProvidedKey(req) {
  const headerKey = req.headers['x-api-key'] || req.headers['X-API-Key'];
  const queryKey = req.query.apikey || req.query.api_key || req.query.key;
  return String(headerKey || queryKey || '').trim();
}

function requireApiKey(req, res) {
  const expectedKeys = getExpectedKeys();

  if (expectedKeys.length === 0) {
    return true;
  }

  const provided = getProvidedKey(req);

  if (!provided || !expectedKeys.includes(provided)) {
    res.status(401).json({
      success: false,
      error: 'Invalid API Key',
      hint: 'Kirim via header x-api-key atau query apikey'
    });
    return false;
  }

  return true;
}

module.exports = {
  setCors,
  requireApiKey,
  getProvidedKey,
  getExpectedKeys
};
