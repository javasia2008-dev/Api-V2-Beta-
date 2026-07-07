const { getTop10 } = require('./_lib/scraper');
const { setCors, requireApiKey } = require('./_lib/auth');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!requireApiKey(req, res)) return;

  try {
    const data = await getTop10();
    return res.status(200).json({
      success: true,
      endpoint: 'top-10',
      data
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      endpoint: 'top-10',
      error: error.message
    });
  }
};
