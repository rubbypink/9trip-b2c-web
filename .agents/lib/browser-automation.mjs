/**
 * Browser Automation Module — wrapper around agent-browser CLI for lazy rendering support.
 * 
 * Provides helper functions to:
 * - Navigate to pages
 * - Click elements to reveal lazy content
 * - Extract data after interactions
 * - Handle complex multi-step interactions
 * 
 * @module browser-automation
 * @version 1.0.0
 */

import { execSync, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

// ============================================================================
// Session Management
// ============================================================================

let currentSession = null;
let sessionCounter = 0;

function generateSessionName() {
  sessionCounter++;
  return `scrape-session-${Date.now()}-${sessionCounter}`;
}

export async function initSession(options = {}) {
  const sessionName = options.sessionName || generateSessionName();
  currentSession = sessionName;
  process.env.AGENT_BROWSER_SESSION_NAME = sessionName;
  
  return {
    sessionName,
    startedAt: new Date().toISOString(),
  };
}

export async function closeSession() {
  if (!currentSession) return;
  try {
    await runCommand('close', ['--all']);
  } catch (e) {
    // Session might already be closed
  }
  currentSession = null;
  delete process.env.AGENT_BROWSER_SESSION_NAME;
}

// ============================================================================
// Command Execution
// ============================================================================

async function runCommand(command, args = [], options = {}) {
  const cmd = `agent-browser ${command} ${args.join(' ')}`;
  
  const execOptions = {
    timeout: options.timeout || 600000, // 10 minutes default
    env: {
      ...process.env,
      AGENT_BROWSER_SESSION_NAME: currentSession || generateSessionName(),
    },
  };
  
  try {
    const { stdout, stderr } = await execAsync(cmd, execOptions);
    return stdout || stderr;
  } catch (error) {
    if (options.throwOnError !== false) {
      throw new Error(`agent-browser command failed: ${error.message}`);
    }
    return error.stdout || error.stderr || '';
  }
}

function runCommandSync(command, args = []) {
  const cmd = `agent-browser ${command} ${args.join(' ')}`;
  
  try {
    return execSync(cmd, {
      encoding: 'utf-8',
      timeout: 600000, // 10 minutes
      env: {
        ...process.env,
        AGENT_BROWSER_SESSION_NAME: currentSession || generateSessionName(),
      },
    });
  } catch (error) {
    throw new Error(`agent-browser sync command failed: ${error.message}`);
  }
}

// ============================================================================
// Navigation & Basic Operations
// ============================================================================

export async function openPage(url, options = {}) {
  const args = [url];
  if (options.waitForLoad !== false) {
    args.push('--wait-for-load');
  }
  
  const output = await runCommand('open', args);
  
  return {
    url,
    opened: true,
    output,
  };
}

export async function getSnapshot(options = {}) {
  const args = [];
  
  if (options.interactiveOnly !== false) {
    args.push('-i');
  }
  if (options.compact !== false) {
    args.push('-c');
  }
  if (options.depth) {
    args.push('-d', String(options.depth));
  }
  if (options.selector) {
    args.push('-s', options.selector);
  }
  
  const output = await runCommand('snapshot', args);
  
  // Parse snapshot to extract refs
  const refs = parseSnapshotRefs(output);
  
  return {
    raw: output,
    refs,
    hasContent: output.includes('@e'),
  };
}

function parseSnapshotRefs(snapshot) {
  const refs = [];
  const lines = snapshot.split('\n');
  
  for (const line of lines) {
    const match = line.match(/(@e\d+)\s*\[([^\]]+)\]\s*["']?([^"']+)?["']?/);
    if (match) {
      refs.push({
        ref: match[1],
        type: match[2].trim(),
        text: (match[3] || '').trim(),
      });
    }
  }
  
  return refs;
}

// ============================================================================
// Element Interactions
// ============================================================================

export async function clickElement(ref, options = {}) {
  const args = [ref];
  
  if (options.newTab) {
    args.push('--new-tab');
  }
  
  try {
    await runCommand('click', args, { timeout: options.timeout || 10000 });
    return true;
  } catch (e) {
    if (options.optional) {
      return false;
    }
    throw e;
  }
}

export async function clickByText(text, options = {}) {
  const args = ['text', `"${text}"`, 'click'];
  
  if (options.exact) {
    args.push('--exact');
  }
  
  try {
    await runCommand('find', args, { timeout: options.timeout || 10000 });
    return true;
  } catch (e) {
    if (options.optional) {
      return false;
    }
    throw e;
  }
}

export async function clickByRole(role, name) {
  try {
    await runCommand('find', ['role', role, 'click', '--name', name], { timeout: 10000 });
    return true;
  } catch (e) {
    return false;
  }
}

export async function fillInput(ref, value) {
  try {
    await runCommand('fill', [ref, value]);
    return true;
  } catch (e) {
    return false;
  }
}

export async function scroll(direction, amount) {
  try {
    await runCommand('scroll', [direction, String(amount)]);
    return true;
  } catch (e) {
    return false;
  }
}

export async function scrollIntoView(ref) {
  try {
    await runCommand('scrollintoview', [ref]);
    return true;
  } catch (e) {
    return false;
  }
}

// ============================================================================
// Waiting
// ============================================================================

export async function waitForElement(ref, timeout = 25000) {
  try {
    await runCommand('wait', [ref], { timeout });
    return true;
  } catch (e) {
    return false;
  }
}

export async function waitForText(text, timeout = 25000) {
  try {
    await runCommand('wait', ['--text', text], { timeout });
    return true;
  } catch (e) {
    return false;
  }
}

export async function waitForUrl(pattern, timeout = 25000) {
  try {
    await runCommand('wait', ['--url', pattern], { timeout });
    return true;
  } catch (e) {
    return false;
  }
}

export async function waitForNetworkIdle(timeout = 25000) {
  try {
    await runCommand('wait', ['--load', 'networkidle'], { timeout });
    return true;
  } catch (e) {
    return false;
  }
}

export async function sleep(ms) {
  await runCommand('wait', [String(ms)], { timeout: ms + 5000 });
}

export async function waitForFunction(fn, timeout = 25000) {
  try {
    await runCommand('wait', ['--fn', fn], { timeout });
    return true;
  } catch (e) {
    return false;
  }
}

export async function batch(commands) {
  const tmpFile = path.join(os.tmpdir(), `batch-${Date.now()}.json`);
  try {
    fs.writeFileSync(tmpFile, JSON.stringify(commands), 'utf-8');
    const output = await runCommand('batch', ['--file', tmpFile]);
    try {
      return JSON.parse(output);
    } catch {
      return output;
    }
  } finally {
    try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
  }
}

export async function elementExists(selector) {
  try {
    const output = await runCommand('get', ['count', selector]);
    const count = parseInt(output.trim(), 10);
    return !isNaN(count) && count > 0;
  } catch {
    return false;
  }
}

export async function takeAnnotatedScreenshot(path) {
  try {
    const output = await runCommand('screenshot', ['--annotate', '--path', path]);
    return output;
  } catch (e) {
    return null;
  }
}

// ============================================================================
// Retry & Stable Wait Helpers
// ============================================================================

export async function clickWithRetry(ref, options = {}) {
  const maxRetries = 3;
  const delayMs = 1000;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await clickElement(ref, options);
    } catch (e) {
      if (attempt === maxRetries) throw e;
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  return false;
}

export async function clickByTextWithRetry(text, options = {}) {
  const maxRetries = 3;
  const delayMs = 1000;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await clickByText(text, options);
      if (result) return result;
    } catch (e) {
      if (attempt === maxRetries) throw e;
    }
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  return false;
}

export async function waitForStableContent(timeout = 10000) {
  const intervalMs = 500;
  const startTime = Date.now();
  let lastLength = null;
  let stableCount = 0;

  while (Date.now() - startTime < timeout) {
    const currentLength = await evaluate('document.body.innerText.length');
    const length = parseInt(currentLength, 10);

    if (length === lastLength) {
      stableCount++;
      if (stableCount >= 2) return true;
    } else {
      stableCount = 0;
      lastLength = length;
    }

    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  return false;
}

// ============================================================================
// Data Extraction
// ============================================================================

export async function getText(ref) {
  try {
    return await runCommand('get', ['text', ref]);
  } catch (e) {
    return '';
  }
}

export async function getHtml(ref) {
  try {
    return await runCommand('get', ['html', ref]);
  } catch (e) {
    return '';
  }
}

export async function getAttribute(ref, attr) {
  try {
    return await runCommand('get', ['attr', ref, attr]);
  } catch (e) {
    return '';
  }
}

export async function getTitle() {
  try {
    return await runCommand('get', ['title']);
  } catch (e) {
    return '';
  }
}

export async function getUrl() {
  try {
    return await runCommand('get', ['url']);
  } catch (e) {
    return '';
  }
}

export async function evaluate(script) {
  try {
    return await runCommand('eval', [script], { timeout: 30000 });
  } catch (e) {
    return null;
  }
}

// ============================================================================
// Lazy Rendering Helpers
// ============================================================================

export async function revealLazyContent(options = {}) {
  const clicked = [];
  const { selectors = [], texts = [], waitAfterClick = true } = options;
  
  for (const text of texts) {
    const success = await clickByText(text, { optional: true, timeout: 5000 });
    if (success) {
      clicked.push(`text:${text}`);
      if (waitAfterClick) {
        await waitForNetworkIdle(5000);
      }
    }
  }
  
  return {
    success: clicked.length > 0,
    clicked,
  };
}

export async function extractWithInteractions(url, steps = []) {
  const snapshots = [];
  
  await initSession();
  
  try {
    await openPage(url);
    await waitForNetworkIdle();
    
    let snapshot = await getSnapshot();
    snapshots.push({ step: 'initial', snapshot });
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      
      try {
        switch (step.action) {
          case 'click':
            if (step.text) {
              await clickByText(step.text, { optional: step.optional });
            }
            break;
            
          case 'scroll':
            await scroll(step.direction || 'down', step.amount || 500);
            break;
            
          case 'wait':
            if (step.text) {
              await waitForText(step.text, step.timeout || 10000);
            } else if (step.ms) {
              await sleep(step.ms);
            } else {
              await waitForNetworkIdle(step.timeout || 10000);
            }
            break;
        }
        
        snapshot = await getSnapshot();
        snapshots.push({ step: i, action: step.action, snapshot });
        
      } catch (e) {
        if (!step.optional) {
          throw e;
        }
        snapshots.push({ step: i, action: step.action, error: e.message });
      }
    }
    
    const pageText = await evaluate('document.body.innerText');
    const pageTitle = await evaluate('document.title');
    const pageUrl = await evaluate('document.location.href');
    
    return {
      url,
      snapshots,
      data: {
        bodyText: pageText || '',
        title: pageTitle || '',
        url: pageUrl || url,
      },
      success: true,
    };
    
  } finally {
    await closeSession();
  }
}

// ============================================================================
// Domain-Specific Helpers
// ============================================================================

export async function extractIvivuTour(url) {
  const steps = [
    { action: 'click', text: 'Đồng ý', optional: true },
    { action: 'click', text: 'Accept', optional: true },
    { action: 'scroll', direction: 'down', amount: 800 },
    { action: 'wait' }, // waitForNetworkIdle
    { action: 'click', text: 'Xem tất cả', optional: true },
    { action: 'wait' }, // waitForNetworkIdle
    { action: 'click', text: 'Trẻ em', optional: true },
    { action: 'wait' }, // waitForNetworkIdle
    { action: 'click', text: 'Em bé', optional: true },
    { action: 'wait' }, // waitForNetworkIdle
  ];
  
  const result = await extractWithInteractions(url, steps);
  
  if (result.data && result.data.bodyText) {
    const bodyText = result.data.bodyText;
    
    const childPriceMatch = bodyText.match(/trẻ em[^\\d]*(\\d[\\d.,]*)\\s*đ/i);
    const infantPriceMatch = bodyText.match(/em bé[^\\d]*(\\d[\\d.,]*)\\s*đ/i);
    
    result.pricing = {
      childPrice: childPriceMatch ? parseInt(childPriceMatch[1].replace(/[.,]/g, '')) : null,
      infantPrice: infantPriceMatch ? parseInt(infantPriceMatch[1].replace(/[.,]/g, '')) : null,
    };
    
    const itinerary = [];
    const dayPattern = /Ngày\\s*(\\d+)[:\\s]*([^\\n]+)/gi;
    let match;
    while ((match = dayPattern.exec(bodyText)) !== null) {
      itinerary.push({
        day: parseInt(match[1]),
        title: match[2].trim(),
      });
    }
    result.itinerary = itinerary;
  }
  
  return result;
}

export async function extractBookingHotel(url) {
  await initSession();
  try {
    await openPage(url);
    await waitForNetworkIdle();

    // Batch: dismiss cookie banner + scroll to load rooms
    await batch([
      { action: 'click', text: 'Accept', optional: true },
      { action: 'scroll', direction: 'down', amount: 1000 },
    ]);
    await waitForNetworkIdle();

    // Click Photos to open gallery, wait for close button to confirm it opened
    await clickByText('Photos', { optional: true });
    await waitForText('×', 5000);

    // Close gallery
    await clickByText('Close', { optional: true });

    const pageText = await evaluate('document.body.innerText');
    const pageTitle = await evaluate('document.title');
    const pageUrl = await evaluate('document.location.href');

    return {
      url,
      data: {
        bodyText: pageText || '',
        title: pageTitle || '',
        url: pageUrl || url,
      },
      success: true,
    };
  } finally {
    await closeSession();
  }
}

/**
 * Extract child prices per pricing tier by interacting with the booking form.
 * For each tier, clicks "Chọn", reads the per-child price from "Trẻ em" row,
 * then resets by clicking "-" before moving to the next tier.
 *
 * @param {Array<{name: string}>} tierInfo - Array of tier objects with name property
 * @returns {Promise<{childPrices: Object, childPricing: Object}>}
 */
export async function extractChildPricesPerTier(tierInfo = []) {
  const childPrices = {};
  const childPricing = {};

  for (let i = 0; i < Math.min(tierInfo.length, 10); i++) {
    const tierName = tierInfo[i]?.name || '';

    // Click "Chọn" button for this specific tier (containing tier name substring)
    let clicked = false;
    if (tierName) {
      clicked = await clickByText(`Chọn ${tierName}`, { optional: true, timeout: 3000 });
    }
    if (!clicked) {
      // Fallback: click the i-th "Chọn" button via evaluate
      const clickIdx = await evaluate(
        `(()=>{var b=Array.from(document.querySelectorAll("button,[role=\\"button\\"],a")).filter(function(e){return(e.textContent||"").trim().startsWith("Chọn")});if(b[${i}]){b[${i}].click();return ${i}}return -1})()`
      );
      clicked = clickIdx !== null && clickIdx !== '-1' && clickIdx !== 'null';
    }

    if (!clicked) continue;

    await waitForNetworkIdle(2000);

    // Click "+" for "Trẻ em" to add 1 child
    await evaluate(
      `(()=>{var c=document.querySelectorAll("[class*=\\"qty\\"],[class*=\\"quantity\\"],[class*=\\"counter\\"],[class*=\\"stepper\\"],[class*=\\"person\\"],[class*=\\"guest\\"]");for(var i=0;i<c.length;i++){if(c[i].textContent.includes("Trẻ em")){var b=c[i].querySelectorAll("button,[role=\\"button\\"]");for(var j=0;j<b.length;j++){if(b[j].textContent.trim()==="+"||b[j].className.includes("plus")||b[j].className.includes("increase")){b[j].click();return}}}}})()`
    );

    await waitForNetworkIdle(1000);

    // Extract per-child price from "Trẻ em" row — only digits, . and , (NOT "Tổng tiền")
    const priceResult = await evaluate(
      `(()=>{var e=document.querySelectorAll("[class*=\\"qty\\"],[class*=\\"quantity\\"],[class*=\\"counter\\"],[class*=\\"stepper\\"],[class*=\\"person\\"],[class*=\\"guest\\"],[class*=\\"row\\"],tr");for(var i=0;i<e.length;i++){if(e[i].textContent.includes("Trẻ em")&&!e[i].textContent.includes("Tổng tiền")){var m=e[i].textContent.match(/[\\d][\\d.,]*/g);if(m&&m.length>0)return m[0]}}return null})()`
    );

    if (priceResult && priceResult !== 'null') {
      const price = parseInt(priceResult.replace(/[.,]/g, ''), 10);
      if (!isNaN(price) && price > 0) {
        childPrices[i] = { childPrice: price };
      }
    }

    // Click "-" to reset quantity before moving to next tier
    await evaluate(
      `(()=>{var c=document.querySelectorAll("[class*=\\"qty\\"],[class*=\\"quantity\\"],[class*=\\"counter\\"],[class*=\\"stepper\\"],[class*=\\"person\\"],[class*=\\"guest\\"]");for(var i=0;i<c.length;i++){if(c[i].textContent.includes("Trẻ em")){var b=c[i].querySelectorAll("button,[role=\\"button\\"]");for(var j=0;j<b.length;j++){if(b[j].textContent.trim()==="-"||b[j].textContent.includes("−")||b[j].className.includes("minus")||b[j].className.includes("decrease")){b[j].click();return}}}}})()`
    );

    await waitForNetworkIdle(500);
  }

  // Extract flat child pricing from page text
  const childPriceText = await evaluate(
    `(function(){var m=document.body.innerText.match(/trẻ\\s*em[^\\d]*([\\d.,]+)\\s*đ/i);return m?m[1]:null})()`
  );
  if (childPriceText && childPriceText !== 'null') {
    const price = parseInt(childPriceText.replace(/[.,]/g, ''), 10);
    if (!isNaN(price)) childPricing.childPrice = price;
  }

  const infantPriceText = await evaluate(
    `(function(){var m=document.body.innerText.match(/em\\s*bé[^\\d]*([\\d.,]+)\\s*đ/i);return m?m[1]:null})()`
  );
  if (infantPriceText && infantPriceText !== 'null') {
    const price = parseInt(infantPriceText.replace(/[.,]/g, ''), 10);
    if (!isNaN(price)) childPricing.infantPrice = price;
  }

  const seniorPriceText = await evaluate(
    `(function(){var m=document.body.innerText.match(/người\\s*cao\\s*tuổi[^\\d]*([\\d.,]+)\\s*đ/i);return m?m[1]:null})()`
  );
  if (seniorPriceText && seniorPriceText !== 'null') {
    const price = parseInt(seniorPriceText.replace(/[.,]/g, ''), 10);
    if (!isNaN(price)) childPricing.seniorPrice = price;
  }

  return { childPrices, childPricing };
}

/**
 * Extract activity page data with proper wait strategies.
 * Uses batch for cookie+scroll, clickByTextWithRetry for expandable sections,
 * waitForNetworkIdle/waitForText/waitForStableContent instead of sleep.
 * Also extracts per-tier child prices via extractChildPricesPerTier.
 * @param {string} url - URL of the activity page
 * @returns {Promise<Object>} Extracted page data including childPrices and childPricing
 */
export async function extractActivityPage(url) {
  await initSession();
  try {
    await openPage(url);
    await waitForNetworkIdle(3000);

    // Batch: accept cookie + scroll to reveal lazy content
    await batch([
      { action: 'click', text: 'Đồng ý', optional: true },
      { action: 'click', text: 'Accept', optional: true },
      { action: 'scroll', direction: 'down', amount: 800 },
    ]);
    await waitForStableContent(2000);

    // Click expandable sections with retry
    await clickByTextWithRetry('Xem tất cả', { optional: true, timeout: 5000 });
    await waitForStableContent(2000);

    await clickByTextWithRetry('Trẻ em', { optional: true, timeout: 5000 });
    await clickByTextWithRetry('Em bé', { optional: true, timeout: 5000 });

    // Click "Chọn gói dịch vụ" then wait for pricing text
    await clickByTextWithRetry('Chọn gói dịch vụ', { optional: true, timeout: 5000 });
    await waitForText('Vé', 5000);

    // Extract tier info from the page for per-tier child pricing
    const tierInfoRaw = await evaluate(
      `(()=>{var t=[];var e=document.querySelectorAll("[class*=\\"tier\\"],[class*=\\"package\\"],[class*=\\"option\\"],[class*=\\"price\\"],[class*=\\"plan\\"]");for(var i=0;i<e.length;i++){var n=e[i].querySelector("[class*=\\"name\\"],[class*=\\"title\\"],h3,h4,h5");if(n)t.push({name:n.textContent.trim()})}if(t.length===0){var b=Array.from(document.querySelectorAll("button,[role=\\"button\\"],a")).filter(function(x){return(x.textContent||"").trim().startsWith("Chọn")});for(var j=0;j<b.length;j++){var p=b[j].closest("[class*=\\"tier\\"],[class*=\\"package\\"],[class*=\\"option\\"],[class*=\\"price\\"],[class*=\\"card\\"],[class*=\\"item\\"]");var tn=p?p.querySelector("[class*=\\"name\\"],[class*=\\"title\\"],h3,h4,h5"):null;t.push({name:tn?tn.textContent.trim():"Tier "+(j+1)})}}return JSON.stringify(t)})()`
    );

    let tierInfo = [];
    try {
      tierInfo = JSON.parse(tierInfoRaw || '[]');
    } catch (e) {
      tierInfo = [];
    }

    // Extract per-tier child prices
    let childPrices = {};
    let childPricing = {};
    try {
      const childPriceData = await extractChildPricesPerTier(tierInfo);
      childPrices = childPriceData.childPrices;
      childPricing = childPriceData.childPricing;
    } catch (e) {
      // Continue even if child price extraction fails
    }

    const pageText = await evaluate('document.body.innerText');
    const pageTitle = await evaluate('document.title');
    const pageUrl = await evaluate('document.location.href');

    return {
      url,
      data: {
        bodyText: pageText || '',
        title: pageTitle || '',
        url: pageUrl || url,
      },
      childPrices,
      childPricing,
      success: true,
    };
  } finally {
    await closeSession();
  }
}

/**
 * Find and click price buttons on a page, using waitForNetworkIdle
 * instead of sleep for proper wait handling.
 * @param {Object} [options] - Options for clicking price buttons
 * @param {string[]} [options.priceTexts] - Text labels of price buttons to click
 * @returns {Promise<Object>} Result with clicked buttons and page data
 */
export async function findAndClickPriceButtons(options = {}) {
  const { priceTexts = ['Xem giá', 'Xem giá và đặt', 'Đặt ngay', 'Chọn'] } = options;
  const clicked = [];

  for (const text of priceTexts) {
    const success = await clickByTextWithRetry(text, { optional: true, timeout: 5000 });
    if (success) {
      clicked.push(text);
      await waitForNetworkIdle(3000);
    }
  }

  const pageText = await evaluate('document.body.innerText');
  const pageTitle = await evaluate('document.title');

  return {
    clicked,
    data: {
      bodyText: pageText || '',
      title: pageTitle || '',
    },
    success: clicked.length > 0,
  };
}

export async function healthCheck() {
  try {
    const output = await runCommand('doctor', ['--quick'], { timeout: 30000 });
    return {
      healthy: !output.includes('fail') && !output.includes('error'),
      output,
    };
  } catch (e) {
    return {
      healthy: false,
      output: e.message,
    };
  }
}

export default {
  initSession,
  closeSession,
  openPage,
  getSnapshot,
  clickElement,
  clickByText,
  clickByRole,
  fillInput,
  scroll,
  scrollIntoView,
  waitForElement,
  waitForText,
  waitForUrl,
  waitForNetworkIdle,
  waitForFunction,
  sleep,
  batch,
  elementExists,
  takeAnnotatedScreenshot,
  clickWithRetry,
  clickByTextWithRetry,
  waitForStableContent,
  getText,
  getHtml,
  getAttribute,
  getTitle,
  getUrl,
  evaluate,
  revealLazyContent,
  extractWithInteractions,
  extractIvivuTour,
  extractBookingHotel,
  extractActivityPage,
  extractChildPricesPerTier,
  findAndClickPriceButtons,
  healthCheck,
};
