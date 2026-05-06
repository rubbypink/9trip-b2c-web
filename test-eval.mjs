import { evaluate } from './.agents/lib/browser-automation.mjs';

async function run() {
  const btnCountRaw = await evaluate(
    '(() => {' +
    'var btns = document.querySelectorAll("button, a, [role=\\"button\\"]");' +
    'var count = 0;' +
    'for (var i = 0; i < btns.length; i++) {' +
    '  var t = (btns[i].textContent || "").trim();' +
    '  var c = typeof btns[i].className === "string" && btns[i].className.includes("btn-choose");' +
    '  if (t.startsWith("Chọn") || c) count++;' +
    '}' +
    'return count;' +
    '})()'
  );
  console.log("btnCountRaw:", JSON.stringify(btnCountRaw));
  console.log("parseInt:", parseInt(btnCountRaw, 10));
  
  // Let's also check if there's a regex match for the number
  const match = String(btnCountRaw).match(/(\d+)$/);
  console.log("match:", match ? parseInt(match[1], 10) : 0);
}

run();
