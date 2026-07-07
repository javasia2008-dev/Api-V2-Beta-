const { searchAnime, getAnimeInfo } = require('./_lib/scraper');
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
    const judul = (req.query.judul || req.query.query || '').toString().trim();

    if (!judul) {
      return sendJson(res, 400, {
        success: false,
        error: 'Parameter judul wajib diisi.',
        example: '/api/informasi?judul=naruto'
      });
    }

    const hasilCari = await searchAnime(judul, 1);
    if (hasilCari.error) {
      return sendJson(res, 200, {
        success: false,
        endpoint: 'informasi',
        judul,
        data: hasilCari
      });
    }

    if (!hasilCari.results || hasilCari.results.length === 0) {
      return sendJson(res, 200, {
        success: false,
        endpoint: 'informasi',
        judul,
        error: 'Anime tidak ditemukan.',
        data: hasilCari
      });
    }

    const animePertama = hasilCari.results[0];
    const detail = animePertama.url ? await getAnimeInfo(animePertama.url) : { error: 'URL detail tidak ditemukan.' };

    return sendJson(res, 200, {
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
    return sendJson(res, 500, {
      success: false,
      endpoint: 'informasi',
      error: error.message
    });
  }
};
