const { getAnimeInfo } = require('./_lib/scraper');
const { setCors, requireApiKey } = require('./_lib/auth');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!requireApiKey(req, res)) return;

  try {
    const url = (req.query.url || '').toString().trim();

    if (!url) {
      return res.status(400).json({
        success: false,
        endpoint: 'detail',
        error: 'Parameter url wajib diisi.',
        example: '/api/detail?url=https://...'
      });
    }

    const data = await getAnimeInfo(url);
    return res.status(200).json({
      success: true,
      endpoint: 'detail',
      url,
      data
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      endpoint: 'detail',
      error: error.message
    });
  }
};
