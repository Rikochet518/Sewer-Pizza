// Fetches the news feeds and YouTube channels listed in data/sources.json
// and writes data/news.json and data/videos.json for the app to read.
// Runs every hour on GitHub (see .github/workflows/update-feeds.yml).
// Needs Node 18 or newer. No packages to install.
import { readFile, writeFile } from 'node:fs/promises';

const ROOT = new URL('..', import.meta.url);
const readJSON = async (p) => JSON.parse(await readFile(new URL(p, ROOT), 'utf8'));
const writeJSON = (p, data) => writeFile(new URL(p, ROOT), JSON.stringify(data, null, 2) + '\n');

const MAX_NEWS = 60;
const MAX_VIDEOS = 30;

function decode(s) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}
function tag(block, name) {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? decode(m[1]) : '';
}
function attr(block, name, a) {
  const m = block.match(new RegExp(`<${name}\\b[^>]*\\s${a}="([^"]*)"`, 'i'));
  return m ? decode(m[1]) : '';
}

export function parseFeed(xml) {
  const items = [];
  for (const b of xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || []) {
    items.push({
      title: tag(b, 'title'),
      url: tag(b, 'link'),
      published: tag(b, 'pubDate') || tag(b, 'dc:date'),
      source: tag(b, 'source')
    });
  }
  for (const b of xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || []) {
    items.push({
      title: tag(b, 'title'),
      url: attr(b, 'link', 'href'),
      published: tag(b, 'published') || tag(b, 'updated'),
      videoId: tag(b, 'yt:videoId'),
      source: tag(b, 'name')
    });
  }
  return items;
}

export function categorize(title) {
  const t = title.toLowerCase();
  if (/\b(comic|comics|issue #?\d|idw|graphic novel)\b/.test(t)) return 'Comics';
  if (/\b(toy|toys|figure|figures|playmates|neca|lego|funko|collectible)\b/.test(t)) return 'Toys';
  if (/\b(game|games|gaming|switch|playstation|ps5|xbox|steam|arcade)\b/.test(t)) return 'Games';
  if (/\b(movie|film|box office|trailer|sequel|theaters?)\b/.test(t)) return 'Movies';
  if (/\b(series|episode|season|show|paramount\+|nickelodeon|cartoon)\b/.test(t)) return 'Shows';
  return 'News';
}

function iso(d) {
  const t = Date.parse(d);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

async function getText(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'SewerPizzaFeedBot/1.0 (fan app feed reader)' },
    signal: AbortSignal.timeout(15000)
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.text();
}

async function updateNews(feeds) {
  const all = [];
  for (const feed of feeds) {
    try {
      const items = parseFeed(await getText(feed.url));
      for (const it of items) {
        if (!it.title || !it.url) continue;
        let title = it.title;
        let source = it.source || feed.name || '';
        // Google News puts " - Source Name" at the end of each title.
        if (it.source && title.endsWith(' - ' + it.source)) title = title.slice(0, -(' - ' + it.source).length);
        all.push({ title, source, category: feed.category || categorize(title), url: it.url, published: iso(it.published) });
      }
      console.log(`news: ${feed.name || feed.url}: ${items.length} items`);
    } catch (err) {
      console.warn(`news: skipped ${feed.name || feed.url}: ${err.message}`);
    }
  }
  const seen = new Set();
  const items = all
    .filter((n) => { const k = n.title.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => (b.published || '').localeCompare(a.published || ''))
    .slice(0, MAX_NEWS);
  return items;
}

async function updateVideos(channels) {
  const all = [];
  for (const ch of channels) {
    const id = typeof ch === 'string' ? ch : ch.id;
    if (!id) continue;
    try {
      const items = parseFeed(await getText(`https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(id)}`));
      for (const it of items) {
        if (!it.videoId) continue;
        all.push({ id: it.videoId, title: it.title, channel: it.source, published: iso(it.published) });
      }
      console.log(`videos: ${id}: ${items.length} items`);
    } catch (err) {
      console.warn(`videos: skipped ${id}: ${err.message}`);
    }
  }
  return all.sort((a, b) => (b.published || '').localeCompare(a.published || '')).slice(0, MAX_VIDEOS);
}

async function main() {
  const sources = await readJSON('data/sources.json');
  const now = new Date().toISOString();

  const news = await updateNews(sources.feeds || []);
  if (news.length) await writeJSON('data/news.json', { updated: now, sample: false, items: news });
  else console.warn('news: nothing fetched, keeping the current file');

  const channels = sources.youtubeChannels || [];
  if (channels.length) {
    const videos = await updateVideos(channels);
    if (videos.length) await writeJSON('data/videos.json', { updated: now, items: videos });
    else console.warn('videos: nothing fetched, keeping the current file');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
