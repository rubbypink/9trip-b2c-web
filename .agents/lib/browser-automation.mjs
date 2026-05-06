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
    { action: 'wait', ms: 1000 },
    { action: 'click', text: 'Xem tất cả', optional: true },
    { action: 'wait', ms: 1500 },
    { action: 'click', text: 'Trẻ em', optional: true },
    { action: 'wait', ms: 1000 },
    { action: 'click', text: 'Em bé', optional: true },
    { action: 'wait', ms: 1000 },
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
  const steps = [
    { action: 'click', text: 'Accept', optional: true },
    { action: 'scroll', direction: 'down', amount: 1000 },
    { action: 'wait', ms: 2000 },
    { action: 'click', text: 'Photos', optional: true },
    { action: 'wait', ms: 2000 },
    { action: 'click', text: 'Close', optional: true },
  ];
  
  return await extractWithInteractions(url, steps);
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
  sleep,
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
  healthCheck,
};
