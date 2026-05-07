/**
 * Scrape helper utilities — slugify, timestamps, report generation, temp file I/O.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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