#!/usr/bin/env node

/**
 * Migrate hotel_price_schedules collection to new schema.
 *
 * Old schema (seedPriceData.js era):
 *   - id, info { hotelId, ratePkg, year, status:"actived", supplierId, viewConfig },
 *   - priceData: { "{roomId}_{rateType}": { "{periodKey}_{supplier}": { startDate, endDate, costPrice, sellPrice, supplier, prepaid } } }
 *   - searchTags, updated_by, created_at (Timestamp), updated_at (Timestamp)
 *
 * New schema (packages/shared/schemas/hotel-price-schedules.js):
 *   - info { hotelId, year, status:"active"|"inactive"|"expired", createdAt (ISO), updatedAt (ISO) }
 *   - priceData: { "{roomId}_{rateType}": [ { startDate, endDate, costPrice, sellPrice, supplier, prepaid, periodKey } ] }
 *
 * Usage:
 *   node scripts/migrate-hotel-price-schedules.js                    # Dry run
 *   node scripts/migrate-hotel-price-schedules.js --migrate          # Execute migration
 *   node scripts/migrate-hotel-price-schedules.js --rollback <file>  # Restore from backup
 */

const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

// ─── Init Firebase Admin SDK ──────────────────────────────────────────

const serviceAccount = path.resolve(
	__dirname,
	"..",
	"tripphuquoc-db-fs-firebase-adminsdk-fbsvc-5695f7d555.json"
);
if (!fs.existsSync(serviceAccount)) {
	console.error("❌ Service account not found at:", serviceAccount);
	process.exit(1);
}
if (!admin.apps.length) {
	admin.initializeApp({
		credential: admin.credential.cert(require(serviceAccount)),
	});
}
const db = admin.firestore();

// ─── Config ───────────────────────────────────────────────────────────

const COLLECTION_NAME = "hotel_price_schedules";
const BACKUP_DIR = path.resolve(__dirname, "..", ".sisyphus", "backups");
const BATCH_SIZE = 500;

const DO_MIGRATE = process.argv.includes("--migrate");
const ROLLBACK_FILE = (() => {
	const idx = process.argv.indexOf("--rollback");
	return idx !== -1 && idx + 1 < process.argv.length
		? process.argv[idx + 1]
		: null;
})();

// ─── Helpers ──────────────────────────────────────────────────────────

/**
 * Parse document ID to extract hotelId and year.
 * Expected format: "{hotelId}_base_{year}"
 */
function parseDocId(docId) {
	const parts = docId.split("_");
	if (parts.length >= 3) {
		const year = parseInt(parts[parts.length - 1], 10);
		const hotelId = parts.slice(0, parts.length - 2).join("_");
		if (!isNaN(year)) {
			return { hotelId, year };
		}
	}
	return { hotelId: docId, year: new Date().getFullYear() };
}

/**
 * Serialize Firestore data for JSON backup (convert Timestamps to ISO strings).
 */
function serializeForBackup(data) {
	if (data instanceof admin.firestore.Timestamp) {
		return data.toDate().toISOString();
	}
	if (Array.isArray(data)) {
		return data.map(serializeForBackup);
	}
	if (data !== null && typeof data === "object") {
		const result = {};
		for (const [k, v] of Object.entries(data)) {
			result[k] = serializeForBackup(v);
		}
		return result;
	}
	return data;
}

/**
 * Convert old priceData (nested objects keyed by period) to new format
 * (arrays of period objects with periodKey).
 */
function transformPriceData(oldPriceData) {
	if (!oldPriceData || typeof oldPriceData !== "object") {
		return {};
	}

	const newPriceData = {};

	for (const [roomRateKey, periodsValue] of Object.entries(oldPriceData)) {
		if (!periodsValue || typeof periodsValue !== "object") continue;

		// Already in new array format (partial migration or manual edit)
		if (Array.isArray(periodsValue)) {
			newPriceData[roomRateKey] = periodsValue
				.map((p) => ({
					startDate: p.startDate || "",
					endDate: p.endDate || "",
					costPrice: typeof p.costPrice === "number" ? p.costPrice : 0,
					sellPrice: typeof p.sellPrice === "number" ? p.sellPrice : 0,
					supplier: p.supplier || "",
					prepaid: typeof p.prepaid === "number" ? p.prepaid : 0,
					periodKey: p.periodKey || "",
				}))
				.filter((p) => p.startDate && p.endDate);
			continue;
		}

		// Convert nested object to array
		const periodsArray = [];
		for (const [periodKey, periodData] of Object.entries(periodsValue)) {
			if (!periodData || typeof periodData !== "object") continue;
			periodsArray.push({
				startDate: periodData.startDate || "",
				endDate: periodData.endDate || "",
				costPrice:
					typeof periodData.costPrice === "number" ? periodData.costPrice : 0,
				sellPrice:
					typeof periodData.sellPrice === "number" ? periodData.sellPrice : 0,
				supplier: periodData.supplier || "",
				prepaid:
					typeof periodData.prepaid === "number" ? periodData.prepaid : 0,
				periodKey: periodKey,
			});
		}
		newPriceData[roomRateKey] = periodsArray.filter(
			(p) => p.startDate && p.endDate
		);
	}

	return newPriceData;
}

/**
 * Transform a single document from old schema to new schema.
 */
function transformDocument(docId, oldData) {
	const info = oldData.info || {};
	const parsed = parseDocId(docId);

	// hotelId
	const hotelId = info.hotelId || oldData.hotelId || parsed.hotelId;

	// year
	let year = info.year;
	if (typeof year !== "number") year = oldData.year;
	if (typeof year !== "number") year = parsed.year;

	// status
	let status = info.status || oldData.status || "active";
	if (status === "actived") status = "active";

	// timestamps — prefer already-migrated ISO strings, then fall back to old Timestamp fields
	let createdAt = info.createdAt;
	let updatedAt = info.updatedAt;

	if (!createdAt) {
		if (oldData.created_at instanceof admin.firestore.Timestamp) {
			createdAt = oldData.created_at.toDate().toISOString();
		} else if (typeof oldData.created_at === "string") {
			createdAt = oldData.created_at;
		} else {
			createdAt = new Date().toISOString();
		}
	}

	if (!updatedAt) {
		if (oldData.updated_at instanceof admin.firestore.Timestamp) {
			updatedAt = oldData.updated_at.toDate().toISOString();
		} else if (typeof oldData.updated_at === "string") {
			updatedAt = oldData.updated_at;
		} else {
			updatedAt = new Date().toISOString();
		}
	}

	return {
		info: {
			hotelId,
			year,
			status,
			createdAt,
			updatedAt,
		},
		priceData: transformPriceData(oldData.priceData),
	};
}

/**
 * Execute batch deletes.
 */
async function batchDelete(docIds) {
	let deleted = 0;
	for (let i = 0; i < docIds.length; i += BATCH_SIZE) {
		const batch = db.batch();
		const chunk = docIds.slice(i, i + BATCH_SIZE);
		for (const id of chunk) {
			batch.delete(db.collection(COLLECTION_NAME).doc(id));
		}
		await batch.commit();
		deleted += chunk.length;
		console.log(
			`   🗑️  Deleted batch ${Math.floor(i / BATCH_SIZE) + 1} (${chunk.length} docs)`
		);
	}
	return deleted;
}

/**
 * Execute batch writes (set with merge=false to overwrite).
 */
async function batchWrite(docs) {
	let written = 0;
	for (let i = 0; i < docs.length; i += BATCH_SIZE) {
		const batch = db.batch();
		const chunk = docs.slice(i, i + BATCH_SIZE);
		for (const { id, data } of chunk) {
			batch.set(db.collection(COLLECTION_NAME).doc(id), data);
		}
		await batch.commit();
		written += chunk.length;
		console.log(
			`   ✅ Wrote batch ${Math.floor(i / BATCH_SIZE) + 1} (${chunk.length} docs)`
		);
	}
	return written;
}

/**
 * Restore from backup file.
 */
async function rollbackFromFile(backupFilePath) {
	console.log(`\n🔄 Rolling back from: ${backupFilePath}`);
	if (!fs.existsSync(backupFilePath)) {
		console.error("❌ Backup file not found");
		process.exit(1);
	}

	const backup = JSON.parse(fs.readFileSync(backupFilePath, "utf-8"));
	if (!Array.isArray(backup.documents) || backup.documents.length === 0) {
		console.error("❌ Backup file has no documents");
		process.exit(1);
	}

	console.log(`   Found ${backup.documents.length} documents in backup`);

	if (!DO_MIGRATE) {
		console.log("   🧪 [DRY RUN] Would restore all documents");
		return;
	}

	// Delete current docs first
	const currentSnap = await db.collection(COLLECTION_NAME).get();
	const currentIds = currentSnap.docs.map((d) => d.id);
	if (currentIds.length > 0) {
		console.log(`   🗑️  Clearing ${currentIds.length} current documents...`);
		await batchDelete(currentIds);
	}

	// Restore from backup
	let restored = 0;
	for (let i = 0; i < backup.documents.length; i += BATCH_SIZE) {
		const batch = db.batch();
		const chunk = backup.documents.slice(i, i + BATCH_SIZE);
		for (const doc of chunk) {
			const { id, ...data } = doc;
			batch.set(db.collection(COLLECTION_NAME).doc(id), data);
		}
		await batch.commit();
		restored += chunk.length;
		console.log(
			`   ✅ Restored batch ${Math.floor(i / BATCH_SIZE) + 1} (${chunk.length} docs)`
		);
	}

	console.log(`\n✅ Rollback complete: ${restored} documents restored`);
}

// ─── Main ─────────────────────────────────────────────────────────────

async function main() {
	// Rollback mode
	if (ROLLBACK_FILE) {
		await rollbackFromFile(ROLLBACK_FILE);
		return;
	}

	console.log(`🔍 Fetching all documents from ${COLLECTION_NAME}...`);
	const snapshot = await db.collection(COLLECTION_NAME).get();
	const totalDocs = snapshot.size;

	console.log(`   Found ${totalDocs} documents`);

	if (totalDocs === 0) {
		console.log("   ⚠️  No documents to migrate");
		return;
	}

	// Build backup data
	const backupData = {
		collection: COLLECTION_NAME,
		timestamp: new Date().toISOString(),
		documentCount: totalDocs,
		documents: snapshot.docs.map((doc) => ({
			id: doc.id,
			...serializeForBackup(doc.data()),
		})),
	};

	// Ensure backup directory exists
	if (!fs.existsSync(BACKUP_DIR)) {
		fs.mkdirSync(BACKUP_DIR, { recursive: true });
	}

	const timestamp = Date.now();
	const backupFileName = `hotel_price_schedules_backup_${timestamp}.json`;
	const backupFilePath = path.join(BACKUP_DIR, backupFileName);

	fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2));
	console.log(`   💾 Backup written to: ${backupFilePath}`);

	// Verify backup
	if (!fs.existsSync(backupFilePath)) {
		console.error("❌ Backup file was not created. Aborting.");
		process.exit(1);
	}

	const stats = fs.statSync(backupFilePath);
	if (stats.size === 0) {
		console.error("❌ Backup file is empty. Aborting.");
		process.exit(1);
	}

	const backupRead = JSON.parse(fs.readFileSync(backupFilePath, "utf-8"));
	if (
		!Array.isArray(backupRead.documents) ||
		backupRead.documents.length !== totalDocs
	) {
		console.error(
			"❌ Backup verification failed: document count mismatch. Aborting."
		);
		process.exit(1);
	}

	console.log(`   ✅ Backup verified: ${backupRead.documents.length} documents`);

	// Transform documents
	console.log("\n🔄 Transforming documents...");
	const transformedDocs = [];
	for (const doc of snapshot.docs) {
		const newData = transformDocument(doc.id, doc.data());
		transformedDocs.push({ id: doc.id, data: newData });
	}
	console.log(`   Transformed ${transformedDocs.length} documents`);

	// Validate sample
	const sample = transformedDocs[0];
	console.log("\n📋 Sample transformed document:");
	console.log(`   ID: ${sample.id}`);
	console.log(`   info: ${JSON.stringify(sample.data.info)}`);
	console.log(`   priceData keys: ${Object.keys(sample.data.priceData).length}`);
	const firstPriceKey = Object.keys(sample.data.priceData)[0];
	if (firstPriceKey) {
		const firstPeriods = sample.data.priceData[firstPriceKey];
		console.log(
			`   First price entry (${firstPriceKey}): ${firstPeriods.length} periods`
		);
		if (firstPeriods.length > 0) {
			console.log(`   Sample period: ${JSON.stringify(firstPeriods[0])}`);
		}
	}

	if (!DO_MIGRATE) {
		console.log("\n🧪 DRY RUN complete. No changes were made to Firestore.");
		console.log("   To execute migration, run with --migrate flag");
		console.log(
			`   To rollback later: node scripts/migrate-hotel-price-schedules.js --rollback ${backupFilePath}`
		);
		return;
	}

	// Execute migration
	console.log("\n⚠️  About to DELETE all documents and re-write with new schema.");
	console.log(`   Documents: ${totalDocs}`);
	console.log(`   Backup: ${backupFilePath}`);

	// Delete existing documents
	console.log("\n🗑️  Deleting existing documents...");
	const docIds = snapshot.docs.map((d) => d.id);
	const deletedCount = await batchDelete(docIds);
	console.log(`   Deleted ${deletedCount} documents`);

	// Write transformed documents
	console.log("\n✍️  Writing transformed documents...");
	const writtenCount = await batchWrite(transformedDocs);
	console.log(`   Wrote ${writtenCount} documents`);

	console.log("\n✅ Migration complete!");
	console.log(`   Backup: ${backupFilePath}`);
	console.log(
		`   If needed, rollback with: node scripts/migrate-hotel-price-schedules.js --rollback ${backupFilePath}`
	);
}

main().catch((err) => {
	console.error("\n❌ Migration failed:", err);
	process.exit(1);
});
