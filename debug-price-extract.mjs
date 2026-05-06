import { initSession, openPage, evaluate, closeSession } from './.agents/lib/browser-automation.mjs';
import fs from 'fs';

async function debug() {
  await initSession();
  try {
    await openPage('https://www.ivivu.com/ve-vui-choi/hoat-dong/ve-sun-world-ba-na-hills/21619');
    await new Promise(r => setTimeout(r, 4000));
    
    // Click the SECOND button (first real tier)
    await evaluate(`(() => {
      var btns = document.querySelectorAll('button, a, [role="button"]');
      var chooseBtns = [];
      for (var j = 0; j < btns.length; j++) {
        var t = (btns[j].textContent || '').trim();
        var c = typeof btns[j].className === 'string' && btns[j].className.includes('btn-choose');
        if (t.startsWith('Chọn') || c) chooseBtns.push(btns[j]);
      }
      if (chooseBtns[1]) {
        chooseBtns[1].scrollIntoView({ behavior: 'instant', block: 'center' });
        chooseBtns[1].click();
        return 'clicked tier 1';
      }
      return 'no button';
    })()`);
    
    await new Promise(r => setTimeout(r, 1500));
    
    // Click btn-more
    await evaluate(`(async () => {
      var mores = document.querySelectorAll('.btn-more, [class*="btn-more"]');
      var visibleMores = [];
      for (var k = 0; k < mores.length; k++) {
        if (mores[k].offsetParent !== null) visibleMores.push(mores[k]);
      }
      for (var m = 0; m < visibleMores.length; m++) {
        visibleMores[m].click();
        if (m < visibleMores.length - 1) await new Promise(r => setTimeout(r, 100));
      }
      await new Promise(r => setTimeout(r, 500));
      return 'clicked ' + visibleMores.length + ' mores';
    })()`);
    
    await new Promise(r => setTimeout(r, 1000));
    
    // Get expanded content
    const result = await evaluate(`(() => {
      // Try to find the expanded/clicked card
      var clickedBtn = null;
      var btns = document.querySelectorAll('button, a, [role="button"]');
      for (var i = 0; i < btns.length; i++) {
        var t = (btns[i].textContent || '').trim();
        if (t.startsWith('Chọn') && btns[i].offsetParent !== null) {
          // Find a button that is near expanded content
          var card = btns[i].closest('[class*="card"], [class*="item"], [class*="package"], [class*="tier"]');
          if (card) {
            // Check if this card has expanded content
            var nextEl = card.nextElementSibling;
            if (nextEl && (nextEl.className.includes('expand') || nextEl.className.includes('detail') || nextEl.innerText.length > 200)) {
              return {
                type: 'nextSibling',
                text: nextEl.innerText.substring(0, 2000),
                html: nextEl.innerHTML.substring(0, 3000)
              };
            }
            // Check inside the card
            var details = card.querySelector('[class*="detail"], [class*="content"], [class*="body"]');
            if (details) {
              return {
                type: 'insideCard',
                text: details.innerText.substring(0, 2000),
                html: details.innerHTML.substring(0, 3000)
              };
            }
          }
        }
      }
      
      // Fallback: look for any expanded content
      var expanded = document.querySelector('[class*="expand"]:not([style*="display: none"]), [class*="active"][class*="card"], .tkn__quantity--box, [class*="modal"]:not([style*="display: none"])');
      if (expanded) {
        return {
          type: 'expandedSelector',
          text: expanded.innerText.substring(0, 2000),
          html: expanded.innerHTML.substring(0, 3000)
        };
      }
      
      return { type: 'not found', text: '', html: '' };
    })()`);
    
    console.log('Result type:', result.type);
    console.log('Text preview:', result.text.substring(0, 500));
    console.log('\n--- Price extraction test ---');
    
    const text = result.text || '';
    const priceMatches = text.match(/\d{1,3}(?:[.,]\d{3})+/g) || [];
    console.log('Found price patterns:', priceMatches.slice(0, 10));
    
    const prices = priceMatches.map(p => parseInt(p.replace(/[.,]/g, ''), 10)).filter(p => p > 10000);
    console.log('Parsed prices:', [...new Set(prices)].slice(0, 10));
    
  } finally {
    await closeSession();
  }
}

debug().catch(console.error);