/**
 * Scrape helper utilities — slugify, timestamps, report generation, temp file I/O, HTML utils.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../..');

/**
 * Vietnamese-to-Latin converter map
 */
const VIETNESE_MAP = [
  [/à|á|ả|ã|ạ/gi, 'a'], [/ă|ằ|ắ|ẳ|ẵ|ặ/gi, 'a'], [/â|ầ|ấ|ẩ|ẫ|ậ/gi, 'a'],
  [/è|é|ẻ|ẽ|ẹ/gi, 'e'], [/ê|ề|ế|ể|ễ|ệ/gi, 'e'],
  [/ì|í|ỉ|ĩ|ị/gi, 'i'], [/ò|ó|ỏ|õ|ọ/gi, 'o'], [/ô|ồ|ố|ổ|ỗ|ộ/gi, 'o'],
  [/ơ|ờ|ớ|ở|ỡ|ợ/gi, 'o'], [/ù|ú|ủ|ũ|ụ/gi, 'u'], [/ư|ừ|ứ|ử|ữ|ự/gi, 'u'],
  [/ỳ|ý|ỷ|ỹ|ỵ/gi, 'y'], [/đ/gi, 'd'],
];

/**
 * Generate URL-safe slug from text (handles Vietnamese diacritics)
 * @param {string} text - Input text
 * @returns {string} - URL-safe slug
 */
export function slugify(text) {
  if (!text) return '';
  let slug = text.toLowerCase().trim();
  for (const [pattern, replacement] of VIETNESE_MAP) {
    slug = slug.replace(pattern, replacement);
  }
  slug = slug.replace(/[^a-z0-9\s-]/g, '');
  slug = slug.replace(/\s+/g, '-').replace(/-+/g, '-');
  return slug.replace(/^-+|-+$/g, '');
}

/**
 * Current ISO timestamp
 * @returns {string}
 */
export function nowISO() {
  return new Date().toISOString();
}

/**
 * File-safe timestamp string (YYYY-MM-DD-HH-mm-ss)
 * @returns {string}
 */
export function timestampForFile() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

/**
 * Ensure directory exists (recursive)
 * @param {string} dir - Directory path
 * @returns {void}
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Generate markdown report and save to .report/ directory
 * @param {object} data - Report data
 * @param {string} type - Type (hotel, tour, activity)
 * @param {{outputDir?: string}} [options]
 * @returns {Promise<string>} - Path to report file
 */
export async function generateReport(data, type, options = {}) {
  const { outputDir = path.join(PROJECT_ROOT, '.report') } = options;
  ensureDir(outputDir);

  const timestamp = timestampForFile();
  const slug = data.slug || data.title ? slugify(data.title || data.slug) : 'unknown';
  const filename = `${type}-${slug}-${timestamp}.md`;
  const filepath = path.join(outputDir, filename);

  let md = `# ${type.charAt(0).toUpperCase() + type.slice(1)} Report\n`;
  md += `**Generated:** ${nowISO()}\n`;
  md += `**Slug:** ${slug}\n\n`;
  md += `## Data\n\n`;
  md += '```json\n';
  md += JSON.stringify(data, null, 2);
  md += '\n```\n';

  fs.writeFileSync(filepath, md, 'utf-8');
  return filepath;
}

/**
 * Write JSON data to .temp/ directory
 * @param {object} data - Data to write
 * @param {string} slug - Slug for filename
 * @param {string} prefix - Prefix (e.g., 'booking-hotel', 'scraped-tour')
 * @returns {Promise<string>} - Path to file
 */
export async function writeJsonToTemp(data, slug, prefix) {
  const tempDir = path.join(PROJECT_ROOT, '.temp');
  ensureDir(tempDir);

  const filename = `${prefix}-${slug}.json`;
  const filepath = path.join(tempDir, filename);

  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
  return filepath;
}

// readJsonFromTemp
export async function readJsonFromTemp(slug, prefix) {
  const filepath = path.join(PROJECT_ROOT, '.temp', `${prefix}-${slug}.json`);
  if (!fs.existsSync(filepath)) return null;
  try {
    const content = fs.readFileSync(filepath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

// cleanTempFile
export async function cleanTempFile(slug, prefix) {
  const filepath = path.join(PROJECT_ROOT, '.temp', `${prefix}-${slug}.json`);
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
  }
}

// ============================================================================
// HTML & HTTP Utilities
// ============================================================================

/**
 * Fetch HTML content from a URL with timeout and redirect support.
 * @param {string} url - Target URL
 * @param {number} [timeout=30000] - Request timeout in ms
 * @returns {Promise<string>} - HTML content
 */
export function fetchHtml(url, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, {
      timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = new URL(res.headers.location, url).toString();
        return fetchHtml(redirectUrl, timeout).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

/**
 * Unescape common HTML entities in a string.
 * @param {string} str - String with HTML entities
 * @returns {string} - Unescaped string
 */
export function unescapeHtml(str) {
  return str
    .replace(/&q;/g, '"')
    .replace(/&l;/g, '<')
    .replace(/&g;/g, '>')
    .replace(/&a;/g, '&')
    .replace(/&n;/g, '\n')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/**
 * Strip HTML tags from a string, preserving line breaks.
 * @param {string} html - HTML content
 * @returns {string} - Plain text with line breaks preserved
 */
export function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}