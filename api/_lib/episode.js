const cloudscraper = require('cloudscraper');
const cheerio = require('cheerio');
const { getRandomUA } = require('./user-agent');

const REFERER = 'https://v2.samehadaku.how/';
const TIMEOUT = 15000;

async function fetchHtml(url) {
  const html = await cloudscraper.get(url, {
    headers: {
      'User-Agent': getRandomUA(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
      'Referer': REFERER,
      'Cache-Control': 'no-cache'
    },
    timeout: TIMEOUT
  });

  return html;
}

function toAbsoluteUrl(input) {
  if (!input) return null;
  try {
    return new URL(String(input).trim()).href;
  } catch {
    return null;
  }
}

async function getEpisodeDetail(url) {
  try {
    const targetUrl = toAbsoluteUrl(url);
    if (!targetUrl) {
      return { error: 'URL episode tidak valid.' };
    }

    const html = await fetchHtml(targetUrl);
    const $ = cheerio.load(html);
    const result = {};

    // Judul episode
    result.judul = $('h1.entry-title').first().text().trim() || $('title').first().text().trim();

    // Nomor episode
    result.episodeNumber = $('.sbdbti .epx span[itemprop="episodeNumber"]').first().text().trim();

    // Tanggal rilis
    result.tanggalRilis = $('.sbdbti .time-post').text().replace(/^.*?(\d+ \w+ \d+).*$/, '$1').trim();

    // Server streaming (nama, data-post, data-nume, data-type)
    result.servers = [];
    $('#server ul li .east_player_option').each((i, el) => {
      const name = $(el).find('span').text().trim();
      const dataPost = $(el).attr('data-post') || '';
      const dataNume = $(el).attr('data-nume') || '';
      const dataType = $(el).attr('data-type') || '';
      result.servers.push({
        name,
        dataPost,
        dataNume,
        dataType
      });
    });

    // Download link berdasarkan format (MKV, MP4, x265)
    result.downloads = [];
    $('.download-eps').each((i, section) => {
      const format = $(section).find('p > b').first().text().trim();
      const formats = [];
      $(section).find('ul li').each((j, li) => {
        const resolusi = $(li).find('strong').first().text().trim();
        const hosts = [];
        $(li).find('span a').each((k, a) => {
          const host = $(a).text().trim();
          const link = $(a).attr('href') || '';
          hosts.push({ host, link });
        });
        formats.push({ resolusi, hosts });
      });
      result.downloads.push({ format, formats });
    });

    // Navigasi prev/next episode
    const prevLink = $('.naveps .nvs:first-child a').attr('href');
    const nextLink = $('.naveps .nvs.rght a').attr('href');
    const allEpLink = $('.naveps .nvsc a').attr('href');
    result.navigasi = {
      prev: prevLink && prevLink !== '#' ? prevLink : null,
      next: nextLink && nextLink !== '#' ? nextLink : null,
      allEpisode: allEpLink || null
    };

    // Informasi tambahan yang aman
    result.sourceUrl = targetUrl;
    result.streaming = result.servers;

    return result;
  } catch (error) {
    return { error: error.message };
  }
}

module.exports = { getEpisodeDetail };
