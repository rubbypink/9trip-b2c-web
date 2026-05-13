import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, rmSync, cpSync } from 'fs';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const FUNCTIONS_DIR = join(ROOT, 'functions');
const PKG_PATH = join(FUNCTIONS_DIR, 'package.json');
const SHARED_DIR = join(ROOT, 'packages', 'shared');
const VENDOR_SHARED_DIR = join(FUNCTIONS_DIR, 'vendor-shared');

try {
	// 1. Clean old vendor-shared
	rmSync(VENDOR_SHARED_DIR, { recursive: true, force: true });
	console.log('[predeploy] Cleaned functions/vendor-shared');

	// 2. Copy packages/shared into functions/vendor-shared
	cpSync(SHARED_DIR, VENDOR_SHARED_DIR, { recursive: true });
	console.log('[predeploy] Copied packages/shared to functions/vendor-shared');

	// 3. Update functions/package.json to use vendor-shared
	const pkg = JSON.parse(readFileSync(PKG_PATH, 'utf8'));
	pkg.dependencies['@9trip/shared'] = 'file:./vendor-shared';
	writeFileSync(PKG_PATH, JSON.stringify(pkg, null, '\t') + '\n');
	console.log('[predeploy] Updated functions/package.json to use vendor-shared');

	// 4. Sync package-lock.json with updated package.json.
	//    Firebase CLI runs `npm ci` during deploy, which requires the lock file
	//    to exactly match package.json. Since package.json was updated to point
	//    @9trip/shared at ./vendor-shared (from the workspace path), the lock
	//    file must reflect that change.
	execSync('npm install --package-lock-only', {
		cwd: FUNCTIONS_DIR,
		stdio: 'inherit',
	});
	console.log('[predeploy] Synced functions/package-lock.json');

	// Note: Do NOT clean .firebase/ — Firebase CLI manages its own cache,
	// and deleting it destroys hosting framework function builds, causing
	// "directory not found" errors when deploying functions+hosting together.
} catch (err) {
	console.error('[predeploy] Error:', err.message);
	process.exit(1);
}
