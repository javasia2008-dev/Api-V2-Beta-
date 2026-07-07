function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
}

function ensureGet(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return { done: true, status: 204 };
  if (req.method !== 'GET') return { done: true, status: 405, body: { success: false, error: 'Method not allowed' } };
  return { done: false };
}

function sendJson(res, status, body) {
  res.status(status).json(body);
}

module.exports = { setCors, ensureGet, sendJson };
