const DEFAULT_TIMEOUT_MS = Number(process.env.SCRAPER_TIMEOUT_MS || 15000);
const USER_AGENT =
  process.env.SCRAPER_USER_AGENT ||
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

function getBaseUrl() {
  const raw = process.env.SOURCE_BASE_URL;
  if (!raw) {
    throw new Error('SOURCE_BASE_URL belum diisi di environment variables.');
  }

  try {
    const normalized = raw.endsWith('/') ? raw : `${raw}/`;
    return new URL(normalized);
  } catch {
    throw new Error(`SOURCE_BASE_URL tidak valid: ${raw}`);
  }
}

function withBase(pathOrUrl) {
  const base = getBaseUrl();
  return new URL(pathOrUrl, base).href;
}

function replacePlaceholders(template, vars = {}) {
  let out = String(template);
  for (const [key, value] of Object.entries(vars)) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(`\\{${escapedKey}\\}`, 'g'), String(value));
  }
  return out;
}

function buildUrl(templateEnvName, pathEnvName, fallbackPath, vars = {}) {
  const base = getBaseUrl();
  const template = process.env[templateEnvName];
  if (template) {
    const replaced = replacePlaceholders(template, {
      base: base.href.replace(/\/$/, ''),
      ...vars,
    });
    return new URL(replaced, base).href;
  }

  const path = process.env[pathEnvName] || fallbackPath;
  const replacedPath = replacePlaceholders(path, {
    base: base.href.replace(/\/$/, ''),
    ...vars,
  });

  return new URL(replacedPath, base).href;
}

function buildSearchUrl(query, page = 1) {
  const q = String(query || '').trim();
  const safePage = Number.isFinite(Number(page)) && Number(page) > 0 ? Number(page) : 1;

  // Generic fallback works for many WordPress-like search pages.
  // Can be overridden via SEARCH_URL_TEMPLATE / SEARCH_PATH.
  return buildUrl(
    'SEARCH_URL_TEMPLATE',
    'SEARCH_PATH',
    '/?s={query}&paged={page}',
    {
      query: encodeURIComponent(q),
      page: safePage,
      q: encodeURIComponent(q),
    }
  );
}

function buildTop10Url() {
  return buildUrl(
    'TOP10_URL_TEMPLATE',
    'TOP10_PATH',
    '/top-10',
    {}
  );
}

function normalizeText(input) {
  return decodeHtmlEntities(String(input || ''))
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeHtmlEntities(text) {
  return String(text || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function safeUrl(href, baseUrl) {
  if (!href) return null;
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return null;
  }
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} saat mengakses ${url}`);
    }

    return await response.text();
  } catch (err) {
    if (err && err.name === 'AbortError') {
      throw new Error(`Request timeout setelah ${DEFAULT_TIMEOUT_MS}ms: ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

function dedupeByHref(items) {
  const seen = new Set();
  const out = [];

  for (const item of items) {
    const href = item && item.url;
    if (!href || seen.has(href)) continue;
    seen.add(href);
    out.push(item);
  }

  return out;
}

function extractMeta(html, key) {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${key}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+name=["']${key}["'][^>]+content=["']([^"']+)["']`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) return decodeHtmlEntities(match[1].trim());
  }
  return '';
}

function collectBlocks(html) {
  const patterns = [
    /<article\b[\s\S]*?<\/article>/gi,
    /<li\b[\s\S]*?<\/li>/gi,
    /<div\b[^>]*class=["'][^"']*(?:item|entry|post|anime|card|result|box|content)[^"']*["'][\s\S]*?<\/div>/gi,
  ];

  const blocks = [];
  for (const pattern of patterns) {
    const matches = html.match(pattern);
    if (matches && matches.length) blocks.push(...matches);
  }
  return blocks.length ? blocks : [html];
}

function extractBlockItem(block, baseUrl) {
  const hrefMatch =
    block.match(/<a\b[^>]+href=["']([^"']+)["']/i) ||
    block.match(/<link\b[^>]+href=["']([^"']+)["']/i);

  const href = hrefMatch ? safeUrl(decodeHtmlEntities(hrefMatch[1]), baseUrl) : null;
  if (!href) return null;

  const title =
    decodeHtmlEntities(
      (block.match(/<img\b[^>]+alt=["']([^"']+)["']/i) || [])[1] ||
      (block.match(/<meta\b[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) || [])[1] ||
      (block.match(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/i) || [])[1] ||
      (block.match(/<a\b[^>]*>([\s\S]*?)<\/a>/i) || [])[1] ||
      ''
    );

  const image =
    safeUrl(
      decodeHtmlEntities(
        (block.match(/<img\b[^>]+(?:data-src|data-lazy-src|src)=["']([^"']+)["']/i) || [])[1] || ''
      ),
      baseUrl
    ) ||
    '';

  const excerpt =
    normalizeText(
      (block.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i) || [])[1] ||
      (block.match(/<div\b[^>]+class=["'][^"']*(?:excerpt|summary|desc|description)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) || [])[1] ||
      ''
    );

  const rawLabel = normalizeText(block);
  const result = {
    title: title || excerpt || href,
    url: href,
    image,
    excerpt,
    raw: rawLabel.slice(0, 1000),
  };

  return result;
}

function parseSearchResults(html, baseUrl) {
  const blocks = collectBlocks(html);
  const items = [];

  for (const block of blocks) {
    const item = extractBlockItem(block, baseUrl);
    if (!item) continue;

    // Filter out obviously irrelevant anchors (navigation/footer/etc.)
    const titleLower = String(item.title || '').toLowerCase();
    const hrefLower = String(item.url || '').toLowerCase();
    if (
      titleLower === hrefLower ||
      titleLower === 'home' ||
      titleLower === 'menu' ||
      titleLower === 'next' ||
      titleLower === 'prev'
    ) {
      continue;
    }

    items.push(item);
  }

  // Keep only items that look like anime entries.
  const filtered = items.filter((item) => {
    const text = `${item.title} ${item.excerpt} ${item.url}`.toLowerCase();
    return /anime|episode|eps|season|sub|batch|download|stream|watch/.test(text) || item.image;
  });

  return dedupeByHref((filtered.length ? filtered : items).slice(0, 30));
}

function parseKeyValuePairs(html) {
  const pairs = [];
  const patterns = [
    /<tr\b[\s\S]*?<th\b[^>]*>([\s\S]*?)<\/th>[\s\S]*?<td\b[^>]*>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/gi,
    /<li\b[^>]*>([\s\S]*?):\s*([\s\S]*?)<\/li>/gi,
    /<div\b[^>]+class=["'][^"']*(?:meta|info|spec|detail)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const label = normalizeText(match[1]);
      const value = normalizeText(match[2]);
      if (!label || !value) continue;
      if (label.length > 80) continue;
      pairs.push({ label, value });
    }
  }

  const seen = new Set();
  return pairs.filter((p) => {
    const key = `${p.label}::${p.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseEpisodeLinks(html, baseUrl) {
  const matches = [];
  const anchorPattern = /<a\b[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = anchorPattern.exec(html)) !== null) {
    const href = safeUrl(decodeHtmlEntities(match[1]), baseUrl);
    const text = normalizeText(match[2]);
    if (!href || !text) continue;

    const lower = text.toLowerCase();
    const urlLower = href.toLowerCase();

    if (
      /episode|eps|batch|download|stream|watch/.test(lower) ||
      /episode|download|stream/.test(urlLower)
    ) {
      matches.push({
        title: text,
        url: href,
      });
    }
  }

  return dedupeByHref(matches).slice(0, 100);
}

async function searchAnime(query, page = 1) {
  const q = String(query || '').trim();
  const safePage = Number.isFinite(Number(page)) && Number(page) > 0 ? Number(page) : 1;

  if (!q) {
    return {
      error: 'Parameter query wajib diisi.',
      results: [],
    };
  }

  const url = buildSearchUrl(q, safePage);
  const baseUrl = getBaseUrl().href;
  const html = await fetchHtml(url);
  const results = parseSearchResults(html, baseUrl);

  if (!results.length) {
    return {
      error: 'Anime tidak ditemukan.',
      query: q,
      page: safePage,
      results: [],
      sourceUrl: url,
    };
  }

  return {
    query: q,
    page: safePage,
    sourceUrl: url,
    results,
  };
}

async function getAnimeInfo(inputUrl) {
  const raw = String(inputUrl || '').trim();
  if (!raw) {
    throw new Error('Parameter url wajib diisi.');
  }

  const baseUrl = getBaseUrl().href;
  const normalizedUrl = safeUrl(raw, baseUrl);
  if (!normalizedUrl) {
    throw new Error(`URL tidak valid: ${raw}`);
  }

  const url = process.env.DETAIL_URL_TEMPLATE
    ? replacePlaceholders(process.env.DETAIL_URL_TEMPLATE, {
        base: baseUrl.replace(/\/$/, ''),
        url: encodeURIComponent(normalizedUrl),
      })
    : normalizedUrl;

  const html = await fetchHtml(url);
  const title =
    extractMeta(html, 'og:title') ||
    normalizeText((html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '') ||
    normalizeText((html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '');

  const image =
    extractMeta(html, 'og:image') ||
    extractMeta(html, 'twitter:image') ||
    safeUrl((html.match(/<img\b[^>]+(?:data-src|data-lazy-src|src)=["']([^"']+)["']/i) || [])[1] || '', baseUrl) ||
    '';

  const synopsis =
    extractMeta(html, 'description') ||
    normalizeText(
      (html.match(/<div\b[^>]+class=["'][^"']*(?:synopsis|sinopsis|summary|description|desc)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) || [])[1] ||
      (html.match(/<p\b[^>]+class=["'][^"']*(?:synopsis|sinopsis|summary|description|desc)[^"']*["'][^>]*>([\s\S]*?)<\/p>/i) || [])[1] ||
      ''
    );

  const metadata = parseKeyValuePairs(html);
  const episodes = parseEpisodeLinks(html, baseUrl);

  return {
    url,
    title,
    image,
    synopsis,
    metadata,
    episodes,
    sourceUrl: url,
    raw: {
      title,
      image,
      synopsis,
    },
  };
}

async function getTop10() {
  const url = buildTop10Url();
  const baseUrl = getBaseUrl().href;
  const html = await fetchHtml(url);

  const results = parseSearchResults(html, baseUrl);
  if (!results.length) {
    return {
      error: 'Top 10 tidak ditemukan.',
      results: [],
      sourceUrl: url,
    };
  }

  return {
    sourceUrl: url,
    results,
  };
}

module.exports = {
  searchAnime,
  getAnimeInfo,
  getTop10,
};
