const { searchAnime } = require('./_lib/scraper');
const { setCors, requireApiKey } = require('./_lib/auth');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!requireApiKey(req, res)) return;

  try {
    const query = (req.query.query || req.query.q || '').toString().trim();
    const page = parseInt(req.query.page || '1', 10);
    const safePage = Number.isNaN(page) || page < 1 ? 1 : page;

    if (!query) {
      return res.status(400).json({
        success: false,
        endpoint: 'search',
        error: 'Parameter query wajib diisi.',
        example: '/api/search?query=naruto&page=1'
      });
    }

    const data = await searchAnime(query, safePage);
    return res.status(200).json({
      success: true,
      endpoint: 'search',
      query,
      page: safePage,
      data
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      endpoint: 'search',
      error: error.message
    });
  }
};
