import { initSession, openPage, evaluate, closeSession } from './.agents/lib/browser-automation.mjs';

async function test() {
  await initSession();
  try {
    console.log("Opening page...");
    await openPage('https://www.ivivu.com/ve-vui-choi/hoat-dong/ve-sun-world-ba-na-hills/21619');
    
    // Wait for render
    await new Promise(r => setTimeout(r, 5000));
    
    // Test exact script from V2
    const script = `(() => {
      var btns = document.querySelectorAll('button, a, [role="button"]');
      var count = 0;
      var matches = [];
      for (var i = 0; i < btns.length; i++) {
        var t = (btns[i].textContent || '').trim();
        var c = typeof btns[i].className === 'string' && btns[i].className.includes('btn-choose');
        if (t.startsWith('Chọn') || c) {
          count++;
          matches.push(t);
        }
      }
      return JSON.stringify({count: count, matches: matches});
    })()`;
    
    const result = await evaluate(script);
    console.log('Evaluate result:', result);
  } finally {
    await closeSession();
  }
}
test().catch(console.error);