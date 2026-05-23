import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, rmSync, cpSync, copyFileSync } from 'fs';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const FUNCTIONS_DIR = join(ROOT, 'functions');
const PKG_PATH = join(FUNCTIONS_DIR, 'package.json');
const SHARED_DIR = join(ROOT, 'packages', 'shared');
const VENDOR_SHARED_DIR = join(FUNCTIONS_DIR, 'vendor-shared');
const ROOT_LOCKFILE = join(ROOT, 'pnpm-lock.yaml');
const FUNCTIONS_LOCKFILE = join(FUNCTIONS_DIR, 'pnpm-lock.yaml');

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

	// 4. Sync pnpm-lock.yaml with updated package.json.
	//    In a pnpm workspace, running install from a workspace package updates
	//    the root lockfile. We then copy it to functions/ so Firebase CLI
	//    can detect pnpm during deployment.
	execSync('pnpm install --lockfile-only', {
		cwd: ROOT,
		stdio: 'inherit',
	});
	console.log('[predeploy] Synced root pnpm-lock.yaml');

	// 5. Copy root pnpm-lock.yaml to functions/ for Firebase CLI detection.
	//    Firebase CLI looks for pnpm-lock.yaml in the functions directory
	//    to determine which package manager to use during deployment.
	copyFileSync(ROOT_LOCKFILE, FUNCTIONS_LOCKFILE);
	console.log('[predeploy] Copied pnpm-lock.yaml to functions/');

	// Note: Do NOT clean .firebase/ — Firebase CLI manages its own cache,
	// and deleting it destroys hosting framework function builds, causing
	// "directory not found" errors when deploying functions+hosting together.
} catch (err) {
	console.error('[predeploy] Error:', err.message);
	process.exit(1);
}
