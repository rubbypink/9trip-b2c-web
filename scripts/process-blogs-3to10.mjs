/**
 * MEGA BATCH BLOG PIPELINE — Process blogs #3-#10 end-to-end.
 * Download images → optimize webp → upload Storage → save Firestore.
 * All in one shot. Use COMPANY_FOOTER for consistent branding.
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const serviceAccountPath = path.resolve(projectRoot, 'tripphuquoc-db-fs-firebase-adminsdk-fbsvc-5695f7d555.json');
const tempDir = '/tmp/media-optimizer';

// ─────────────────────────────────────────────────────────────────────────────
// Firebase Init
// ─────────────────────────────────────────────────────────────────────────────

if (!admin.apps.length) {
  const sa = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
  if (sa.privateKey) sa.privateKey = sa.privateKey.replace(/\\n/g, '\n');
  admin.initializeApp({ credential: admin.credential.cert(sa), storageBucket: 'tripphuquoc-db-fs.firebasestorage.app' });
}
const db = admin.firestore();
const bucket = admin.storage().bucket();

// ─────────────────────────────────────────────────────────────────────────────
// Shared constants
// ─────────────────────────────────────────────────────────────────────────────

const CF = `
  <p style="text-align:center; font-size:0.85rem; color:#6b7280; margin-top:0.5rem;">
    <strong>Công ty TNHH 9 Trip Phú Quốc</strong> — 17 Chu Văn An, Khu Phố 5, đặc khu Phú Quốc, An Giang<br>
    MST: 1702261981
  </p>`;

const FOOTER = `
  <p style="text-align:center; font-style:italic; border-top:1px solid #e5e7eb; padding-top:2rem; margin-top:3rem;">
    ✈️ <strong>Cùng 9 Trip Phú Quốc — khám phá đảo Ngọc theo cách trọn vẹn nhất!</strong><br>
    📞 Hotline: <strong>0877.901.901</strong> | 🌐 <a href="https://9tripphuquoc.com">9tripphuquoc.com</a><br>
    📧 Email: <strong>info@9tripphuquoc.com</strong>
  </p>
  ${CF}`;

// ─────────────────────────────────────────────────────────────────────────────
// Image processing helpers
// ─────────────────────────────────────────────────────────────────────────────

async function dl(url, dest) {
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.google.com/' } });
  if (!r.ok) throw new Error(`${r.status}`);
  fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
}

async function opt(input, output, w = 800) {
  await sharp(input).resize({ width: w, withoutEnlargement: true }).webp({ quality: 82, effort: 6 }).toFile(output);
  const oS = fs.statSync(output), iS = fs.statSync(input);
  return { okb: Math.round(oS.size / 1024), ikb: Math.round(iS.size / 1024), ratio: Math.round((1 - oS.size / iS.size) * 100) };
}

async function upload(local, spath) {
  await bucket.upload(local, { destination: spath, metadata: { contentType: 'image/webp', cacheControl: 'public, max-age=31536000, immutable' } });
  const [url] = await bucket.file(spath).getSignedUrl({ action: 'read', expires: Date.now() + 365 * 86400000 });
  return url;
}

async function processImages(slug, imgs) {
  const map = {}; let feat = null;
  for (const img of imgs) {
    const rp = path.join(tempDir, `${slug}_${img.id}_raw`), wp = path.join(tempDir, `${slug}_${img.id}.webp`);
    try {
      await dl(img.url, rp);
      const s = await opt(rp, wp, img.w || 800);
      const sp = `blogs/${slug}/${img.id}.webp`;
      const url = await upload(wp, sp);
      fs.unlinkSync(rp); fs.unlinkSync(wp);
      map[img.ph] = url;
      if (img.role === 'feat') feat = url;
      console.log(`    ✅ ${img.id}: ${s.okb}KB (${s.ratio}%)`);
    } catch (e) { console.error(`    ❌ ${img.id}: ${e.message}`); }
  }
  return { map, feat };
}

function resolve(html, map) { let r = html; for (const [k, v] of Object.entries(map)) r = r.replaceAll(k, v); return r; }

async function saveBlog(slug, data) {
  await db.collection('blogs').doc(slug).set({
    ...data,
    author: '9 Trip Phú Quốc',
    status: 'published',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log(`  💾 Saved: blogs/${slug} (${data.content.length} chars)`);
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOG #3 — PhuQuocGo — Cẩm Nang Thực Chiến
// ─────────────────────────────────────────────────────────────────────────────

const B3 = {
  slug: 'cam-nang-du-lich-phu-quoc-thuc-chien-2026',
  title: 'Kinh Nghiệm Du Lịch Phú Quốc 2026: Cẩm Nang Thực Chiến Cho Người Đi Lần Đầu',
  excerpt: 'Cẩm nang du lịch Phú Quốc thực tế nhất 2026: thời điểm vàng, chọn khách sạn khu nào, top trải nghiệm must-try, ăn gì chuẩn vị bản địa, dự toán chi phí chi tiết. Đúc kết từ 10 năm kinh nghiệm của dân địa phương — cùng 9 Trip Phú Quốc!',
  category: 'kinh-nghiem-du-lich',
  tags: ['phu-quoc', 'du-lich-2026', 'kinh-nghiem', 'cam-nang', 'chi-phi', 'am-thuc'],
  sourceUrl: 'https://phuquocgo.vn/kinh-nghiem-du-lich-phu-quoc/',
  sourceName: 'PhuQuocGo',
  metaTitle: 'Kinh Nghiệm Du Lịch Phú Quốc 2026: Cẩm Nang Thực Chiến — 9 Trip',
  metaDescription: 'Cẩm nang du lịch Phú Quốc thực tế nhất 2026: thời điểm vàng, chọn khách sạn khu nào, top trải nghiệm must-try, ăn gì chuẩn vị bản địa, dự toán chi phí chi tiết.',
  images: [
    { id:'f3', ph:'[B3-IMG-01]', url:'https://phuquocgo.vn/wp-content/uploads/2026/02/thoi-diem-dep-nhat-di-du-lich-phu-quoc.jpg', role:'feat', w:1200 },
    { id:'i3a', ph:'[B3-IMG-02]', url:'https://phuquocgo.vn/wp-content/uploads/2026/02/ban-do-khu-vuc-khach-san-phu-quoc.jpg', role:'inline', w:800 },
    { id:'i3b', ph:'[B3-IMG-03]', url:'https://phuquocgo.vn/wp-content/uploads/2026/02/tour-3-dao-phu-quoc-lan-ngam-san-ho.jpg', role:'inline', w:800 },
    { id:'i3c', ph:'[B3-IMG-04]', url:'https://phuquocgo.vn/wp-content/uploads/2026/02/bun-quay-kien-xay-phu-quoc.jpg', role:'inline', w:800 },
  ],
  html: `\
<section>
  <p>Nếu bạn đang đọc bài viết này, có lẽ bạn đang bị "ngợp" trước hàng trăm thông tin về Phú Quốc. Hòn đảo rộng tới 574km² (ngang ngửa Singapore), mỗi người đi về lại kể một câu chuyện khác nhau: người mê, người chê.</p>
  <p>Bài viết này <strong>không phải quảng cáo</strong>. Đây là <strong>kinh nghiệm du lịch Phú Quốc thực tế</strong>, đúc kết từ hàng ngàn hành trình mà đội ngũ <strong>9 Trip Phú Quốc</strong> đã thiết kế cho du khách suốt nhiều năm. Cùng khám phá nhé!</p>

  <figure><img src="[B3-IMG-01]" alt="Bãi biển Phú Quốc mùa khô với nước trong xanh và bờ cát trắng — thời điểm vàng để du lịch đảo Ngọc" loading="lazy" /><figcaption>Sự khác biệt rõ rệt giữa mùa khô và mùa mưa tại đảo Ngọc</figcaption></figure>

  <blockquote><strong>🎁 Deal hot từ 9 Trip Phú Quốc:</strong> Tour cano 3 đảo — Hòn Móng Tay, Gầm Ghì, Mây Rút — chỉ từ <strong>650.000đ/khách</strong>. <a href="/tours">Xem ngay →</a></blockquote>
</section>

<section>
  <h2>Thời điểm vàng: Nên đi Phú Quốc tháng mấy?</h2>
  <p>Đây là câu hỏi quan trọng nhất quyết định 50% thành bại của chuyến đi.</p>
  <h3>Mùa khô (Tháng 11 – Tháng 4 năm sau)</h3>
  <p>Trời xanh, biển êm, sóng lặng. Bờ Tây (Bãi Trường, Bãi Dài) rực rỡ, hoàng hôn cực phẩm. Đây là <strong>thời điểm đẹp nhất</strong>. Nhưng là mùa cao điểm — giá tăng 20-30%, cần đặt trước ít nhất 1 tháng.</p>
  <h3>Mùa mưa (Tháng 5 – Tháng 10)</h3>
  <p>Mưa rào bất chợt, nhưng bờ Đông (Bãi Sao, Bãi Khem) vẫn trong xanh êm đềm. <strong>Ưu điểm:</strong> giá siêu rẻ, không chen chúc. Mẹo của dân địa phương: check hướng gió trong ngày để chọn bãi tắm phù hợp.</p>
</section>

<section>
  <h2>Di chuyển & Lưu trú: Ở đâu để tiện ăn chơi?</h2>

  <figure><img src="[B3-IMG-02]" alt="Bản đồ phân chia 3 khu vực lưu trú chính tại Phú Quốc giúp du khách dễ dàng lên lịch trình" loading="lazy" /><figcaption>Bản đồ 3 khu vực lưu trú chính tại Phú Quốc</figcaption></figure>

  <ol>
    <li><strong>Dương Đông (Trung tâm):</strong> Đông vui, gần chợ đêm, nhiều quán ăn ngon rẻ. Di chuyển đi đâu cũng tiện.</li>
    <li><strong>Nam Đảo (An Thới/Sunset Town):</strong> "Vibe" Địa Trung Hải, gần cáp treo Hòn Thơm, cảng đi tour đảo.</li>
    <li><strong>Bắc Đảo (Gành Dầu):</strong> Nghỉ dưỡng trọn gói (All-in-one) tại VinWonders, Safari. Lý tưởng cho gia đình trẻ nhỏ.</li>
  </ol>
  <p><a href="/hotels">Xem toàn bộ khách sạn Phú Quốc tại 9 Trip →</a></p>

  <p><strong>Phương tiện đi lại:</strong> Thuê xe máy 120k-150k/ngày. Xe buýt điện VinBus miễn phí chạy dọc đảo — tải app VinBus để theo dõi lộ trình.</p>
</section>

<section>
  <h2>Top trải nghiệm "Must-try"</h2>

  <figure><img src="[B3-IMG-03]" alt="Tour cano 3 đảo Phú Quốc — nước biển trong vắt tại Hòn Móng Tay với rạn san hô rực rỡ" loading="lazy" /><figcaption>Nước biển trong vắt tại Hòn Móng Tay — điểm đến không thể bỏ qua</figcaption></figure>

  <article><h3>A. Khám phá các hòn đảo hoang sơ (Nam Đảo)</h3><p>Tour cano 3 đảo: Hòn Móng Tay, Gầm Ghì, Mây Rút. Nước trong vắt nhìn thấy đáy, rạn san hô tự nhiên đẹp mê hồn. Mẹo: chọn tour riêng thay vì tour ghép 50-70 người để trải nghiệm trọn vẹn hơn.</p></article>
  <article><h3>B. Đi bộ dưới đáy biển (Seawalker)</h3><p>Không cần biết bơi — đội mũ oxy chuyên dụng và đi bộ giữa lòng đại dương, chạm tay vào đàn cá. Địa điểm: công viên san hô Namaste hoặc du thuyền Nautilus.</p></article>
  <article><h3>C. Ngắm hoàng hôn & Câu mực đêm</h3><p>Câu được mực hay không còn tùy... nhân phẩm. Nhưng cảm giác lênh đênh giữa biển đêm, ăn cháo mực nóng hổi, ngắm thành phố lên đèn là trải nghiệm cực "chill".</p></article>
</section>

<section>
  <h2>Ăn gì ở Phú Quốc? (Chuẩn vị bản địa)</h2>
  <figure><img src="[B3-IMG-04]" alt="Tô bún quậy Kiến Xây nóng hổi với chả tôm chả mực tươi quết tại chỗ — đặc sản trứ danh Phú Quốc" loading="lazy" /><figcaption>Bún quậy Kiến Xây — món ăn gây thương nhớ nhất Phú Quốc</figcaption></figure>
  <ul>
    <li><strong>Bún Quậy Kiến Xây:</strong> Chả tôm, mực quết tươi, tự pha nước chấm. 60k-80k/tô.</li>
    <li><strong>Gỏi cá trích:</strong> Cuốn bánh tráng rau rừng, chấm nước mắm đậu phộng — không hề tanh.</li>
    <li><strong>Hải sản Làng chài Hàm Ninh:</strong> Ghẹ nhỏ nhưng chắc thịt, ngọt. Nên vào các bè nổi để ăn tươi nhất.</li>
  </ul>
</section>

<section>
  <h2>Dự toán chi phí 3N2Đ (chưa vé máy bay)</h2>
  <table style="width:100%;border-collapse:collapse;">
    <tr style="background:#f3f4f6;"><th style="padding:8px;text-align:left;">Khoản</th><th style="padding:8px;">Tiết kiệm</th><th style="padding:8px;">Thoải mái</th></tr>
    <tr><td style="padding:8px;">Lưu trú</td><td style="padding:8px;">500k-800k</td><td style="padding:8px;">2-4 triệu</td></tr>
    <tr><td style="padding:8px;">Đi lại</td><td style="padding:8px;">300k (xe máy)</td><td style="padding:8px;">1.5 triệu</td></tr>
    <tr><td style="padding:8px;">Ăn uống</td><td style="padding:8px;">1.5 triệu</td><td style="padding:8px;">3-5 triệu</td></tr>
    <tr><td style="padding:8px;">Vé/Tour</td><td style="padding:8px;">1 triệu</td><td style="padding:8px;">3 triệu</td></tr>
    <tr style="font-weight:bold;"><td style="padding:8px;">TỔNG</td><td style="padding:8px;">~3.3 triệu</td><td style="padding:8px;">~8-10 triệu</td></tr>
  </table>
</section>

${FOOTER}`,
};

// ─────────────────────────────────────────────────────────────────────────────
// BLOG #4 — VoyageBlogger — Pullman Resort Review
// ─────────────────────────────────────────────────────────────────────────────

const B4 = {
  slug: 'pullman-phu-quoc-beach-resort-review-2026',
  title: 'Pullman Phu Quoc Beach Resort 2026: Thiên Đường Nghỉ Dưỡng Cho Gia Đình',
  excerpt: 'Review chi tiết Pullman Phu Quoc Beach Resort — resort 5 sao hàng đầu đảo Ngọc với bãi biển riêng, nhà hàng Madcow trứ danh, spa YHI đẳng cấp và không gian lý tưởng cho gia đình. Cùng 9 Trip Phú Quốc khám phá!',
  category: 'review-khach-san',
  tags: ['phu-quoc', 'pullman', 'resort-5-sao', 'review', 'gia-dinh', 'nghi-duong'],
  sourceUrl: 'https://voyageblogger.com/2026/03/30/pullman-phu-quoc-beach-resort-2026-1-family-paradise-on-pearl-island/',
  sourceName: 'VoyageBlogger',
  metaTitle: 'Pullman Phu Quoc Beach Resort 2026: Thiên Đường Gia Đình — 9 Trip',
  metaDescription: 'Review Pullman Phu Quoc Beach Resort — 5 sao, bãi biển riêng, nhà hàng Madcow, spa YHI, tiện ích gia đình đỉnh cao.',
  images: [
    { id:'f4', ph:'[B4-IMG-01]', url:'https://i0.wp.com/voyageblogger.com/wp-content/uploads/2023/05/342222430_1412236006257192_1624412295388491894_n.jpeg?resize=960%2C500&ssl=1', role:'feat', w:1200 },
  ],
  html: `\
<section>
  <p><strong>Pullman Phu Quoc Beach Resort</strong> là một trong những khu nghỉ dưỡng 5 sao được yêu thích nhất tại đảo Ngọc, liên tục đạt đánh giá xuất sắc trên TripAdvisor và Booking.com. Với bãi biển riêng tuyệt đẹp, tiện ích đẳng cấp thế giới và dịch vụ chuyên nghiệp, Pullman Phu Quoc mang đến trải nghiệm vượt xa mong đợi cho mọi du khách — từ cặp đôi lãng mạn, gia đình đông thành viên đến các đoàn doanh nghiệp.</p>

  <blockquote><strong>🏨 Ưu đãi từ 9 Trip Phú Quốc:</strong> Đặt phòng Pullman Phu Quoc giá tốt nhất, tặng kèm đưa đón sân bay. <a href="/hotels">Xem giá ngay →</a></blockquote>
</section>

<section>
  <h2>Phòng nghỉ — Sang trọng và tiện nghi</h2>
  <p>Các phòng tại Pullman Phu Quoc được thiết kế rộng rãi, thanh lịch, đạt chuẩn 5 sao với nội thất tinh tế. Nhiều phòng có view biển hoặc vườn, cửa sổ lớn đón ánh sáng tự nhiên và âm thanh dịu êm của sóng biển — lý tưởng cho những kỳ nghỉ dài ngày.</p>
</section>

<section>
  <h2>Ẩm thực — Nhà hàng Madcow huyền thoại</h2>
  <p>Trái tim ẩm thực của resort là <strong>Madcow Restaurant</strong> — nhà hàng nằm ngay bãi biển với view đại dương ngoạn mục. Món nhất định phải thử: <strong>tủy xương bò nướng</strong> — béo ngậy, đậm đà, khó quên. Đừng bỏ qua món tráng miệng phủ vàng — một kiệt tác thị giác lẫn vị giác.</p>
</section>

<section>
  <h2>Bãi biển riêng — Khoảnh khắc nghỉ dưỡng đích thực</h2>
  <p>Một trong những tài sản quý giá nhất của Pullman chính là <strong>bãi biển riêng</strong>. Du khách có thể nằm dài trên ghế tắm nắng dọc bờ cát trắng mịn, bơi trong làn nước xanh ngọc, hoặc đơn giản là ngắm nhìn biển Đông lấp lánh dưới ánh chiều tà.</p>
</section>

<section>
  <h2>Trải nghiệm gia đình — Mọi thế hệ đều được chiều chuộng</h2>
  <p>Pullman thực sự thân thiện với gia đình. Phòng rộng rãi đảm bảo sự riêng tư cho từng thành viên, trong khi <strong>khu vui chơi trẻ em</strong> và các hoạt động chuyên biệt giúp các bé có kỳ nghỉ tuyệt vời không kém người lớn.</p>
</section>

<section>
  <h2>YHI Spa — Ốc đảo thư giãn</h2>
  <p>Spa của resort là thiên đường cho việc chăm sóc cá nhân với thực đơn đa dạng các liệu pháp truyền thống và hiện đại. Từ massage mô sâu đến các liệu trình dưỡng da phục hồi — tất cả đều được thực hiện bởi đội ngũ chuyên gia tận tâm.</p>
</section>

<section>
  <h2>Sự kiện & Tiệc cưới — Biểu tượng của sự hoàn hảo</h2>
  <p>Pullman sở hữu cơ sở vật chất hội nghị hiện đại, lý tưởng cho các sự kiện doanh nghiệp, team building. Đặc biệt, đây là một trong những <strong>địa điểm tổ chức tiệc cưới ngoạn mục nhất Việt Nam</strong> — nơi giấc mơ ngày cưới thành hiện thực giữa khung cảnh biển trời lộng lẫy.</p>
</section>

${FOOTER}`,
};

// ─────────────────────────────────────────────────────────────────────────────
// BLOG #5 — Premier Residences — Cẩm Nang Du Lịch 2026
// ─────────────────────────────────────────────────────────────────────────────

const B5 = {
  slug: 'cam-nang-du-lich-phu-quoc-2026-tat-tan-tat',
  title: 'Cẩm Nang Du Lịch Phú Quốc 2026: Tất Tần Tật Kinh Nghiệm Từ A-Z',
  excerpt: 'Cẩm nang du lịch Phú Quốc 2026 toàn diện nhất: thời điểm lý tưởng, phương tiện di chuyển, top điểm tham quan 3 khu vực, ẩm thực đặc sắc, kinh nghiệm lưu trú và mua sắm quà đặc sản. Cùng 9 Trip Phú Quốc lên kế hoạch hoàn hảo!',
  category: 'cam-nang-du-lich',
  tags: ['phu-quoc', 'du-lich-2026', 'cam-nang', 'kinh-nghiem', 'am-thuc', 'di-chuyen'],
  sourceUrl: 'https://blog.premierresidencesphuquoc.com/vi/cam-nang-du-lich-phu-quoc/',
  sourceName: 'Premier Residences Blog',
  metaTitle: 'Cẩm Nang Du Lịch Phú Quốc 2026: Tất Tần Tật Từ A-Z — 9 Trip',
  metaDescription: 'Cẩm nang du lịch Phú Quốc 2026 toàn diện: thời điểm, di chuyển, điểm tham quan, ẩm thực, lưu trú, mua sắm.',
  images: [
    { id:'f5', ph:'[B5-IMG-01]', url:'https://blog.premierresidencesphuquoc.com/wp-content/uploads/2025/12/cam-nang-du-lich-phu-quoc-17-1024x683.webp', role:'feat', w:1200 },
    { id:'i5a', ph:'[B5-IMG-02]', url:'https://blog.premierresidencesphuquoc.com/wp-content/uploads/2025/12/cam-nang-du-lich-phu-quoc-13.webp', role:'inline', w:800 },
    { id:'i5b', ph:'[B5-IMG-03]', url:'https://blog.premierresidencesphuquoc.com/wp-content/uploads/2025/12/cam-nang-du-lich-phu-quoc-27-1024x587.webp', role:'inline', w:800 },
  ],
  html: `\
<section>
  <p>Năm 2026 hứa hẹn là thời điểm bùng nổ của du lịch Phú Quốc khi hòn đảo này vươn mình trở thành điểm đến toàn cầu — kết hợp hoàn hảo giữa thiên nhiên hoang sơ và hạ tầng đẳng cấp. Cùng <strong>9 Trip Phú Quốc</strong> khám phá cẩm nang đầy đủ và chi tiết nhất: từ săn vé máy bay, chọn thời điểm đi, đến danh sách quán ăn ngon "nhức nách" chỉ dân địa phương mới biết.</p>

  <figure><img src="[B5-IMG-01]" alt="Cẩm nang du lịch Phú Quốc 2026 với bãi biển xanh ngọc và những điểm tham quan hấp dẫn" loading="lazy" /><figcaption>Phú Quốc 2026 — thiên đường nghỉ dưỡng và khám phá</figcaption></figure>

  <blockquote><strong>🎁 Ưu đãi độc quyền từ 9 Trip:</strong> Combo Phú Quốc 4N3Đ — vé máy bay + khách sạn 4 sao + tour 3 đảo — chỉ từ <strong>5.990.000đ/khách</strong>. <a href="/tours">Đặt ngay →</a></blockquote>
</section>

<section>
  <h2>Tổng quan về Phú Quốc — Thiên đường đảo Ngọc</h2>
  <p>Phú Quốc nằm sâu trong Vịnh Thái Lan, diện tích ~589km², đường bờ biển 150km, 99 ngọn núi đồi và rừng nguyên sinh rộng lớn thuộc Vườn Quốc gia Phú Quốc. Là thành phố đảo đầu tiên của Việt Nam, sở hữu sân bay quốc tế, cảng tàu khách quốc tế, và chính sách miễn thị thực 30 ngày cho người nước ngoài.</p>
</section>

<section>
  <h2>Thời điểm lý tưởng du lịch Phú Quốc 2026</h2>
  <h3>Mùa khô (Tháng 11 – Tháng 4) — "Thời điểm vàng"</h3>
  <p>Trời trong xanh, nắng vàng, biển êm, nhiệt độ 25-28°C. Lý tưởng cho tắm biển, lặn san hô, tour cano.</p>
  <h3>Mùa mưa (Tháng 5 – Tháng 10) — Tiết kiệm & yên bình</h3>
  <p>Mưa rào nhanh tạnh. Giá vé máy bay và phòng nghỉ giảm 30-50%. Cao điểm mưa: tháng 8-9.</p>
  <h3>Dịp lễ Tết</h3>
  <p>Tết Nguyên Đán, 30/4-1/5, Quốc Khánh 2/9 — đặt vé và phòng trước 2-3 tháng để tránh "cháy phòng".</p>
</section>

<section>
  <h2>Phương tiện di chuyển</h2>
  <h3>Đến Phú Quốc</h3>
  <ul>
    <li><strong>Máy bay:</strong> Vietnam Airlines, Vietjet, Bamboo Airways, Sun Airways — từ Hà Nội, TP.HCM, Hải Phòng, Cần Thơ. Bay 1-2h, vé khứ hồi 1.5-4 triệu.</li>
    <li><strong>Tàu cao tốc:</strong> Rạch Giá (2h30, 340k) hoặc Hà Tiên (1h15, 230k).</li>
  </ul>
  <h3>Trên đảo</h3>
  <ul>
    <li><strong>Xe máy:</strong> 120k-200k/ngày — tối ưu cho người đi tự túc.</li>
    <li><strong>Taxi Xanh SM, Grab:</strong> Tiện lợi, xe mới, giá cạnh tranh.</li>
    <li><strong>Xe buýt điện VinBus:</strong> Miễn phí, kết nối sân bay - Dương Đông - Bắc Đảo.</li>
  </ul>
</section>

<section>
  <h2>Top điểm tham quan theo khu vực</h2>
  <h3>Bắc Đảo — Thiên đường giải trí</h3>
  <ul>
    <li><strong>VinWonders:</strong> Công viên chủ đề lớn nhất Việt Nam, thủy cung top 5 thế giới.</li>
    <li><strong>Vinpearl Safari:</strong> Bảo tồn động vật bán hoang dã — trải nghiệm "nhốt người thả thú".</li>
    <li><strong>Grand World:</strong> "Thành phố không ngủ" — kênh đào Venice, bảo tàng Gấu Teddy.</li>
    <li><strong>Rạch Vẹm:</strong> "Vương quốc sao biển" mùa khô.</li>
  </ul>

  <figure><img src="[B5-IMG-02]" alt="VinWonders Phú Quốc — công viên chủ đề lớn nhất Việt Nam với Cung điện Hải Vương" loading="lazy" /><figcaption>Bắc Đảo — nơi hội tụ những tổ hợp giải trí đẳng cấp</figcaption></figure>

  <h3>Nam Đảo — Biểu tượng mới của Phú Quốc</h3>
  <ul>
    <li><strong>Cáp treo Hòn Thơm:</strong> Dài nhất thế giới (7.9km), view toàn cảnh quần đảo An Thới.</li>
    <li><strong>Cầu Hôn (Kiss Bridge):</strong> Biểu tượng mới — hai nhánh cầu chạm nhau giữa biển.</li>
    <li><strong>Bãi Kem & Bãi Sao:</strong> Cát trắng mịn như kem, nước xanh ngọc bích.</li>
    <li><strong>Chùa Hộ Quốc:</strong> Thiền viện Trúc Lâm — "tựa sơn hướng hải".</li>
  </ul>

  <h3>Trung tâm Dương Đông — Nhịp đập văn hóa</h3>
  <ul>
    <li><strong>Dinh Cậu:</strong> Biểu tượng tâm linh, điểm ngắm hoàng hôn tuyệt đẹp.</li>
    <li><strong>Chợ đêm Phú Quốc:</strong> Thiên đường hải sản và ẩm thực đường phố.</li>
    <li><strong>Làng chài Hàm Ninh:</strong> Bình minh đẹp nhất đảo, ghẹ Hàm Ninh trứ danh.</li>
  </ul>
</section>

<section>
  <h2>Trải nghiệm không thể bỏ lỡ</h2>
  <ul>
    <li><strong>Tour cano 4 đảo:</strong> Hòn Mây Rút, Hòn Gầm Ghì, Hòn Móng Tay — lặn san hô, SUP, flycam.</li>
    <li><strong>Show Kiss of the Sea:</strong> Kết hợp lửa, nước, laser, pháo hoa trên sân khấu biển lớn nhất thế giới.</li>
    <li><strong>Show Tinh Hoa Việt Nam:</strong> Thực cảnh tại Grand World tái hiện văn hóa truyền thống.</li>
    <li><strong>Ngắm hoàng hôn:</strong> OCSEN Beach Bar, Sunset Sanato, Shri Beach Club.</li>
  </ul>
</section>

<section>
  <h2>Ẩm thực — Ăn gì, ở đâu ngon?</h2>

  <figure><img src="[B5-IMG-03]" alt="Tô bún quậy Phú Quốc với chả tôm chả cá tươi và nước lèo nóng hổi — đặc sản không thể bỏ qua" loading="lazy" /><figcaption>Bún quậy — linh hồn ẩm thực Phú Quốc</figcaption></figure>

  <ul>
    <li><strong>Bún quậy Kiến Xây:</strong> 28 Bạch Đằng, Dương Đông — quán gốc nổi tiếng nhất.</li>
    <li><strong>Gỏi cá trích:</strong> Cá tươi thái mỏng trộn dừa nạo, cuốn bánh tráng rau rừng.</li>
    <li><strong>Bún kèn Út Lượm:</strong> 87 Đường 30/4 — nước lèo cá ngân, cốt dừa, sả.</li>
    <li><strong>Nhà hàng Xin Chào:</strong> 66 Trần Hưng Đạo — view biển, hải sản tươi, giá niêm yết.</li>
    <li><strong>Quán Ra Khơi:</strong> 131 Đường 30/4 — hải sản giá phải chăng.</li>
  </ul>
</section>

<section>
  <h2>Mua gì làm quà?</h2>
  <ul>
    <li><strong>Nước mắm Phú Quốc:</strong> Khải Hoàn, Phụng Hưng — độ đạm cao, màu cánh gián.</li>
    <li><strong>Rượu Sim:</strong> Lên men từ trái sim rừng, tốt cho tiêu hóa.</li>
    <li><strong>Hồ tiêu:</strong> Vườn tiêu Khu Tượng — cay nồng đặc trưng.</li>
    <li><strong>Ngọc trai:</strong> Nuôi cấy tự nhiên tại biển Phú Quốc.</li>
  </ul>
</section>

${FOOTER}`,
};

// ─────────────────────────────────────────────────────────────────────────────
// BLOG #6 — PhuQuocTV — Kinh Nghiệm Tự Túc 2026
// ─────────────────────────────────────────────────────────────────────────────

const B6 = {
  slug: 'kinh-nghiem-du-lich-phu-quoc-tu-tuc-2026',
  title: 'Kinh Nghiệm Du Lịch Phú Quốc Tự Túc Mới Nhất 2026',
  excerpt: 'Kinh nghiệm du lịch Phú Quốc tự túc 2026 từ dân địa phương: cách chọn thời điểm, chọn khách sạn, ăn uống ngon bổ rẻ, các hoạt động vui chơi nổi bật và mẹo di chuyển tiết kiệm. Cùng 9 Trip Phú Quốc khám phá!',
  category: 'kinh-nghiem-du-lich',
  tags: ['phu-quoc', 'du-lich-2026', 'tu-tuc', 'kinh-nghiem', 'am-thuc', 'di-chuyen'],
  sourceUrl: 'https://phuquoctv.vn/dia-diem/2428-kinh-nghiem-du-lich-phu-quoc-tu-tuc.html',
  sourceName: 'PhuQuocTV',
  metaTitle: 'Kinh Nghiệm Du Lịch Phú Quốc Tự Túc 2026 — 9 Trip',
  metaDescription: 'Kinh nghiệm du lịch Phú Quốc tự túc 2026: chọn thời điểm, khách sạn, ăn uống, vui chơi, di chuyển tiết kiệm.',
  images: [],
  html: `\
<section>
  <p>Phú Quốc nay đã đổi thay từng ngày — kinh nghiệm du lịch mỗi năm mỗi khác. Nếu bạn lần đầu đến đảo Ngọc, bài viết này từ <strong>9 Trip Phú Quốc</strong> sẽ giúp bạn tự tin khám phá theo cách tiết kiệm và trọn vẹn nhất. Từ chọn thời điểm, chọn khách sạn, ăn uống ngon bổ rẻ đến các hoạt động vui chơi nổi bật — tất cả đều có trong cẩm nang này.</p>

  <blockquote><strong>🎁 Ưu đãi từ 9 Trip:</strong> Thuê xe máy Phú Quốc chỉ từ <strong>120.000đ/ngày</strong> — giao xe tận nơi. <a href="/">Liên hệ ngay →</a></blockquote>
</section>

<section>
  <h2>Chọn thời điểm đi Phú Quốc</h2>
  <ul>
    <li><strong>Tháng 1-4:</strong> Biển đẹp và trong nhất, nắng ráo, lý tưởng cho lặn san hô, tắm biển. Vé máy bay rẻ vì là mùa thấp điểm.</li>
    <li><strong>Tháng 5-8:</strong> Mùa cao điểm du lịch hè — giá dịch vụ nhỉnh hơn nhưng không có tình trạng "chặt chém". Mùa mưa — mưa nhanh tạnh, sáng mưa chiều nắng.</li>
    <li><strong>Tháng 10:</strong> Mùa ruốc — sinh vật li ti màu hồng xuất hiện ở biển, là "quà của biển" cho bữa ăn thịnh soạn.</li>
  </ul>
  <p>Mẹo: Phú Quốc nằm sâu trong Vịnh Thái Lan nên ít chịu ảnh hưởng bão — mưa cũng chỉ một lúc rồi tạnh.</p>
</section>

<section>
  <h2>Chọn khách sạn ở đâu?</h2>
  <ul>
    <li><strong>Dương Đông:</strong> Trung tâm sầm uất, gần chợ đêm, nhiều quán ăn. Phù hợp người thích sự tiện lợi.</li>
    <li><strong>Bãi Dài - Bắc Đảo:</strong> Gần VinWonders, Safari. Phù hợp gia đình có trẻ nhỏ.</li>
    <li><strong>Nam Đảo - Bãi Sao, Bãi Khem:</strong> Yên tĩnh, biển đẹp, resort sang trọng. Phù hợp nghỉ dưỡng, trăng mật.</li>
  </ul>
  <p><a href="/hotels">Xem toàn bộ khách sạn Phú Quốc giá tốt tại 9 Trip →</a></p>
</section>

<section>
  <h2>Ăn uống ngon bổ rẻ</h2>
  <p>Ở đảo mà — ngon nhất vẫn là hải sản! Những món không thể bỏ qua:</p>
  <ul>
    <li><strong>Gỏi cá trích</strong></li>
    <li><strong>Nhum nướng mỡ hành</strong></li>
    <li><strong>Ghẹ Hàm Ninh</strong> — nhỏ nhưng chắc thịt, ngọt</li>
    <li><strong>Cá sòng nướng cuốn bánh tráng</strong></li>
    <li><strong>Các loại ốc biển nướng/hấp</strong></li>
  </ul>
</section>

<section>
  <h2>Hoạt động vui chơi nổi bật</h2>
  <ul>
    <li><strong>Tour cano 3-4 đảo:</strong> Lặn ngắm san hô tại Hòn Móng Tay, Hòn Gầm Ghì, Hòn Mây Rút.</li>
    <li><strong>Cáp treo Hòn Thơm:</strong> Tuyến cáp treo vượt biển dài nhất thế giới.</li>
    <li><strong>VinWonders & Safari:</strong> Công viên chủ đề và bảo tồn động vật hàng đầu.</li>
    <li><strong>Câu mực đêm:</strong> Trải nghiệm cuộc sống ngư dân trên biển đêm.</li>
    <li><strong>Thị trấn Hoàng Hôn & Cầu Hôn:</strong> Check-in "sống ảo" đỉnh cao.</li>
  </ul>
</section>

<section>
  <h2>Mẹo di chuyển tiết kiệm</h2>
  <ul>
    <li><strong>Xe máy:</strong> 120k-150k/ngày — phương tiện tự do nhất.</li>
    <li><strong>Xe buýt điện VinBus:</strong> Miễn phí nhiều tuyến — tải app theo dõi.</li>
    <li><strong>Taxi Xanh SM:</strong> Xe điện, giá cước rõ ràng, không lo bị "chặt chém".</li>
  </ul>
</section>

${FOOTER}`,
};

// ─────────────────────────────────────────────────────────────────────────────
// BLOG #7 — CrystalBay — Review 5 Khách Sạn Nổi Tiếng
// ─────────────────────────────────────────────────────────────────────────────

const B7 = {
  slug: 'review-5-khach-san-noi-tieng-phu-quoc-2025',
  title: 'Review Thực Tế 5 Khách Sạn Nổi Tiếng Hàng Đầu Ở Phú Quốc',
  excerpt: 'Review chi tiết 5 resort 5 sao nổi tiếng nhất Phú Quốc: JW Marriott Emerald Bay, InterContinental Long Beach, Regent Phú Quốc, New World, Premier Village. So sánh phong cách, tiện ích, đối tượng phù hợp — giúp bạn chọn đúng nơi dừng chân. Cùng 9 Trip Phú Quốc!',
  category: 'review-khach-san',
  tags: ['phu-quoc', 'resort-5-sao', 'review', 'jw-marriott', 'intercontinental', 'regent', 'new-world', 'premier-village'],
  sourceUrl: 'https://crystalbay.com/35-review-thuc-te-5-khach-san-noi-tieng-hang-dau-o-phu-quoc-n62593.html',
  sourceName: 'Crystal Bay',
  metaTitle: 'Review 5 Khách Sạn Nổi Tiếng Phú Quốc — 9 Trip',
  metaDescription: 'Review 5 resort 5 sao hàng đầu Phú Quốc: JW Marriott, InterContinental, Regent, New World, Premier Village.',
  images: [
    { id:'f7', ph:'[B7-IMG-01]', url:'https://i2.ex-cdn.com/crystalbay.com/files/content/2025/11/27/review-thuc-te-khach-san-noi-tieng-o-phu-quoc-1-1356.jpg', role:'feat', w:1200 },
    { id:'i7a', ph:'[B7-IMG-02]', url:'https://i2.ex-cdn.com/crystalbay.com/files/content/2025/11/27/review-thuc-te-khach-san-noi-tieng-o-phu-quoc-3-1356.jpg', role:'inline', w:800 },
    { id:'i7b', ph:'[B7-IMG-03]', url:'https://i2.ex-cdn.com/crystalbay.com/files/content/2025/11/27/review-thuc-te-khach-san-noi-tieng-o-phu-quoc-5-1356.jpg', role:'inline', w:800 },
  ],
  html: `\
<section>
  <p>Phú Quốc không chỉ nổi tiếng với những bãi biển cát trắng mịn và nước xanh ngọc bích, mà còn là thiên đường của những khu nghỉ dưỡng đẳng cấp quốc tế. Việc chọn một nơi lưu trú hoàn hảo giữa rất nhiều resort 5 sao đôi khi khiến du khách bối rối. Cùng <strong>9 Trip Phú Quốc</strong> khám phá 5 cái tên nổi bật nhất — mỗi resort một phong cách riêng!</p>

  <figure><img src="[B7-IMG-01]" alt="JW Marriott Phu Quoc Emerald Bay với kiến trúc trường đại học giả tưởng độc đáo của Bill Bensley" loading="lazy" /><figcaption>JW Marriott — tác phẩm nghệ thuật giữa lòng Bãi Kem</figcaption></figure>

  <blockquote><strong>🏨 Đặt phòng 5 sao giá tốt:</strong> 9 Trip Phú Quốc có ưu đãi đặc biệt cho tất cả resort trong bài. <a href="/hotels">Xem giá ngay →</a></blockquote>
</section>

<section>
  <h2>1. JW Marriott Phu Quoc Emerald Bay</h2>
  <p>Thiết kế bởi "phù thủy kiến trúc" Bill Bensley, JW Marriott tái hiện trường Đại học Lamarck giả tưởng thế kỷ 19. Mỗi góc đều là một tác phẩm nghệ thuật — từ sảnh hoài cổ đến các phòng chủ đề Khoa Kiến trúc, Khoa Hóa học.</p>
  <ul>
    <li><strong>Điểm cộng:</strong> Bãi Kem — một trong những bãi biển đẹp nhất hành tinh. Nhà hàng Pink Pearl phục vụ ẩm thực Pháp đỉnh cao.</li>
    <li><strong>Dành cho:</strong> Người yêu nghệ thuật, cặp đôi trăng mật, tín đồ sống ảo.</li>
  </ul>
</section>

<section>
  <h2>2. InterContinental Phu Quoc Long Beach Resort</h2>
  <p>Tọa lạc tại Bãi Trường — điểm ngắm hoàng hôn đẹp nhất Việt Nam. Điểm nhấn: quán bar INK 360 trên tầng thượng — bar cao nhất Phú Quốc.</p>
  <ul>
    <li><strong>Điểm cộng:</strong> Hồ bơi vô cực hướng biển, khu trẻ em Planet Trekkers, spa HARNN nổi trên đầm sen. Buffet sáng Sora & Umi đa dạng.</li>
    <li><strong>Dành cho:</strong> Gia đình có con nhỏ, nhóm bạn trẻ thích không khí sôi động.</li>
  </ul>
</section>

<section>
  <h2>3. Regent Phu Quoc</h2>
  <p>"Tân binh khủng long" — định nghĩa lại sự xa hoa: không phô trương nhưng cực kỳ tinh tế và riêng tư. Toàn bộ là suite và biệt thự.</p>

  <figure><img src="[B7-IMG-02]" alt="Regent Phu Quoc với hồ bơi riêng trong villa sang trọng — đỉnh cao nghỉ dưỡng cá nhân hóa" loading="lazy" /><figcaption>Regent Phú Quốc — đỉnh cao của sự riêng tư và tinh tế</figcaption></figure>

  <ul>
    <li><strong>Điểm cộng:</strong> Hồ bơi riêng siêu lớn trong villa. Nhà hàng Oku — ẩm thực Nhật-Pháp fusion đáng nhớ nhất Phú Quốc.</li>
    <li><strong>Dành cho:</strong> Giới thượng lưu, doanh nhân, người tìm kiếm sự riêng tư tuyệt đối.</li>
  </ul>
</section>

<section>
  <h2>4. New World Phu Quoc Resort</h2>
  <p>Nằm cạnh JW Marriott tại Bãi Kem nhưng mang phong cách hoàn toàn khác — như một ngôi làng chài ven biển với mái lá, tường nứa, nội thất sang trọng. Toàn biệt thự có hồ bơi riêng.</p>
  <ul>
    <li><strong>Điểm cộng:</strong> Hồ bơi vô cực 120m — dài nhất đảo. Villa 3-4 phòng ngủ lý tưởng cho nhóm đông. Nhà hàng Lua chuyên hải sản tươi sống.</li>
    <li><strong>Dành cho:</strong> Đại gia đình nhiều thế hệ, nhóm bạn, team building.</li>
  </ul>
</section>

<section>
  <h2>5. Premier Village Phu Quoc Resort</h2>
  <p>Tọa lạc tại Mũi Ông Đội — nơi duy nhất ngắm được cả bình minh và hoàng hôn từ cùng một vị trí. Biệt thự men theo sườn đồi, trên ghềnh đá hoặc sát biển.</p>

  <figure><img src="[B7-IMG-03]" alt="Premier Village Phu Quoc với biệt thự trên ghềnh đá và view đại dương hùng vĩ" loading="lazy" /><figcaption>Premier Village — nơi "đi trốn" đúng nghĩa giữa thiên nhiên</figcaption></figure>

  <ul>
    <li><strong>Điểm cộng:</strong> Thiên nhiên bảo tồn tối đa, yên tĩnh tuyệt đối. Hồ bơi tràn bờ nhiều tầng — check-in "triệu like".</li>
    <li><strong>Dành cho:</strong> Người muốn "đi trốn", yêu thiên nhiên hoang sơ, cần không gian chữa lành (healing).</li>
  </ul>
</section>

${FOOTER}`,
};

// ─────────────────────────────────────────────────────────────────────────────
// BLOG #8 — iVIVU — 4 Resort Đẹp Như Mơ
// ─────────────────────────────────────────────────────────────────────────────

const B8 = {
  slug: '4-resort-phu-quoc-dep-nhu-mo-2025',
  title: '4 Resort Phú Quốc Đẹp Như Mơ Cho Kỳ Nghỉ Đáng Nhớ',
  excerpt: 'Top 4 resort Phú Quốc sang trọng với view biển tuyệt đẹp, villa hồ bơi riêng, dịch vụ chuẩn quốc tế: Premier Residences, Regent, InterContinental, JW Marriott. Cùng 9 Trip Phú Quốc chọn nơi dừng chân hoàn hảo!',
  category: 'review-khach-san',
  tags: ['phu-quoc', 'resort', 'nghi-duong', 'premier-residences', 'regent', 'intercontinental', 'jw-marriott'],
  sourceUrl: 'https://www.ivivu.com/blog/2025/05/4-resort-phu-quoc-dep-nhu-mo-cho-ky-nghi-dang-nho/',
  sourceName: 'iVIVU.com',
  metaTitle: '4 Resort Phú Quốc Đẹp Như Mơ — 9 Trip',
  metaDescription: 'Top 4 resort Phú Quốc view biển, villa hồ bơi riêng: Premier Residences, Regent, InterContinental, JW Marriott.',
  images: [
    { id:'f8', ph:'[B8-IMG-01]', url:'https://cdn3.ivivu.com/2025/05/resort-Phu-Quoc-ivivu.jpg', role:'feat', w:1200 },
    { id:'i8a', ph:'[B8-IMG-02]', url:'https://cdn3.ivivu.com/2025/05/resort-phu-quoc-ivivu-3.jpg', role:'inline', w:800 },
    { id:'i8b', ph:'[B8-IMG-03]', url:'https://cdn3.ivivu.com/2025/05/resort-Phu-Quoc-ivivu-4-2.jpg', role:'inline', w:800 },
  ],
  html: `\
<section>
  <p>Không chỉ sở hữu những bãi biển xanh như ngọc, Phú Quốc còn là thiên đường nghỉ dưỡng đích thực. Nếu bạn đang tìm kiếm một kỳ nghỉ đúng nghĩa — sang trọng, riêng tư và đáng nhớ — thì 4 resort dưới đây chính là những điểm dừng chân không thể bỏ qua. Cùng <strong>9 Trip Phú Quốc</strong> khám phá!</p>

  <figure><img src="[B8-IMG-01]" alt="Premier Residences Phú Quốc Emerald Bay với hồ bơi sát biển và bãi cát trắng mịn trải dài" loading="lazy" /><figcaption>Premier Residences — năng động và trẻ trung bên bãi Khem</figcaption></figure>
</section>

<section>
  <h2>1. Premier Residences Phú Quốc Emerald Bay</h2>
  <p>Nằm tại bãi Khem, Premier Residences mang đến không gian nghỉ dưỡng đầy năng lượng với các căn hộ rộng rãi từ 1-3 phòng ngủ, tích hợp bếp riêng, ban công view biển hoặc hồ bơi vô cực. Hồ bơi sát biển rộng lớn, nhà hàng đa dạng, bãi cát trắng mịn trải dài. <strong>Lý tưởng cho gia đình trẻ, nhóm bạn năng động.</strong></p>
  <p><a href="/hotels">Xem giá Premier Residences tại 9 Trip →</a></p>
</section>

<section>
  <h2>2. Regent Phú Quốc — Đỉnh cao siêu sang</h2>
  <p>Regent là định nghĩa hoàn hảo cho trải nghiệm "ultra luxury". Tọa lạc tại khu vực riêng tư thuộc bãi Trường, kiến trúc tối giản tinh tế, mang tinh thần wellness luxury. Mỗi villa có hồ bơi riêng, thiết kế mở hướng biển, dịch vụ quản gia 24/7. Ẩm thực Nhật-Âu-Việt cao cấp, chương trình wellness cá nhân hóa.</p>

  <figure><img src="[B8-IMG-02]" alt="Regent Phú Quốc với phong cách nghỉ dưỡng sang trọng — villa hồ bơi riêng hướng biển" loading="lazy" /><figcaption>Regent Phú Quốc — chuẩn mực mới của nghỉ dưỡng siêu sang</figcaption></figure>
</section>

<section>
  <h2>3. InterContinental Phu Quoc Long Beach</h2>
  <p>Đậm bản sắc Á Đông truyền thống, tọa lạc tại trung tâm bãi Trường. Hồ bơi tràn bờ, Kid's Club vui nhộn, Sunset Bar nằm giữa biển — nơi ngắm hoàng hôn đẹp nhất Phú Quốc. Spa HARNN Heritage nổi tiếng trên đầm sen. <strong>Lý tưởng cho gia đình và người yêu hoàng hôn.</strong></p>

  <figure><img src="[B8-IMG-03]" alt="InterContinental Phu Quoc Long Beach với không gian nghỉ dưỡng đẳng cấp bên bờ biển" loading="lazy" /><figcaption>InterContinental — nơi thư giãn trọn vẹn giữa thiên nhiên</figcaption></figure>
</section>

<section>
  <h2>4. JW Marriott Phu Quoc Emerald Bay</h2>
  <p>Không chỉ là resort — JW Marriott là một tác phẩm nghệ thuật. Lấy cảm hứng từ "trường đại học giả tưởng" thời Pháp thuộc, mỗi phòng có chủ đề riêng: hóa học, kiến trúc, tự nhiên học... Hồ bơi sát biển, nhà hàng Tempus Fugit, Pink Pearl, Chanterelle Spa. <strong>Dành cho người yêu nghệ thuật và sự sáng tạo.</strong></p>
</section>

${FOOTER}`,
};

// ─────────────────────────────────────────────────────────────────────────────
// BLOG #9 — VisitPhuQuoc — Kinh Nghiệm Cuối Năm
// ─────────────────────────────────────────────────────────────────────────────

const B9 = {
  slug: 'tron-bo-kinh-nghiem-du-lich-phu-quoc-cuoi-nam-2025',
  title: 'Trọn Bộ Kinh Nghiệm Du Lịch Phú Quốc Cuối Năm 2025 — Mới Nhất',
  excerpt: 'Trọn bộ kinh nghiệm du lịch Phú Quốc cuối năm: thời tiết lý tưởng, show Symphony of the Sea, Cầu Hôn, cáp treo Hòn Thơm, ẩm thực đặc sắc và chuẩn mực nghỉ dưỡng mới. Cùng 9 Trip Phú Quốc đón mùa lễ hội rực rỡ nhất đảo Ngọc!',
  category: 'cam-nang-du-lich',
  tags: ['phu-quoc', 'cuoi-nam', 'sunset-town', 'symphony-of-the-sea', 'cau-hon', 'le-hoi'],
  sourceUrl: 'https://visitphuquoc.com.vn/vi/tron-bo-kinh-nghiem-du-lich-phu-quoc-cuoi-nam-moi-nhat',
  sourceName: 'VisitPhuQuoc',
  metaTitle: 'Kinh Nghiệm Du Lịch Phú Quốc Cuối Năm 2025 — 9 Trip',
  metaDescription: 'Trọn bộ kinh nghiệm du lịch Phú Quốc cuối năm: show Symphony of the Sea, Cầu Hôn, cáp treo, ẩm thực, lễ hội.',
  images: [],
  html: `\
<section>
  <p>Mùa du lịch Phú Quốc cuối năm đang đến gần — rực rỡ hơn, cuốn hút hơn và tràn đầy cảm hứng khám phá. Bên cạnh hệ thống lưu trú và dịch vụ nghỉ dưỡng ngày càng hoàn thiện, đảo Ngọc sẽ "bùng nổ" với sự ra mắt hãng hàng không Sun PhuQuoc Airways, lễ hội ánh sáng, show diễn quốc tế. Cùng <strong>9 Trip Phú Quốc</strong> lên kế hoạch cho kỳ nghỉ cuối năm trọn vẹn nhất!</p>

  <blockquote><strong>🎆 Săn vé show Kiss of the Sea:</strong> 9 Trip Phú Quốc có vé show diễn + Cầu Hôn giá ưu đãi chỉ từ <strong>550.000đ</strong>. <a href="/activities">Đặt vé ngay →</a></blockquote>
</section>

<section>
  <h2>Vì sao nhất định phải đi Phú Quốc dịp cuối năm?</h2>
  <ul>
    <li><strong>Thời tiết hoàn hảo:</strong> 25-30°C, nắng nhẹ, gió biển mát, không khí trong lành.</li>
    <li><strong>Biển trong xanh, sóng êm:</strong> Lý tưởng cho lặn san hô, chèo kayak, cano.</li>
    <li><strong>Hoàng hôn huyền diệu:</strong> Thị trấn Hoàng Hôn, Dinh Cậu, Mũi Ông Đội — "tọa độ vàng" săn hoàng hôn đẹp nhất Việt Nam.</li>
    <li><strong>Không khí lễ hội sôi động:</strong> Lễ hội ánh sáng, show diễn quốc tế, sự kiện nghệ thuật.</li>
  </ul>
</section>

<section>
  <h2>Thị trấn Hoàng Hôn — Tâm điểm lễ hội</h2>
  <h3>Show Symphony of the Sea mùa 2</h3>
  <p>Từ 1/11, show diễn kết hợp nước, lửa, laser, 3D mapping, pháo hoa — dàn dựng bởi H2O Events và Laservision. Có sự góp mặt của các vận động viên Jetski và Flyboard hàng đầu thế giới. Đặc biệt: trải nghiệm combo Dinner Show tại Sun Bavaria GastroPub với bia thủ công Sun KraftBeer.</p>
  <h3>Cầu Hôn & Show Kiss of the Sea</h3>
  <p>Cầu Hôn (Kiss Bridge) — biểu tượng của tình yêu và nghệ thuật, điểm ngắm hoàng hôn đẹp nhất thế giới. Show Kiss of the Sea — kiệt tác trình diễn trên màn nước biển lớn nhất thế giới, kết hợp ánh sáng, laser, pháo hoa.</p>
  <h3>Khu phố La Festa</h3>
  <p>Không gian châu Âu giữa đảo Ngọc: bánh ngọt Maison Kayser (Pháp), kebab Thổ Nhĩ Kỳ, kem gelato Ý, Pop Mart, cửa hàng thời trang.</p>
</section>

<section>
  <h2>Cáp treo Hòn Thơm — Hành trình ngoạn mục</h2>
  <p>Tuyến cáp treo 3 dây vượt biển dài nhất thế giới (gần 8km), đưa bạn đến Sun World Hon Thom với công viên nước Aquatopia và làng Exotica.</p>
</section>

<section>
  <h2>Chuẩn mực nghỉ dưỡng mới</h2>
  <ul>
    <li><strong>Trung tâm (Dương Đông, Bãi Trường):</strong> InterContinental, Pullman, Dusit Princess — 2-5 triệu/đêm.</li>
    <li><strong>Nam Đảo:</strong> JW Marriott, Premier Village, New World, La Festa — nghỉ dưỡng đẳng cấp quốc tế.</li>
    <li><strong>Nổi bật:</strong> Rixos Phu Quoc — khu nghỉ dưỡng All-Inclusive đầu tiên tại Đông Nam Á, hơn 1.700 phòng, 22 nhà hàng & bar.</li>
  </ul>
  <p><a href="/hotels">Xem toàn bộ khách sạn Phú Quốc tại 9 Trip →</a></p>
</section>

${FOOTER}`,
};

// ─────────────────────────────────────────────────────────────────────────────
// BLOG #10 — SunParadiseLand — New World Resort Review
// ─────────────────────────────────────────────────────────────────────────────

const B10 = {
  slug: 'new-world-phu-quoc-resort-review-a-z',
  title: 'New World Phu Quoc Resort Review Chi Tiết Từ A-Z',
  excerpt: 'Review chi tiết New World Phu Quoc Resort — khu nghỉ dưỡng 5 sao bên Bãi Kem với kiến trúc làng chài độc đáo, 7 hạng biệt thự sang trọng, ẩm thực đa dạng và tiện ích đẳng cấp. Được Travel + Leisure vinh danh là resort gia đình tốt nhất châu Á. Cùng 9 Trip Phú Quốc khám phá!',
  category: 'review-khach-san',
  tags: ['phu-quoc', 'new-world', 'resort-5-sao', 'review', 'bai-kem', 'gia-dinh'],
  sourceUrl: 'https://sunparadiseland.com/tin-tuc/new-world-phu-quoc-resort-review-chi-tiet-tu-a-z-13419',
  sourceName: 'Sun Paradise Land',
  metaTitle: 'New World Phu Quoc Resort Review A-Z — 9 Trip',
  metaDescription: 'Review New World Phu Quoc Resort: 7 hạng biệt thự, ẩm thực, tiện ích, vị trí Bãi Kem. Resort gia đình tốt nhất châu Á.',
  images: [],
  html: `\
<section>
  <p><strong>New World Phu Quoc Resort</strong> tọa lạc trên Bãi Kem — một trong những bãi biển đẹp nhất Phú Quốc với cát trắng mịn và nước xanh trong. Đây là khu nghỉ dưỡng 5 sao thuộc chuỗi New World Hotels & Resorts, mang đến không gian lưu trú tinh tế, ấm áp, phù hợp cho cả gia đình lẫn du khách tìm kiếm sự thư giãn riêng tư.</p>
  <p>Đặc biệt, New World Phu Quoc Resort đã được tạp chí <strong>Travel + Leisure vinh danh</strong> là khu nghỉ dưỡng tốt nhất cho gia đình tại châu Á — Thái Bình Dương — đại diện duy nhất của Việt Nam!</p>

  <blockquote><strong>🏨 Ưu đãi từ 9 Trip:</strong> Đặt villa New World Phu Quoc — giá tốt nhất thị trường, tặng kèm đưa đón sân bay. <a href="/hotels">Xem giá ngay →</a></blockquote>
</section>

<section>
  <h2>Phong cách thiết kế — Làng chài giữa lòng resort 5 sao</h2>
  <p>New World sở hữu phong cách độc đáo: kết hợp hài hòa giữa nét hiện đại tinh tế và tinh thần mộc mạc của làng chài ven biển Việt Nam. Biệt thự mái lá truyền thống, bao quanh bởi vườn nhiệt đới xanh mát và hồ bơi riêng — gần gũi mà vẫn đẳng cấp.</p>
</section>

<section>
  <h2>7 Hạng biệt thự — Mỗi loại một trải nghiệm</h2>
  <ul>
    <li><strong>Garden Pool Villa (125m², 6 khách):</strong> Ẩn mình giữa vườn nhiệt đới, hồ bơi riêng, không gian gần gũi thiên nhiên.</li>
    <li><strong>Premium Pool Villa (261m², 6 khách):</strong> Khu sinh hoạt chung rộng rãi, bếp lớn, bàn ăn — lý tưởng quây quần gia đình.</li>
    <li><strong>Deluxe Pool Villa (167m², 8 khách):</strong> 4 phòng ngủ, khu BBQ, ghế tắm nắng — dành cho đại gia đình.</li>
    <li><strong>Ocean Pool Villa (261m², 6 khách):</strong> View thẳng ra biển — thức dậy cùng sóng vỗ.</li>
    <li><strong>Grand Pool Villa (298m², 6 khách):</strong> Không gian sinh hoạt rộng, bếp hiện đại, hồ bơi xanh mát.</li>
    <li><strong>Beachfront Pool Villa (298m², 6 khách):</strong> Vài bước chân từ vườn ra biển — sống trọn cùng đại dương.</li>
    <li><strong>President Pool Villa (415m², 8 khách):</strong> Đẳng cấp nhất — 3 căn biệt lập, 2 phòng ngủ mỗi căn.</li>
  </ul>
</section>

<section>
  <h2>Ẩm thực & Tiện ích</h2>
  <ul>
    <li><strong>The Bay Kitchen:</strong> Ẩm thực quốc tế & Việt Nam, không gian mở thoáng đãng.</li>
    <li><strong>LUA Grill & Bar:</strong> Ẩm thực Ý hiện đại, bếp mở, nguyên liệu địa phương tươi ngon.</li>
    <li><strong>Coco Beach House:</strong> Hải sản tươi, cocktail nhiệt đới — đậm chất biển.</li>
    <li><strong>The Zen Spa:</strong> Liệu pháp chăm sóc cơ thể & tinh thần.</li>
    <li><strong>Kid's Club, Health Club, Aqua World Water Park:</strong> Vui chơi cho mọi lứa tuổi.</li>
    <li><strong>Kem Beach Driving Range:</strong> Tập golf view biển.</li>
  </ul>
</section>

<section>
  <h2>Vị trí đắc địa — Khám phá Nam Đảo</h2>
  <ul>
    <li><strong>Mũi Ông Đội:</strong> Ngắm bình minh & hoàng hôn cùng một vị trí.</li>
    <li><strong>Sun World Hon Thom:</strong> 15 phút di chuyển — cáp treo vượt biển dài nhất thế giới.</li>
    <li><strong>Thị trấn Hoàng Hôn:</strong> Check-in "triệu view", show Kiss of the Sea & Symphony of the Sea.</li>
  </ul>
</section>

${FOOTER}`,
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function processOne(b) {
  console.log(`\n🚀 ${b.slug}`);
  const { map, feat } = await processImages(b.slug, b.images);
  const content = resolve(b.html, map);
  await saveBlog(b.slug, {
    slug: b.slug, title: b.title, excerpt: b.excerpt, content,
    featuredImage: feat || (b.images.length > 0 ? map[Object.keys(map)[0]] : null),
    category: b.category, tags: b.tags,
    sourceUrl: b.sourceUrl, sourceName: b.sourceName,
    metaTitle: b.metaTitle, metaDescription: b.metaDescription,
  });
  return { slug: b.slug, ok: true, chars: content.length, imgs: Object.keys(map).length };
}

async function main() {
  fs.mkdirSync(tempDir, { recursive: true });
  const blogs = [B3, B4, B5, B6, B7, B8, B9, B10];
  const results = [];

  console.log('═══════════════════════════════════════════');
  console.log(`  MEGA PIPELINE — ${blogs.length} blogs`);
  console.log('═══════════════════════════════════════════');

  for (const b of blogs) {
    try {
      results.push(await processOne(b));
    } catch (e) {
      console.error(`❌ ${b.slug}: ${e.message}`);
      results.push({ slug: b.slug, ok: false, error: e.message });
    }
  }

  console.log('\n═══════════════════════════════════════════');
  console.log('  FINAL SUMMARY');
  console.log('═══════════════════════════════════════════');
  let totalOK = 0, totalChars = 0, totalImgs = 0;
  for (const r of results) {
    if (r.ok) { totalOK++; totalChars += r.chars; totalImgs += r.imgs; console.log(`  ✅ ${r.slug} — ${r.chars}c, ${r.imgs} imgs`); }
    else console.log(`  ❌ ${r.slug} — ${r.error}`);
  }
  console.log(`\n  Total: ${totalOK}/${blogs.length} blogs, ${totalChars} chars, ${totalImgs} images`);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
