/**
 * Batch Blog Pipeline — Process multiple blogs end-to-end.
 * 
 * For each blog: downloads images → optimizes webp → uploads Storage → saves Firestore.
 * Uses the same Firebase Admin + Sharp pattern as the single-blog script.
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
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
  if (serviceAccount.privateKey) {
    serviceAccount.privateKey = serviceAccount.privateKey.replace(/\\n/g, '\n');
  }
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'tripphuquoc-db-fs.firebasestorage.app',
  });
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

// ─────────────────────────────────────────────────────────────────────────────
// Company Info (used in all blog footers)
// ─────────────────────────────────────────────────────────────────────────────

const COMPANY_FOOTER = `
  <p style="text-align:center; font-size:0.85rem; color:#6b7280; margin-top:0.5rem;">
    <strong>Công ty TNHH 9 Trip Phú Quốc</strong> — 17 Chu Văn An, Khu Phố 5, đặc khu Phú Quốc, An Giang<br>
    MST: 1702261981
  </p>`;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function downloadFile(url, destPath) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://www.google.com/',
      'Accept': 'image/avif,image/webp,image/*,*/*;q=0.8',
    },
  });
  if (!response.ok) throw new Error(`Download failed: ${response.status} ${url}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(destPath, buffer);
  return destPath;
}

async function optimizeImage(inputPath, outputPath, width = 800) {
  await sharp(inputPath)
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 82, effort: 6 })
    .toFile(outputPath);
  const outputStats = fs.statSync(outputPath);
  const inputStats = fs.statSync(inputPath);
  return {
    outputKB: Math.round(outputStats.size / 1024),
    inputKB: Math.round(inputStats.size / 1024),
    ratio: Math.round((1 - outputStats.size / inputStats.size) * 100),
  };
}

async function uploadToStorage(localPath, storagePath) {
  await bucket.upload(localPath, {
    destination: storagePath,
    metadata: {
      contentType: 'image/webp',
      cacheControl: 'public, max-age=31536000, immutable',
    },
  });
  const [url] = await bucket.file(storagePath).getSignedUrl({
    action: 'read',
    expires: Date.now() + 365 * 24 * 60 * 60 * 1000,
  });
  return url;
}

async function processImages(slug, images) {
  const urlMap = {};
  let featuredUrl = null;

  for (const img of images) {
    const placeholder = img.placeholder;
    console.log(`  📥 ${placeholder}: ${img.url.substring(0, 70)}...`);
    
    const ext = '.jpg';
    const rawPath = path.join(tempDir, `${slug}_${img.id}_raw${ext}`);
    const webpPath = path.join(tempDir, `${slug}_${img.id}.webp`);

    try {
      await downloadFile(img.url, rawPath);
      const stats = await optimizeImage(rawPath, webpPath, img.width || 800);
      const storagePath = `blogs/${slug}/${img.id}.webp`;
      const storageUrl = await uploadToStorage(webpPath, storagePath);

      fs.unlinkSync(rawPath);
      fs.unlinkSync(webpPath);

      urlMap[placeholder] = storageUrl;
      if (img.role === 'featured') featuredUrl = storageUrl;
      
      console.log(`    ✅ ${stats.outputKB}KB (${stats.ratio}% smaller)`);
    } catch (err) {
      console.error(`    ❌ Failed: ${err.message}`);
    }
  }

  return { urlMap, featuredUrl };
}

function replacePlaceholders(html, urlMap) {
  let result = html;
  for (const [placeholder, url] of Object.entries(urlMap)) {
    result = result.replaceAll(placeholder, url);
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Blog #2: BonBonCar — Kinh Nghiệm Du Lịch Phú Quốc 2026
// ─────────────────────────────────────────────────────────────────────────────

const blog2 = {
  slug: 'kinh-nghiem-du-lich-phu-quoc-2026-an-gi-o-dau',
  title: 'Kinh Nghiệm Du Lịch Phú Quốc 2026: Ăn Gì, Ở Đâu, Đi Như Thế Nào?',
  excerpt: 'Trọn bộ kinh nghiệm du lịch Phú Quốc 2026 chi tiết nhất: thời tiết, lịch trình 4N3Đ, top địa điểm vui chơi không thể bỏ lỡ, 5 món đặc sản nhất định phải thử và mẹo di chuyển siêu tiết kiệm. Cùng 9 Trip Phú Quốc khám phá đảo Ngọc!',
  category: 'kinh-nghiem-du-lich',
  tags: ['phu-quoc', 'du-lich-2026', 'kinh-nghiem', 'am-thuc', 'lich-trinh', 'vinwonders'],
  sourceUrl: 'https://www.bonboncar.vn/blog/kinh-nghiem-du-lich-phu-quoc-2026-chi-tiet/',
  sourceName: 'BonBonCar Blog',
  images: [
    {
      id: 'featured',
      placeholder: '[BLOG2-IMG-01]',
      url: 'https://www.bonboncar.vn/blog/content/images/size/w3000/2026/04/tips-voor-Phu-Quoc-in-vietnam-1.jpg',
      role: 'featured',
      width: 1200,
    },
    {
      id: 'img-02',
      placeholder: '[BLOG2-IMG-02]',
      url: 'https://www.bonboncar.vn/blog/content/images/2026/04/image-484.png',
      role: 'inline',
      width: 800,
    },
    {
      id: 'img-03',
      placeholder: '[BLOG2-IMG-03]',
      url: 'https://www.bonboncar.vn/blog/content/images/2026/04/image-483.png',
      role: 'inline',
      width: 800,
    },
    {
      id: 'img-04',
      placeholder: '[BLOG2-IMG-04]',
      url: 'https://www.bonboncar.vn/blog/content/images/2026/04/image-487.png',
      role: 'inline',
      width: 800,
    },
    {
      id: 'img-05',
      placeholder: '[BLOG2-IMG-05]',
      url: 'https://www.bonboncar.vn/blog/content/images/2026/04/image-485.png',
      role: 'inline',
      width: 800,
    },
    {
      id: 'img-06',
      placeholder: '[BLOG2-IMG-06]',
      url: 'https://www.bonboncar.vn/blog/content/images/2026/04/image-488.png',
      role: 'inline',
      width: 800,
    },
  ],
  htmlTemplate: `\
<section>
  <p>
    Không ngẫu nhiên mà Phú Quốc luôn giữ vững ngôi vị "Đảo Ngọc" của Việt Nam và liên tục lọt top những hòn đảo tuyệt vời nhất thế giới. Sở hữu đường bờ biển dài 150km với làn nước trong xanh như ngọc, những cánh rừng nguyên sinh hùng vĩ và hệ sinh thái giải trí khổng lồ, Phú Quốc năm 2026 đã mang một diện mạo hoàn toàn mới: hiện đại, đẳng cấp nhưng vẫn giữ được nét hoang sơ quyến rũ.
  </p>

  <p>
    Nếu bạn đang ấp ủ một chuyến đi trọn vẹn cùng gia đình hay hội bạn thân, bài viết tổng hợp <strong>kinh nghiệm du lịch Phú Quốc 2026</strong> siêu chi tiết dưới đây chính là tất cả những gì bạn cần. Từ việc canh vé máy bay, chọn điểm ăn chơi cho đến bí quyết di chuyển chủ động — hãy cùng <strong>9 Trip Phú Quốc</strong> lưu ngay cẩm nang này nhé!
  </p>

  <figure>
    <img src="[BLOG2-IMG-01]" alt="Toàn cảnh bãi biển Phú Quốc với làn nước trong xanh và bờ cát trắng trải dài — thiên đường nghỉ dưỡng 2026" loading="lazy" />
    <figcaption>Phú Quốc 2026 — điểm đến All-in-One cho mọi phong cách du lịch</figcaption>
  </figure>

  <blockquote>
    <strong>🎁 Ưu đãi từ 9 Trip Phú Quốc:</strong> 
    Đặt <a href="/tours">tour Phú Quốc trọn gói</a> tại 9 Trip — bao gồm vé VinWonders, cáp treo Hòn Thơm, tour cano 4 đảo — giá chỉ từ <strong>2.990.000đ/khách</strong>. 
    <a href="/tours">Xem chi tiết →</a>
  </blockquote>
</section>

<section>
  <h2>1. Du Lịch Phú Quốc Mùa Nào Đẹp Nhất Năm 2026?</h2>

  <p>Đảo Ngọc nằm trong Vịnh Thái Lan mang đặc trưng khí hậu nhiệt đới gió mùa, chia làm 2 mùa rõ rệt:</p>

  <ul>
    <li><strong>Mùa khô (tháng 11 - tháng 4 năm sau):</strong> Nắng vàng óng ả, biển trong vắt, sóng êm — lý tưởng cho cano lặn san hô, chèo SUP, ngắm hoàng hôn. Đây là mùa cao điểm, giá phòng tăng 20-30%. Nên đặt trước ít nhất 1 tháng.</li>
    <li><strong>Mùa mưa (tháng 5 - tháng 10):</strong> Gió Tây Nam mang mưa rào. Bờ Tây (Bãi Trường) sóng lớn nhưng bờ Đông (Bãi Sao, Bãi Khem) vẫn êm và trong xanh. Ưu điểm: chi phí siêu rẻ, resort đồng loạt giảm giá, suối Tranh và Suối Đá Ngọn đầy nước tạo cảnh check-in cực thơ mộng.</li>
  </ul>

  <figure>
    <img src="[BLOG2-IMG-02]" alt="So sánh thời tiết Phú Quốc giữa mùa khô và mùa mưa" loading="lazy" />
    <figcaption>Sự khác biệt rõ rệt giữa hai mùa tại Phú Quốc</figcaption>
  </figure>
</section>

<section>
  <h2>2. Chuẩn Bị Gì Cho Chuyến Đi Phú Quốc Tự Túc?</h2>
  <ul>
    <li><strong>Giấy tờ:</strong> CCCD gắn chip/Passport. Đặc biệt đừng quên <strong>Giấy phép lái xe</strong> nếu bạn có ý định thuê xe tự lái khám phá đảo.</li>
    <li><strong>Trang phục:</strong> Quần áo mỏng nhẹ, đồ bơi, đầm maxi. Kính râm, kem chống nắng thân thiện với san hô, mũ rộng vành, thuốc xịt chống côn trùng.</li>
    <li><strong>Tài chính:</strong> Các nhà hàng đều hỗ trợ quét QR, nhưng vẫn nên mang theo 1-2 triệu tiền mặt lẻ để mua vé tham quan nhỏ hoặc ăn vặt tại chợ đêm.</li>
  </ul>
</section>

<section>
  <h2>3. Hướng Dẫn Di Chuyển Đến Và Đi Lại Ở Phú Quốc</h2>

  <h3>3.1. Phương Tiện Đến Đảo Ngọc</h3>
  <p>
    Với sự nâng cấp mạnh mẽ của Cảng hàng không Quốc tế Phú Quốc, <strong>máy bay</strong> vẫn là lựa chọn số 1:
  </p>
  <ul>
    <li><strong>Từ Hà Nội:</strong> Bay ~2h10, giá vé 1.500.000đ - 3.000.000đ/chiều.</li>
    <li><strong>Từ TP.HCM / Cần Thơ:</strong> Bay chưa tới 1 tiếng, giá vé 600.000đ - 1.200.000đ/chiều.</li>
    <li><strong>Từ miền Tây:</strong> Tàu cao tốc Superdong, Phú Quốc Express từ Rạch Giá hoặc Hà Tiên, giá 250.000đ - 340.000đ/vé.</li>
  </ul>

  <h3>3.2. Đi Lại Trên Đảo</h3>
  <p>Phú Quốc rất rộng (589 km²). Từ Dương Đông lên Bắc Đảo (VinWonders) ~30km, xuống Nam Đảo (Cáp treo Hòn Thơm) ~30km.</p>
  <ul>
    <li><strong>Xe máy:</strong> 120k - 150k/ngày. Phù hợp cặp đôi, phượt thủ. Nhược điểm: nắng nóng, bụi bặm.</li>
    <li><strong>Taxi/Grab:</strong> Phù hợp chặng ngắn, nhưng đi Bắc-Nam có thể tốn 1-1.5 triệu/ngày.</li>
    <li><strong>Xe buýt điện VinBus:</strong> Miễn phí, sạch sẽ, phủ dọc đảo. Tải app VinBus để theo dõi lộ trình.</li>
  </ul>
</section>

<section>
  <h2>4. Du Lịch Phú Quốc Ở Đâu?</h2>

  <figure>
    <img src="[BLOG2-IMG-03]" alt="Bảng so sánh các khu vực lưu trú tại Phú Quốc" loading="lazy" />
    <figcaption>So sánh nhanh các phân khúc lưu trú</figcaption>
  </figure>

  <p><a href="/hotels">Xem toàn bộ khách sạn Phú Quốc tại 9 Trip →</a></p>

  <ul>
    <li><strong>Resort 5 sao (Bắc/Nam Đảo):</strong> 3.5 - 10 triệu/đêm. Sang trọng, bãi biển riêng, hồ bơi vô cực. Phù hợp nghỉ dưỡng cao cấp, trăng mật.</li>
    <li><strong>Khách sạn 3-4 sao (Dương Đông):</strong> 800k - 2 triệu/đêm. Trung tâm, tiện ăn uống chợ đêm, dễ di chuyển.</li>
    <li><strong>Homestay/Hostel:</strong> 200k - 500k/đêm. Thiết kế độc lạ, chill, gần gũi thiên nhiên. Phù hợp sinh viên, phượt thủ.</li>
  </ul>
</section>

<section>
  <h2>5. Chơi Gì Ở Phú Quốc? Top Địa Điểm Không Thể Bỏ Lỡ</h2>

  <article>
    <h3>5.1. Khu Vực Trung Tâm (Dương Đông)</h3>
    <ul>
      <li><strong>Miếu Dinh Cậu & Dinh Bà:</strong> Biểu tượng tâm linh, tọa độ ngắm hoàng hôn rực rỡ nhất thị trấn.</li>
      <li><strong>Chợ Đêm Phú Quốc:</strong> Mở cửa 18h-23h. Thiên đường hải sản nướng, kẹo chỉ, kem cuộn.</li>
      <li><strong>Làng chài Hàm Ninh:</strong> Cách trung tâm 16km, nơi ngắm bình minh hoàn hảo và nổi tiếng với <strong>Ghẹ Hàm Ninh</strong> chắc thịt.</li>
    </ul>
  </article>

  <figure>
    <img src="[BLOG2-IMG-04]" alt="Làng chài Hàm Ninh yên bình với những bè nổi — thiên đường ẩm thực hải sản tươi sống" loading="lazy" />
    <figcaption>Làng chài Hàm Ninh — điểm đến không thể bỏ lỡ</figcaption>
  </figure>

  <article>
    <h3>5.2. Bắc Đảo — Thiên Đường Giải Trí</h3>
    <ul>
      <li><strong>VinWonders Phú Quốc (950.000đ):</strong> Công viên chủ đề lớn nhất Việt Nam, 6 phân khu, công viên nước khổng lồ, thủy cung hình rùa.</li>
      <li><strong>Vinpearl Safari (650.000đ):</strong> Công viên bảo tồn động vật bán hoang dã lớn nhất Đông Nam Á.</li>
      <li><strong>Grand World:</strong> Thành phố không ngủ — check-in miễn phí kênh đào Venice, bảo tàng Gấu Teddy, show thực cảnh "Tinh hoa Việt Nam".</li>
    </ul>
  </article>

  <blockquote>
    <strong>🎢 Combo giải trí Bắc Đảo:</strong> 
    Đặt vé VinWonders + Safari + Grand World tại <strong>9 Trip Phú Quốc</strong> giá ưu đãi chỉ từ <strong>1.200.000đ</strong>. 
    <a href="/activities">Đặt vé ngay →</a>
  </blockquote>

  <article>
    <h3>5.3. Nam Đảo — Biển Xanh & Lịch Sử</h3>
    <ul>
      <li><strong>Cáp treo Hòn Thơm:</strong> Tuyến cáp treo 3 dây vượt biển dài nhất thế giới (gần 8km). View cabin xuống biển xanh ngắt không thể quên.</li>
      <li><strong>Thị trấn Hoàng Hôn & Cầu Hôn:</strong> Kiến trúc Địa Trung Hải rực rỡ sườn đồi hướng biển.</li>
      <li><strong>Tour lặn ngắm san hô 4 đảo:</strong> Hòn Móng Tay, Hòn Mây Rút, Hòn Gầm Ghì — cano, lặn, SUP, flycam.</li>
      <li><strong>Nhà tù Phú Quốc:</strong> Di tích lịch sử, vào cửa miễn phí.</li>
    </ul>
  </article>

  <figure>
    <img src="[BLOG2-IMG-05]" alt="Cáp treo Hòn Thơm vượt biển với view ngoạn mục xuống làn nước xanh ngọc bích" loading="lazy" />
    <figcaption>Nam Đảo — thiên đường biển xanh và giải trí đẳng cấp</figcaption>
  </figure>
</section>

<section>
  <h2>6. Ăn Gì Ở Phú Quốc? 5 Món Đặc Sản Nhất Định Phải Thử</h2>

  <figure>
    <img src="[BLOG2-IMG-06]" alt="Tô gỏi cá trích Phú Quốc tươi ngon cuốn bánh tráng rau rừng — đặc sản trứ danh đảo Ngọc" loading="lazy" />
    <figcaption>Gỏi cá trích — món ăn làm nên thương hiệu ẩm thực Phú Quốc</figcaption>
  </figure>

  <ul>
    <li><strong>Gỏi cá trích:</strong> Cá trích tươi thái mỏng, bóp gỏi chua ngọt cùng dừa nạo, cuốn bánh tráng rau rừng, chấm nước mắm đậu phộng béo ngậy.</li>
    <li><strong>Bún quậy:</strong> Sợi bún ép tươi tại chỗ, nước lèo nóng làm chín chả tôm, chả mực quết dưới đáy tô. Gia vị tự pha. (Quán nổi tiếng: Bún quậy Kiến Xây, Thanh Hùng)</li>
    <li><strong>Nhum biển nướng mỡ hành:</strong> Cầu gai giàu dinh dưỡng, nướng than hồng thêm đậu phộng rang.</li>
    <li><strong>Bánh canh ghẹ:</strong> Nước dùng thanh ngọt hải sản, thịt ghẹ tươi, sợi bánh canh bột lọc dai dẻo.</li>
    <li><strong>Tiết canh cua:</strong> Đặc sản độc lạ — cua biển to, nhiều gạch, vị béo mặn thơm hương biển.</li>
  </ul>
</section>

<section>
  <h2>7. Mua Gì Làm Quà Ở Phú Quốc?</h2>
  <ul>
    <li><strong>Nước mắm Phú Quốc:</strong> Đặc sản trứ danh (nhà thùng Khải Hoàn, Phụng Hưng).</li>
    <li><strong>Hạt tiêu:</strong> Tiêu sọ, tiêu xanh — cay nồng, thơm hơn tiêu vùng khác (vườn tiêu Khu Tượng).</li>
    <li><strong>Rượu Sim:</strong> Lên men từ trái sim rừng, ngọt nhẹ, tốt cho tiêu hóa.</li>
    <li><strong>Ngọc trai:</strong> Nuôi cấy tự nhiên tại biển Phú Quốc.</li>
  </ul>
</section>

<section>
  <h2>8. Gợi Ý Lịch Trình Phú Quốc 4 Ngày 3 Đêm</h2>
  <ul>
    <li><strong>Ngày 1 — Dương Đông & Hoàng Hôn:</strong> Sáng hạ cánh, ăn Bún Quậy. Trưa nhận phòng. Chiều Dinh Cậu ngắm hoàng hôn, tắm Bãi Trường. Tối Chợ đêm hải sản.</li>
    <li><strong>Ngày 2 — Quậy Bắc Đảo:</strong> Sáng Safari xem thú. Chiều VinWonders công viên nước. Tối Grand World nhạc nước Venice.</li>
    <li><strong>Ngày 3 — Khám Phá Nam Đảo:</strong> Sáng cano 4 đảo lặn san hô. Chiều Thị trấn Hoàng Hôn, Cầu Hôn. Tối hải sản Bãi Khem.</li>
    <li><strong>Ngày 4 — Mua Sắm & Tạm Biệt:</strong> Sáng trả phòng, làng chài Hàm Ninh ăn ghẹ. Mua đặc sản về làm quà.</li>
  </ul>
</section>

<footer>
  <p style="text-align:center; font-style:italic; border-top:1px solid #e5e7eb; padding-top:2rem; margin-top:3rem;">
    ✈️ <strong>Cùng 9 Trip Phú Quốc — khám phá đảo Ngọc theo cách trọn vẹn nhất!</strong><br>
    📞 Hotline: <strong>0877.901.901</strong> | 🌐 <a href="https://9tripphuquoc.com">9tripphuquoc.com</a><br>
    📧 Email: <strong>info@9tripphuquoc.com</strong>
  </p>
  ${COMPANY_FOOTER}
</footer>`,
};

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function processBlog(blog) {
  console.log(`\n🚀 Processing: ${blog.slug}`);
  console.log(`   Title: ${blog.title}`);

  // 1. Process images
  console.log('   📸 Processing images...');
  const { urlMap, featuredUrl } = await processImages(blog.slug, blog.images);
  console.log(`   ✅ ${Object.keys(urlMap).length}/${blog.images.length} images processed`);

  // 2. Build final HTML
  const content = replacePlaceholders(blog.htmlTemplate, urlMap);
  const remaining = content.match(/\[BLOG\d+-IMG-\d+\]/g);
  if (remaining) {
    console.error(`   ⚠️ Unresolved placeholders: ${remaining.length}`);
  }

  // 3. Save to Firestore
  const docData = {
    slug: blog.slug,
    title: blog.title,
    excerpt: blog.excerpt,
    content,
    featuredImage: featuredUrl,
    author: '9 Trip Phú Quốc',
    category: blog.category,
    tags: blog.tags,
    status: 'published',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    metaTitle: `${blog.title} — 9 Trip`,
    metaDescription: blog.excerpt,
    sourceUrl: blog.sourceUrl,
    sourceName: blog.sourceName,
  };

  await db.collection('blogs').doc(blog.slug).set(docData);
  console.log(`   💾 Saved to Firestore: blogs/${blog.slug}`);
  console.log(`   📊 Content: ${content.length} chars | Images: ${Object.keys(urlMap).length}`);

  return { slug: blog.slug, success: true, imageCount: Object.keys(urlMap).length, contentLength: content.length };
}

// ─────────────────────────────────────────────────────────────────────────────
// Execute
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  fs.mkdirSync(tempDir, { recursive: true });

  const results = [];
  
  console.log('═══════════════════════════════════════════════');
  console.log('  BATCH BLOG PIPELINE — Processing Blogs #2');
  console.log('═══════════════════════════════════════════════');

  try {
    const result = await processBlog(blog2);
    results.push(result);
  } catch (err) {
    console.error(`❌ Blog #2 failed: ${err.message}`);
    results.push({ slug: blog2.slug, success: false, error: err.message });
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('═══════════════════════════════════════════════');
  for (const r of results) {
    if (r.success) {
      console.log(`  ✅ ${r.slug}: ${r.contentLength} chars, ${r.imageCount} images`);
    } else {
      console.log(`  ❌ ${r.slug}: ${r.error}`);
    }
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
