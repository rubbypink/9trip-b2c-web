#!/usr/bin/env node
/**
 * Ivivu Price Extractor — CDP-native clicks + eval --stdin snapshot
 *
 * Flow:
 *   1. Kill old session, start real Chrome with Profile 17
 *   2. Open ticket page, scroll, dismiss cookie
 *   3. Click first ticket's "Chọn" -> opens .panel-open
 *   4. Inject data-agent attributes into DOM (prep)
 *   5. Use agent-browser click (CDP) for date + btn-more
 *   6. Snapshot .price-panel via eval --stdin
 *   7. Display & save results
 */

import { execSync } from 'child_process';
import fs from 'fs';

const SESSION = 'ivivu';
const REPORT = '.temp/ivivu-report.json';
if (!fs.existsSync('.temp')) fs.mkdirSync('.temp');

/** Run an agent-browser command in the session */
function run(cmd) {
  try {
    return execSync(
      `agent-browser --session ${SESSION} ${cmd} 2>/dev/null`,
      { encoding: 'utf-8', timeout: 60000, shell: '/bin/bash' },
    );
  } catch (e) {
    return e.stdout || '';
  }
}

function runJS(js) {
  return run(
    `eval "${js.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`,
  );
}

/**
 * Pipe a multi-line JS script via agent-browser eval --stdin.
 * Returns parsed JSON or null.
 */
function runEvalStdin(jsCode) {
  try {
    const stdout = execSync(
      `agent-browser --session ${SESSION} eval --stdin 2>/dev/null`,
      {
        input: jsCode,
        encoding: 'utf-8',
        timeout: 120000,
        shell: '/bin/bash',
        maxBuffer: 10 * 1024 * 1024,
      },
    );
    const trimmed = stdout.trim();
    if (!trimmed) return null;
    return JSON.parse(trimmed);
  } catch (e) {
    const out = e.stdout || '';
    if (out) {
      try {
        return JSON.parse(out.trim());
      } catch (_) {}
    }
    console.error('eval --stdin error:', e.message.slice(0, 120));
    return null;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parsePrice(s) {
  if (!s || typeof s !== 'string') return null;
  const m = s.match(/(\d{1,3}(?:[.,]\d{3})*)/);
  if (!m) return null;
  const n = parseInt(m[1].replace(/[.,]/g, ''), 10);
  return n > 1000 ? n : null;
}

async function main() {
  const url =
    process.argv[2] ||
    'https://www.ivivu.com/ve-vui-choi/hoat-dong/ve-sun-world-ba-den-mountain/3';

  console.log('Ivivu Price Extractor (CDP-native clicks)\n' + '='.repeat(50));

  // ---------------------------------------------------------
  // 0. Open page (headless anti-detection)
  // ---------------------------------------------------------
  const STEALTH_ARGS =
    '--args "--disable-blink-features=AutomationControlled,--no-sandbox" ' +
    '--user-agent "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"';

  run(`${STEALTH_ARGS} open ${url} --wait-for-load`);
  await sleep(4000);
  run('set viewport 1920 1080');

  // 1. Dismiss cookie banner
  try {
    run('click text="Đồng ý"');
  } catch (_) {}

  // 2. Scroll to reveal ticket section
  for (let i = 0; i < 3; i++) {
    runJS(`window.scrollTo(0,${(i + 1) * 800})`);
    await sleep(1500);
  }

  // 3. Count tickets
  const ticketCount = parseInt(
    run(`get count ".button-choose .btn-action"`) || '0',
    10,
  );
  console.log(`Found ${ticketCount} tickets`);

  if (ticketCount === 0) {
    console.log('No tickets found - cannot open panel.');
    return;
  }

  // 5. Click first ticket to open the booking panel
  process.stdout.write('Opening ticket panel... ');
  runJS(`(function(){
    var e=document.querySelectorAll('.ticket-item')[0];
    if(e){var b=e.querySelector('.button-choose .btn-action');
    if(b){b.scrollIntoView({block:'center'});b.click();}}
  })()`);
  await sleep(4000);
  console.log('done.\n');

  // ---------------------------------------------------------
  // 6A. Inject data-agent attributes into DOM
  // ---------------------------------------------------------
  console.log('Mapping DOM elements using data-* attributes...');

  const prepScript = `new Promise((resolve) => {
    var state = { hasDateToClick: false, itemsToClick: [] };
    var panel = document.querySelector('.panel-open');
    if (!panel) return resolve(state);

    var dateEl = panel.querySelector('.day-item.is-today')
              || panel.querySelector('.day-item.is-start-date')
              || panel.querySelector('.day-item:not(.is-disabled)');

    if (dateEl) {
      dateEl.setAttribute('data-agent', 'target-date');
      state.hasDateToClick = true;
    }

    var boxes = panel.querySelectorAll('.tkn__quantity--box');
    boxes.forEach(function(box, i) {
      var btnMore = box.querySelector('.btn-more');
      var btnLess = box.querySelector('.btn-less');
      var priceEl = box.querySelector('.price-panel');

      if (btnMore) btnMore.setAttribute('data-agent', 'btn-more-' + i);
      if (btnLess) btnLess.setAttribute('data-agent', 'btn-less-' + i);

      var priceText = priceEl ? priceEl.textContent.trim() : '';
      if (priceText === '') {
        state.itemsToClick.push(i);
      }
    });

    resolve(state);
  });`;

  const state = runEvalStdin(prepScript);

  if (!state || state.hasDateToClick === undefined) {
    console.log('Panel extraction failed: Could not map elements.');
    return;
  }

  // ---------------------------------------------------------
  // 6B. Native CDP clicks via agent-browser click
  // ---------------------------------------------------------
  console.log('Triggering CDP clicks safely...');

  if (state.hasDateToClick) {
    run(`click "[data-agent='target-date']"`);
    await sleep(2000);
  }

  if (state.itemsToClick && state.itemsToClick.length > 0) {
    for (const i of state.itemsToClick) {
      process.stdout.write(`  - Loading price for item index ${i}... `);

      // Click btn-less trước (decrement về minimum), rồi btn-more (increment lên 1)
      // => price hiển thị chắc chắn là giá cho 1 người
      run(`click "[data-agent='btn-less-${i}']"`);
      await sleep(500);
      run(`click "[data-agent='btn-more-${i}']"`);
      await sleep(3000);

      console.log('done.');
    }
  } else {
    console.log('  - All prices are already loaded.');
  }

  // ---------------------------------------------------------
  // 6C. Snapshot DOM - extract all prices at once
  // ---------------------------------------------------------
  console.log('Extracting final data...');

  const extractScript = `new Promise((resolve) => {
    function fmtPrice(n) {
      return n.toString().replace(/(\\d)(?=(\\d{3})+(?!\\d))/g, '$1.') + ' ';
    }

    var data = {};
    var boxes = document.querySelectorAll('.panel-open .tkn__quantity--box');

    boxes.forEach(function(box) {
      var nameEl = box.querySelector('.name');
      var priceEl = box.querySelector('.price-panel');
      var qtyEl = box.querySelector('.quantity');

      if (nameEl && priceEl) {
        var key = nameEl.textContent.trim().replace(/\\s+/g, ' ');
        var value = priceEl.textContent.trim();
        var qty = qtyEl ? parseInt(qtyEl.textContent.trim(), 10) : 1;

        // Neu qty > 1 nghia la btn-less bi disable, nen phai chia cho qty
        if (value && qty > 1) {
          var m = value.match(/([\\d.]+)/);
          if (m) {
            var total = parseInt(m[1].replace(/\\./g, ''), 10);
            if (total > 0) {
              value = fmtPrice(Math.round(total / qty));
            }
          }
        }

        if (key) {
          data[key] = value || 'Khong tai duoc gia';
        }
      }
    });
    resolve(data);
  });`;

  const data = runEvalStdin(extractScript);

  if (!data) {
    console.log('No output received from extract script.');
    return;
  }

  // ---------------------------------------------------------
  // 7. Display results
  // ---------------------------------------------------------
  console.log('');
  const entries = Object.entries(data);
  if (entries.length === 0) {
    console.log('No items extracted from panel.');
    return;
  }

  console.log('Extracted items:');
  const results = [];
  entries.forEach(([name, price], i) => {
    const ap = parsePrice(price);
    const display = ap
      ? ap.toLocaleString('vi-VN') + 'd'
      : price || 'N/A';
    console.log(`  ${i + 1}. ${name}: ${display}`);
    results.push({ tierName: name, adultPrice: ap });
  });

  // 8. Save report
  fs.writeFileSync(REPORT, JSON.stringify(results, null, 2));
  const ok = results.filter((r) => r.adultPrice).length;
  console.log(
    `\nDone: ${results.length} items, ${ok} with price. Report: ${REPORT}`,
  );
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
