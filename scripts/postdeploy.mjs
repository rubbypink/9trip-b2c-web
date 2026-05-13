import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, rmSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const FUNCTIONS_DIR = join(ROOT, 'functions');
const PKG_PATH = join(FUNCTIONS_DIR, 'package.json');
const VENDOR_SHARED_DIR = join(FUNCTIONS_DIR, 'vendor-shared');

try {
	// 1. Restore functions/package.json to point back to workspace package
	const pkg = JSON.parse(readFileSync(PKG_PATH, 'utf8'));
	pkg.dependencies['@9trip/shared'] = 'file:../packages/shared';
	writeFileSync(PKG_PATH, JSON.stringify(pkg, null, '\t') + '\n');
	console.log('[postdeploy] Restored functions/package.json');

	// 2. Remove vendor-shared copy
	rmSync(VENDOR_SHARED_DIR, { recursive: true, force: true });
	console.log('[postdeploy] Removed functions/vendor-shared');
} catch (err) {
	console.error('[postdeploy] Error:', err.message);
	process.exit(1);
}
