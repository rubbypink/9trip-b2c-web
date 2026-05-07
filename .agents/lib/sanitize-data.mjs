import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../.env.local');
if (fs.existsSync(envPath)) {
	const envContent = fs.readFileSync(envPath, 'utf-8');
	for (const line of envContent.split('\n')) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;
		const eqIdx = trimmed.indexOf('=');
		if (eqIdx === -1) continue;
		const key = trimmed.slice(0, eqIdx).trim();
		let value = trimmed.slice(eqIdx + 1).trim();
		if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
			value = value.slice(1, -1);
		}
		if (!process.env[key]) process.env[key] = value;
	}
}

const NINE_TRIP_INFO = {
	companyName: '9 Trip Phú Quốc',
	companyNameFull: 'Công ty TNHH 9 Trip Phú Quốc',
	phone: '0877.901.901',
	email: 'info@9tripphuquoc.com',
	website: 'https://9tripphuquoc.com',
	address: '17 Chu Văn An, Khu Phố 5, đặc khu Phú Quốc, An Giang',
};

const CONTACT_FIELDS = ['phone', 'email', 'website'];

const TEXT_FIELDS_MAP = {
	tour: ['title', 'description', 'excerpt', 'highlights', 'included', 'excluded', 'cancellationPolicy', 'childrenPolicy', 'notes', 'faq', 'itinerary', 'location', 'address'],
	hotel: ['name', 'description', 'excerpt', 'amenities', 'highlights', 'policies', 'address', 'tags', 'rooms', 'cancellationPolicy'],
	activity: ['title', 'description', 'excerpt', 'highlights', 'included', 'excluded', 'notes', 'location', 'locationDetail', 'openingHours', 'purchaseGuide'],
};

function deepCollectText(data, depth = 0) {
	if (depth > 5) return [];
	const texts = [];
	if (typeof data === 'string') {
		if (data.length > 20) texts.push(data);
	} else if (Array.isArray(data)) {
		for (const item of data) texts.push(...deepCollectText(item, depth + 1));
	} else if (data && typeof data === 'object') {
		for (const val of Object.values(data)) texts.push(...deepCollectText(val, depth + 1));
	}
	return texts;
}

function deepReplaceText(data, search, replacement, depth = 0) {
	if (depth > 5) return data;
	if (typeof data === 'string') {
		return data.replace(search, replacement);
	} else if (Array.isArray(data)) {
		return data.map((item) => deepReplaceText(item, search, replacement, depth + 1));
	} else if (data && typeof data === 'object') {
		const result = {};
		for (const [key, val] of Object.entries(data)) {
			result[key] = deepReplaceText(val, search, replacement, depth + 1);
		}
		return result;
	}
	return data;
}

function replaceContactFields(data) {
	for (const field of CONTACT_FIELDS) {
		if (data[field] && typeof data[field] === 'string' && data[field].trim()) {
			const old = data[field];
			data[field] = NINE_TRIP_INFO[field];
			if (old !== data[field]) {
				console.log(`   [sanitize] ${field}: "${old.slice(0, 60)}" → "${data[field]}"`);
			}
		}
	}
	return data;
}

function replaceGenericCompanyNames(data, knownNames) {
	let result = JSON.parse(JSON.stringify(data));

	const seen = new Set();
	const uniqueNames = [];
	for (const name of knownNames) {
		const lower = name.toLowerCase().trim();
		if (lower && lower.length >= 2 && !seen.has(lower)) {
			seen.add(lower);
			uniqueNames.push(name.trim());
		}
	}
	if (uniqueNames.length === 0) return result;

	const replacements = [];
	for (const name of uniqueNames) {
		const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		replacements.push(
			{ regex: new RegExp(`https?://(?:www\\.)?${escaped}\\.[a-z0-9.-]+(?=[/\\s]|$)`, 'gi'), to: NINE_TRIP_INFO.website },
			{ regex: new RegExp(`(?:^|[\\s])${escaped}\\.[a-z0-9.-]+(?=[/\\s]|$)`, 'gi'), to: ` ${NINE_TRIP_INFO.website}` },
			{ regex: new RegExp(`[\\w._%+-]+@${escaped}\\.[a-z0-9.-]+`, 'gi'), to: NINE_TRIP_INFO.email },
			{ regex: new RegExp(`(?:^|[\\s\\(\\[\"'\`])${escaped}(?=[\\s\\.\\,\\;\\!\\)\\]\\}\"'\\?:]|$)`, 'gi'), to: (m) => `${m[0]}${NINE_TRIP_INFO.companyName}` },
		);
	}

	function applyAll(text) {
		if (typeof text !== 'string') return text;
		let t = text;
		for (const { regex, to } of replacements) {
			t = t.replace(regex, to);
		}
		t = t.replace(/\s{2,}/g, ' ').trim();
		return t;
	}

	function walk(obj) {
		if (typeof obj === 'string') return applyAll(obj);
		if (Array.isArray(obj)) return obj.map(walk);
		if (obj && typeof obj === 'object') {
			const r = {};
			for (const [k, v] of Object.entries(obj)) r[k] = walk(v);
			return r;
		}
		return obj;
	}

	return walk(result);
}

export async function sanitizeScrapedData(data, { type = 'tour', knownNames = [], skipGemini = false } = {}) {
	const warnings = [];
	const changes = [];

	let cleaned = JSON.parse(JSON.stringify(data));

	cleaned = replaceContactFields(cleaned);

	if (knownNames.length > 0) {
		cleaned = replaceGenericCompanyNames(cleaned, knownNames);
	}

	const textsToCheck = deepCollectText(cleaned);

	if (!skipGemini && textsToCheck.length > 0 && process.env.GEMINI_API_KEY) {
		try {
			const result = await scanWithGemini(textsToCheck, type);
			if (result.replacements && result.replacements.length > 0) {
				for (const r of result.replacements) {
					if (r.old && r.new && r.old !== r.new && r.old.length > 3) {
						const escaped = r.old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
						const regex = new RegExp(escaped.replace(/\s+/g, '\\s+'), 'gi');
						cleaned = deepReplaceText(cleaned, regex, r.new);
						changes.push(`"${r.old.slice(0, 50)}" → "${r.new.slice(0, 50)}"`);
					}
				}
			}
		} catch (err) {
			warnings.push(`Gemini scan failed: ${err.message}`);
		}
	}

	if (changes.length > 0) {
		console.log(`   [sanitize] Gemini made ${changes.length} replacements`);
		changes.forEach((c) => console.log(`     • ${c}`));
	}

	return { data: cleaned, warnings, changes };
}

async function scanWithGemini(texts, type) {
	const sample = texts
		.filter((t) => t.length > 30)
		.slice(0, 20)
		.join('\n---\n')
		.slice(0, 8000);

	const prompt = `You are a data sanitizer for "9 Trip Phú Quốc" tourism platform.
Scan the following content extracted from a ${type} page on a third-party website.
Identify ANY of the following that belong to the SOURCE website/company (NOT 9 Trip Phú Quốc):
- Company names, brand names, tour operator names
- Person names (tour guides, sales reps, etc.)  
- Phone numbers, hotlines
- Email addresses
- Website URLs
- Social media handles (Facebook, Instagram, Zalo, etc.)
- Specific office addresses of the source company
- Any other identifying info of the source company

For each finding, suggest what it should be replaced with for 9 Trip Phú Quốc.
Return ONLY a JSON object: { "replacements": [{ "old": "original text", "new": "replacement text" }] }
If nothing to replace, return { "replacements": [] }

Content to scan:
${sample}`;

	const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 2048 } }),
	});

	if (!response.ok) {
		const errText = await response.text().catch(() => '');
		throw new Error(`Gemini API ${response.status}: ${errText.slice(0, 200)}`);
	}

	const result = await response.json();
	const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || '';

	const jsonMatch = text.match(/\{[\s\S]*\}/);
	if (!jsonMatch) return { replacements: [] };

	try {
		return JSON.parse(jsonMatch[0]);
	} catch {
		return { replacements: [] };
	}
}

// [DEAD CODE] Default export — NINE_TRIP_INFO is used internally but never imported as default
// export default NINE_TRIP_INFO;
