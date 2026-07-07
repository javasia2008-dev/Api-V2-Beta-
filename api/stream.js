const { getEpisodeDetail } = require('./_lib/episode');
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
    const url = (req.query.url || '').toString().trim();

    if (!url) {
      return sendJson(res, 400, {
        success: false,
        error: 'Parameter url wajib diisi.',
        example: '/api/stream?url=https://...episode...'
      });
    }

    const data = await getEpisodeDetail(url);
    return sendJson(res, 200, {
      success: true,
      endpoint: 'stream',
      url,
      data
    });
  } catch (error) {
    return sendJson(res, 500, {
      success: false,
      endpoint: 'stream',
      error: error.message
    });
  }
};
