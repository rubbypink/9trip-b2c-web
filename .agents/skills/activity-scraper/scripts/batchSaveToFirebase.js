/**
 * batchSaveToFirebase.js — Save ALL scraped activities to Firebase.
 *
 * Usage:
 *   node .agents/skills/activity-scraper/scripts/batchSaveToFirebase.js
 *
 * @module batchSaveToFirebase
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const TEMP_DIR = path.resolve(__dirname, "../../../../.temp");
const SAVE_SCRIPT = path.resolve(__dirname, "../../../../.agents/skills/activity-scraper/scripts/saveActivityDataScript.js");

// All activity slugs from batch scrape
// ve-symphony-of-the-sea-phu-quoc already saved to Firebase
const ACTIVITY_SLUGS = [
  "phong-cho-san-bay-phu-quoc",
  "ve-vinwonders-va-safari-phu-quoc",
  "ve-show-kiss-of-the-sea-phu-quoc",
  "ve-cap-treo-sun-world-hon-thom",
  "ve-grand-world-phu-quoc",
  "ve-ice-jungle-phu-quoc",
  "xe-ua-on-rieng-tu-san-bay-phu-quoc",
  "xe-ua-on-san-bay-phu-quoc",
  "tour-3-dao-phu-quoc",
  "tour-4-dao-cap-treo",
  "trai-nghiem-cau-muc-em",
  "tour-4-dao-cap-treo-hon-thom",
  "tour-3-dao-bao-gom-cap-treo",
  "tour-3-dao-junk-cruise",
  "lam-phi-hanh-gia-duoi-ai-duong",
  "workshop-lam-socola-thu-cong",
  "tour-nam-ao-phu-quoc",
  "tour-nam-ao-cap-treo",
  "tour-bac-phu-quoc",
  "tour-cau-ca-lon",
  "tour-cau-muc-hoang-hon",
  "xe-ua-on-san-bay-pqc",
  "du-thuyen-nemo-phu-quoc",
  "tour-3-dao-cao-toc",
  "ve-thuyen-thung-phu-quoc",
];

let successCount = 0;
let failCount = 0;
const errors = [];

for (let i = 0; i < ACTIVITY_SLUGS.length; i++) {
  const slug = ACTIVITY_SLUGS[i];
  const inputFile = path.join(TEMP_DIR, `scraped-activity-${slug}.json`);
  
  if (!fs.existsSync(inputFile)) {
    console.log(`[${i + 1}/${ACTIVITY_SLUGS.length}] ❌ ${slug} — File not found`);
    failCount++;
    errors.push(`${slug}: File not found`);
    continue;
  }
  
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  [${i + 1}/${ACTIVITY_SLUGS.length}] Saving: ${slug}`);
  console.log(`${"=".repeat(60)}`);
  
  try {
    const cmd = `node "${SAVE_SCRIPT}" --input="${inputFile}"`;
    const output = execSync(cmd, { timeout: 180000, cwd: path.resolve(__dirname, "../../../../") });
    const lines = output.toString().split("\n").filter(l => l.includes("COMPLETE") || l.includes("Activity document") || l.includes("❌") || l.includes("✅") || l.includes("Pricing tier"));
    console.log(lines.join("\n"));
    successCount++;
  } catch (err) {
    console.log(`   ❌ Error: ${err.message.substring(0, 200)}`);
    failCount++;
    errors.push(`${slug}: ${err.message.substring(0, 100)}`);
  }
}

console.log(`\n${"=".repeat(60)}`);
console.log("  📊 BATCH SAVE SUMMARY");
console.log(`${"=".repeat(60)}`);
console.log(`  ✅ Success: ${successCount}/${ACTIVITY_SLUGS.length}`);
console.log(`  ❌ Failed: ${failCount}/${ACTIVITY_SLUGS.length}`);

if (errors.length > 0) {
  console.log("\n  ❌ Errors:");
  errors.forEach(e => console.log(`     - ${e}`));
}
