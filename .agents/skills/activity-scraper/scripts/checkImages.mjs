import https from 'https';
import { fetchHtml, unescapeHtml } from '../../../lib/scrape-helpers.mjs';



async function run() {
  const url = 'https://www.ivivu.com/ve-vui-choi/hoat-dong/ve-sun-world-ba-na-hills/21619';
  const html = await fetchHtml(url);
  
  const scriptTag = '<script id="appid01-state" type="application/json">';
  const sIdx = html.indexOf(scriptTag);
  const eIdx = html.indexOf("</script>", sIdx);
  
  const raw = html.substring(sIdx + scriptTag.length, eIdx);
  const clean = unescapeHtml(raw);
  const stateData = JSON.parse(clean);
  
  const keys = Object.keys(stateData);
  const dataKey = keys.find((k) => k.includes("GetExperienceDetail"));
  const expData = stateData[dataKey].data.experience;
  
  console.log("Images:", expData.images);
  console.log("Gallery:", expData.gallery);
  console.log("Pictures:", expData.pictures);
}

run().catch(console.error);
