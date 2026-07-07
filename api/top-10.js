const { getTop10 } = require('./_lib/scraper');
const { requireApiKey } = require('./_lib/auth');
const { ensureGet, sendJson } = require('./_lib/http');

module.exports = async (req, res) => {
  const methodCheck = ensureGet(req, res);
  if (methodCheck.done) {
    if (methodCheck.status === 204) return res.status(204).end();
    return sendJson(res, methodCheck.status, methodCheck.body);
  }

  const auth = requireApiKey(req);
  if (!auth.ok) {
    return sendJson(res, auth.status, auth.body);
  }

  try {
    const data = await getTop10();
    return sendJson(res, 200, {
      success: true,
      endpoint: 'top-10',
      data
    });
  } catch (error) {
    return sendJson(res, 500, {
      success: false,
      endpoint: 'top-10',
      error: error.message
    });
  }
};
