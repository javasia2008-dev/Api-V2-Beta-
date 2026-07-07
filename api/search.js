const { searchAnime } = require('./_lib/scraper');
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
    
    const query = (req.query.query || req.query.q || '').toString().trim();
    const page = parseInt(req.query.page || '1', 10);

    if (!query) {
      return sendJson(res, 400, {
        success: false,
        error: 'Parameter query wajib diisi.',
        example: '/api/search?query=naruto&page=1'
      });
    }

    const data = await searchAnime(query, Number.isNaN(page) ? 1 : page);
    return sendJson(res, 200, {
      success: true,
      endpoint: 'search',
      query,
      page: Number.isNaN(page) ? 1 : page,
      data
    });

  } catch (error) {
    return sendJson(res, 500, {
      success: false,
      endpoint: 'search',
      error: error.message
    });
  }
};
