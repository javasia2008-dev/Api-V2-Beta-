const { searchAnime, getAnimeInfo } = require('./_lib/scraper');
const { setCors, requireApiKey } = require('./_lib/auth');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!requireApiKey(req, res)) return;

  try {
    const judul = (req.query.judul || req.query.query || '').toString().trim();

    if (!judul) {
      return res.status(400).json({
        success: false,
        endpoint: 'informasi',
        error: 'Parameter judul wajib diisi.',
        example: '/api/informasi?judul=naruto'
      });
    }

    const hasilCari = await searchAnime(judul, 1);

    if (hasilCari.error) {
      return res.status(200).json({
        success: false,
        endpoint: 'informasi',
        judul,
        data: hasilCari
      });
    }

    if (!hasilCari.results || hasilCari.results.length === 0) {
      return res.status(200).json({
        success: false,
        endpoint: 'informasi',
        judul,
        error: 'Anime tidak ditemukan.',
        data: hasilCari
      });
    }

    const animePertama = hasilCari.results[0];
    const detail = animePertama && animePertama.url
      ? await getAnimeInfo(animePertama.url)
      : { error: 'URL detail tidak ditemukan.' };

    return res.status(200).json({
      success: true,
      endpoint: 'informasi',
      judul,
      data: {
        search: hasilCari,
        firstResult: animePertama,
        detail
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      endpoint: 'informasi',
      error: error.message
    });
  }
};
