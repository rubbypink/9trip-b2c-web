import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://www.ivivu.com/ve-vui-choi/hoat-dong/ve-sun-world-ba-na-hills/21619', { waitUntil: 'networkidle' });
  
  const result = await page.evaluate(() => {
    var btns = document.querySelectorAll(".btn-select, [class*=\"btn-select\"], button.btn-primary");
    var count = 0;
    var texts = [];
    for (var i = 0; i < btns.length; i++) {
      if (btns[i].innerText && btns[i].innerText.toLowerCase().includes("chọn")) {
        count++;
        texts.push(btns[i].innerText);
      }
    }
    
    var allBtns = document.querySelectorAll("button");
    var allTexts = [];
    for (var i = 0; i < allBtns.length; i++) {
      if (allBtns[i].innerText && allBtns[i].innerText.toLowerCase().includes("chọn")) {
        allTexts.push({ text: allBtns[i].innerText, className: allBtns[i].className });
      }
    }
    
    return { count, texts, totalBtns: btns.length, allTexts };
  });
  
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
}

run();
