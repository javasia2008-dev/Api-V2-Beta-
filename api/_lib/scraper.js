const cloudscraper = require('cloudscraper');
const cheerio = require('cheerio');
const { getRandomUA } = require('./user-agent');

const BASE_URL = (process.env.SOURCE_BASE_URL || 'https://v2.samehadaku.how').replace(/\/+$/, '');
const SEARCH_PATH = process.env.SEARCH_PATH || '/?s={query}&paged={page}';
const TOP10_PATH = process.env.TOP10_PATH || '/';
const DETAIL_URL_TEMPLATE = process.env.DETAIL_URL_TEMPLATE || '{url}';
const TIMEOUT = Number(process.env.SCRAPER_TIMEOUT_MS || 15000);

function buildUrl(template, vars = {}) {
  let out = String(template);
  for (const [key, value] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  }
  return out;
}

function absoluteUrl(input) {
  if (!input) return null;
  try {
    return new URL(input, BASE_URL + '/').href;
  } catch {
    return null;
  }
}

async function fetchHtml(url) {
  return cloudscraper.get(url, {
    headers: {
      'User-Agent': getRandomUA(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
      'Referer': `${BASE_URL}/`,
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    },
    timeout: TIMEOUT
  });
}

async function searchAnime(query, page = 1) {
  const q = String(query || '').trim();
  const currentPage = Number.isFinite(Number(page)) && Number(page) > 0 ? Number(page) : 1;

  if (!q) {
    return { results: [], page: currentPage, totalPages: 1, nextPage: null, prevPage: null, error: 'Query kosong.' };
  }

  const path = currentPage <= 1
    ? buildUrl(SEARCH_PATH, { query: encodeURIComponent(q), page: currentPage })
    : `/page/${currentPage}${SEARCH_PATH.startsWith('/') ? '' : '/'}?s=${encodeURIComponent(q)}&paged=${currentPage}`;

  const url = absoluteUrl(path);
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  const results = [];

  const main = $('main.site-main.relat');
  if (!main.length) {
    return { results: [], page: currentPage, totalPages: 1, nextPage: null, prevPage: null, error: 'Struktur halaman tidak ditemukan.', sourceUrl: url };
  }

  main.find('article.animpost').each((i, article) => {
    const $article = $(article);
    const $link = $article.find('.animposx a').first();
    const $tooltip = $article.find('.stooltip');

    const judul = $article.find('.data .title h2').text().trim();
    const urlAnime = absoluteUrl($link.attr('href'));
    const gambar = $article.find('.animposx img').attr('src') || '';
    const tipe = $article.find('.content-thumb .type').text().trim();
    const ratingText = $article.find('.score').text().trim();
    const rating = (ratingText.match(/[\d.]+/) || [0])[0];
    const status = $article.find('.data .type').last().text().trim();
    const sinopsis = $tooltip.find('.ttls').text().trim();

    const genres = [];
    $tooltip.find('.genres .mta a').each((j, el) => genres.push($(el).text().trim()));

    const metadataSpans = $tooltip.find('.metadata span');
    const viewsText = metadataSpans.last().text().trim();
    const views = (viewsText.match(/\d+/) || [0])[0];

    results.push({ judul, url: urlAnime, gambar, tipe, rating, status, sinopsis, genres, views });
  });

  const paginationDiv = $('div.pagination');
  let totalPages = 1;
  let nextPage = null;
  let prevPage = null;

  if (paginationDiv.length) {
    const pageText = paginationDiv.find('span').first().text().trim();
    const match = pageText.match(/Page\s+\d+\s+of\s+(\d+)/i);
    if (match) totalPages = parseInt(match[1], 10) || 1;

    const nextLink = paginationDiv.find('a.next').attr('href') || paginationDiv.find('a[rel="next"]').attr('href');
    const prevLink = paginationDiv.find('a.prev').attr('href') || paginationDiv.find('a[rel="prev"]').attr('href');
    nextPage = nextLink ? currentPage + 1 : null;
    prevPage = prevLink ? currentPage - 1 : null;
  }

  return { query: q, page: currentPage, totalPages, nextPage, prevPage, sourceUrl: url, results };
}

async function getAnimeInfo(url) {
  const targetUrl = absoluteUrl(DETAIL_URL_TEMPLATE === '{url}' ? url : buildUrl(DETAIL_URL_TEMPLATE, { url: encodeURIComponent(url) }));
  if (!targetUrl) return { error: 'URL detail tidak valid.' };

  const html = await fetchHtml(targetUrl);
  const $ = cheerio.load(html);
  const result = {};

  result.judul = $('.lm h1.entry-title').first().text().trim() || $('h1.entry-title').first().text().trim();
  result.sinopsis = $('.lm .entry-content-single').first().text().trim() || $('.entry-content-single').first().text().trim();
  result.gambar = $('.infoanime .thumb img').first().attr('src') || $('.animepost .animposx img').first().attr('src') || '';
  result.rating = $('.rtg span[itemprop="ratingValue"]').first().text().trim() || $('.score').first().text().replace(/[^\d.]/g, '');
  result.genres = [];
  $('.genre-info a').each((i, el) => result.genres.push($(el).text().trim()));

  result.details = {};
  $('.infox .spe span').each((i, span) => {
    const key = $(span).find('b').first().text().replace(/:\s*$/, '').trim();
    const fullText = $(span).text().trim();
    let value = fullText.replace(key + ':', '').trim();
    const links = $(span).find('a');
    if (links.length > 0) {
      const linkTexts = [];
      links.each((j, a) => linkTexts.push($(a).text().trim()));
      value = linkTexts.join(', ') || value;
    }
    if (key && value) result.details[key] = value;
  });

  result.episodes = [];
  $('.listeps ul li').each((i, li) => {
    const epsNum = $(li).find('.epsright .eps a').text().trim();
    const epsTitle = $(li).find('.epsleft .lchx a').text().trim();
    const epsLink = absoluteUrl($(li).find('.epsright .eps a').attr('href'));
    const epsDate = $(li).find('.epsleft .date').text().trim();
    if (epsNum && epsTitle) {
      result.episodes.push({ episode: epsNum, title: epsTitle, link: epsLink, date: epsDate });
    }
  });

  result.batch = [];
  $('.batchlink li a').each((i, a) => {
    const title = $(a).text().trim();
    const link = absoluteUrl($(a).attr('href'));
    if (title || link) result.batch.push({ title, link });
  });

  return result;
}

async function getTop10() {
  const url = absoluteUrl(TOP10_PATH);
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  const top10 = [];
  $('.widget_senction').each((i, section) => {
    const title = $(section).find('h3').text().trim().toLowerCase();
    if (title.includes('top 10 minggu ini')) {
      $(section).find('.topten-animesu ul li').each((j, li) => {
        const $li = $(li);
        const $a = $li.find('a.series');
        top10.push({
          peringkat: $a.find('.is-topten b:last-child').text().trim(),
          judul: $a.find('.judul').text().trim(),
          url: absoluteUrl($a.attr('href')),
          gambar: $a.find('img').attr('src') || '',
          rating: ($a.find('.rating').text().match(/[\\d.]+/) || [0])[0]
        });
      });
      return false;
    }
  });

  const animeTerbaru = [];
  $('.widget_senction').each((i, section) => {
    const title = $(section).find('h3').text().trim();
    if (title === 'Anime Terbaru') {
      $(section).find('.post-show ul li').each((j, li) => {
        const $li = $(li);
        const $img = $li.find('.thumb img').first();
        const $link = $li.find('.thumb a[itemprop="url"]').first();
        const $epSpan = $li.find('.dtla span .dashicons-controls-play').parent();
        const $authorSpan = $li.find('.dtla span .dashicons-admin-users').parent();
        const $dateSpan = $li.find('.dtla span .dashicons-calendar').parent();

        animeTerbaru.push({
          judul: $li.find('.dtla h2 a').text().trim(),
          url: absoluteUrl($link.attr('href')),
          gambar: $img.attr('src') || '',
          episode: $epSpan.text().trim(),
          postedBy: $authorSpan.text().trim(),
          releasedOn: $dateSpan.text().trim()
        });
      });
      return false;
    }
  });

  return { sourceUrl: url, top10, animeTerbaru };
}

module.exports = { searchAnime, getAnimeInfo, getTop10 };
