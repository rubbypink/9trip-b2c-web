/**
 * Blog #1 Firestore Save — Save refactored blog to Firestore collection `blogs`
 * 
 * Uses firebase-admin SDK to write the blog document with:
 * - Resolved image URLs in content HTML
 * - Featured image from Storage
 * - Proper metadata, tags, timestamps
 */

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const serviceAccountPath = path.resolve(projectRoot, 'tripphuquoc-db-fs-firebase-adminsdk-fbsvc-5695f7d555.json');

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

// ─────────────────────────────────────────────────────────────────────────────
// Load resolved image URLs
// ─────────────────────────────────────────────────────────────────────────────

const imagesData = JSON.parse(fs.readFileSync(path.join(__dirname, 'blog1-images.json'), 'utf-8'));
const urlMap = {};
imagesData.results.forEach(r => {
  if (r.storageUrl) urlMap[r.placeholder] = r.storageUrl;
});

console.log('📋 Image URL Map:');
Object.entries(urlMap).forEach(([k, v]) => console.log(`  ${k} → ${v.substring(0, 80)}...`));

// ─────────────────────────────────────────────────────────────────────────────
// Blog Content HTML (with placeholder replacement)
// ─────────────────────────────────────────────────────────────────────────────

const rawHtml = `\
<section>
  <p>
    Bản đồ du lịch <a href="/blog/cam-nang-du-lich-phu-quoc">Phú Quốc</a> hiện phân hóa thành ba khu vực chính. 
    Phía bắc — tổ hợp nghỉ dưỡng và công viên chủ đề quy mô lớn. Trung tâm Dương Đông — đầu mối giao thương sầm uất. 
    Còn <strong>Nam đảo</strong> — nơi hội tụ trọn vẹn mọi loại hình từ lưu trú, vui chơi giải trí đến mua sắm, ẩm thực, 
    tất cả gói gọn trong cùng một cụm hạ tầng hiện đại và thuận tiện bậc nhất.
  </p>

  <p>
    Nam đảo bao gồm phường An Thới và quần đảo An Thới với 15 hòn đảo lớn nhỏ. Không giống phía bắc thiên về 
    nghỉ dưỡng biệt lập giữa rừng nguyên sinh, Nam đảo là sự giao thoa đầy mê hoặc giữa nhịp sống bản địa chân chất 
    và các tổ hợp giải trí đẳng cấp mang phong cách Địa Trung Hải rực rỡ.
  </p>

  <p>
    Tại Nam đảo, bạn có thể trải nghiệm xuyên suốt từ <strong>cáp treo vượt biển dài nhất thế giới</strong>, 
    những show diễn đa phương tiện mãn nhãn, đến chuỗi khách sạn quốc tế sang trọng — tất cả chỉ trong vài phút di chuyển. 
    Cùng <strong>9 Trip Phú Quốc</strong> khám phá trọn bộ cẩm nang này nhé!
  </p>

  <blockquote>
    <strong>🎁 Deal hot từ 9 Trip Phú Quốc:</strong> 
    Đặt <a href="/tours">tour cano lặn ngắm san hô 4 đảo Nam đảo</a> chỉ từ <strong>650.000đ/khách</strong> — 
    bao trọn gói cano, thiết bị lặn, hướng dẫn viên, bữa trưa hải sản trên đảo. 
    <a href="/tours">Xem chi tiết tại đây →</a>
  </blockquote>
</section>

<section>
  <h2>Nam đảo Phú Quốc mùa nào đẹp nhất?</h2>

  <p>
    <strong>Mùa khô (tháng 11 - tháng 4 năm sau)</strong> chính là "thời điểm vàng" để chinh phục Nam đảo. 
    Nhiệt độ trung bình dao động 27-28°C, biển lặng như gương, nước trong vắt nhìn thấu đáy — điều kiện hoàn hảo 
    cho các tour cano khám phá đảo nhỏ, lặn ngắm san hô và thưởng thức những show diễn ngoài trời đỉnh cao.
  </p>

  <p>
    <strong>Mùa mưa (tháng 5 - tháng 10)</strong> — đừng vội lo! Nam đảo nằm khuất gió hơn so với bãi Trường phía tây 
    nên biển thường êm hơn hẳn. Đây cũng là mùa "săn" deal khách sạn giá tốt, trải nghiệm Phú Quốc vắng vẻ, thư thái. 
    Chỉ cần theo dõi dự báo thời tiết để né các đợt áp thấp nhiệt đới là bạn đã có một chuyến đi tiết kiệm mà vẫn trọn vẹn.
  </p>

  <figure>
    <img 
      src="[IMG-01-URL]" 
      alt="Toàn cảnh Nam đảo Phú Quốc nhìn từ trên cao — Thị trấn Hoàng Hôn rực rỡ bên bờ biển xanh ngọc bích"
      loading="lazy"
    />
    <figcaption>Một góc Nam đảo Phú Quốc — nơi giao thoa giữa Địa Trung Hải và biển xanh. Ảnh: Bích Phương</figcaption>
  </figure>
</section>

<section>
  <h2>Di chuyển đến và tại Nam đảo</h2>

  <h3>🛫 Đường hàng không</h3>
  <p>
    Cuối năm 2025 đánh dấu bước ngoặt lớn khi hãng hàng không Sun Airways Phú Quốc chính thức khai thác, 
    mở thêm nhiều đường bay thẳng đến đảo Ngọc. Hiện có Vietnam Airlines, Bamboo Airways, Vietjet Air và Sun Airways 
    phục vụ các chặng từ TP.HCM, Hà Nội, Hải Phòng, Thanh Hóa, Vinh, Huế, Đà Nẵng, Nha Trang. Giá vé khứ hồi 
    TP.HCM - Phú Quốc dao động 3-4 triệu đồng, chặng Hà Nội từ 5-7 triệu đồng tùy thời điểm. 
    <strong>Mẹo từ 9 Trip:</strong> đặt vé trước 1 tháng để có giá tốt nhất.
  </p>

  <figure>
    <img 
      src="[IMG-02-URL]" 
      alt="Xe điện buggy đưa đón du khách dạo quanh những con đường rực rỡ sắc màu tại Thị trấn Hoàng Hôn"
      loading="lazy"
    />
    <figcaption>Xe điện buggy — "phương tiện quốc dân" kết nối mọi điểm đến tại Nam đảo. Ảnh: colourpop.traveller</figcaption>
  </figure>

  <h3>🚋 Xe điện (Buggy) — Phương tiện "quốc dân"</h3>
  <p>
    Tại Nam đảo, <strong>xe điện</strong> là phương tiện di chuyển chính kết nối mọi điểm vui chơi và lưu trú, 
    hoạt động từ 8h30 đến 23h hàng ngày. Chi phí siêu hợp lý: chỉ <strong>15.000đ/lượt</strong> nội khu 
    Thị trấn Hoàng Hôn, hoặc <strong>300.000đ/xe/45 phút</strong> nếu thuê riêng.
  </p>
  <p>
    Hệ thống trạm dừng được bố trí thuận tiện tại: chợ VUI-Fest Bazaar, khách sạn La Festa Phu Quoc, 
    đường Amalfi, sân khấu Kiss Of The Sea, ga cáp treo Sun World Hon Thom, khu Hillside. 
    Tuyến liên vùng từ <strong>Bãi Kem đi Sunset Town</strong> chỉ 100.000đ/xe hoặc 20.000đ/khách (nhóm 5 người).
  </p>
</section>

<section>
  <h2>Lưu trú tại Nam đảo — Đa dạng cho mọi phong cách</h2>

  <p>
    Nam đảo sở hữu hệ thống lưu trú đa phân khúc, từ sang trọng đến bình dân, đáp ứng mọi nhu cầu. 
    <a href="/hotels">Xem toàn bộ khách sạn Nam đảo tại 9 Trip →</a>
  </p>

  <ul>
    <li>
      <strong>La Festa Phu Quoc (Curio Collection by Hilton):</strong> 
      Nằm ngay trung tâm Thị trấn Hoàng Hôn, phòng suite và duplex thiết kế theo chủ đề, view toàn cảnh Cầu Hôn. 
      Giá từ 4 triệu đồng/đêm. 
      <a href="/hotels">Xem giá tốt nhất tại 9 Trip →</a>
    </li>
    <li>
      <strong>Shophouse ven biển Sunset Town:</strong> 
      Lựa chọn tiết kiệm — chỉ từ 1 triệu đồng/đêm, ngay sát phố đi bộ và trạm xe điện.
    </li>
    <li>
      <strong>Premier Village Phu Quoc Resort:</strong> 
      Nơi duy nhất ngắm được cả bình minh lẫn hoàng hôn từ cùng một vị trí. Biệt thự sát biển, ẩn mình giữa thiên nhiên hoang sơ.
    </li>
  </ul>
</section>

<section>
  <h2>Ẩm thực Nam đảo — Thiên đường cho tín đồ sành ăn</h2>

  <p>Nam đảo chiều lòng mọi khẩu vị, từ quán bình dân địa phương đến nhà hàng quốc tế đẳng cấp:</p>

  <ul>
    <li><strong>Nhà hàng Mare:</strong> Đậm chất Địa Trung Hải — pasta thủ công, pizza nướng lò, view hoàng hôn bên hồ bơi. Mở cửa 15h-23h.</li>
    <li><strong>Nhà hàng Seta:</strong> Dim sum Quảng Đông thủ công, vịt quay truyền thống. Mở cửa 11h-22h.</li>
    <li><strong>The Merchant:</strong> Cơm Việt ba miền chuẩn vị — lựa chọn hoàn hảo cho ai thèm hương vị quê nhà.</li>
    <li><strong>Francesca:</strong> Lounge bar tầng 7, hồ bơi vô cực ngắm hoàng hôn — view "triệu đô".</li>
    <li><strong>Luna Folk:</strong> Quán bar cổ điển ấm cúng — điểm dừng chân lý tưởng sau bữa tối.</li>
  </ul>

  <p>Chi phí trung bình tại các nhà hàng: <strong>800.000đ - 1.500.000đ/khách</strong>.</p>

  <p>
    Muốn ăn ngon mà rẻ? Ghé ngay phường An Thới: <strong>Bún kèn Cô Thu, Bún quậy Kiến Xây</strong> cho bữa sáng; 
    chợ An Thới với bánh canh chả cá, bánh cống nóng hổi; hải sản tươi sống tại 
    <strong>An Thới Phát Lộc, Ốc đảo An Thới, Sorrento</strong>.
  </p>
</section>

<section>
  <h2>Top điểm vui chơi, giải trí không thể bỏ lỡ</h2>

  <article>
    <h3>🏖️ Bãi Sao</h3>
    <p>
      Một trong những bãi biển đẹp nhất Phú Quốc với dải cát trắng mịn dài hơn 7km, làn nước trong xanh như ngọc. 
      Nơi lý tưởng để tắm biển, chèo kayak, hay đơn giản là dạo bước trên bờ cát đón bình minh.
    </p>
  </article>

  <article>
    <h3>🌅 Cầu Hôn (Kiss Bridge)</h3>
    <p>
      Kiệt tác kiến trúc dài 800m với hai nhánh cầu độc lập cách nhau chỉ 30cm — điểm ngắm hoàng hôn 
      "đặc sản" của đảo Ngọc. Vé tham quan: <strong>50.000đ</strong> (7h-16h) hoặc <strong>100.000đ</strong> (16h-19h). 
      Thời điểm lý tưởng nhất: 16h-17h, khi mặt trời dần buông xuống biển.
    </p>

    <figure>
      <img 
        src="[IMG-03-URL]" 
        alt="Hoàng hôn rực đỏ trên Cầu Hôn — hai nhánh cầu chạm nhau tạo khoảnh khắc lãng mạn khó quên giữa biển trời Phú Quốc"
        loading="lazy"
      />
      <figcaption>Khoảnh khắc hoàng hôn huyền thoại trên Cầu Hôn. Ảnh: Bích Phương</figcaption>
    </figure>
  </article>

  <article>
    <h3>🚡 Cáp treo Hòn Thơm</h3>
    <p>
      Tuyến cáp treo 3 dây vượt biển <strong>dài nhất thế giới</strong>, đưa bạn đến tổ hợp giải trí Hòn Thơm 
      với công viên nước Aquatopia và làng Exotica. 
      <strong>Giá vé: 750.000đ/người lớn, 600.000đ/trẻ em</strong> (miễn phí bé dưới 1m). Hoạt động 9h-17h hàng ngày.
    </p>
    <blockquote>
      <strong>🎫 Săn vé cáp treo giá tốt:</strong> 
      9 Trip Phú Quốc đang có ưu đãi vé cáp treo Hòn Thơm chỉ từ <strong>650.000đ</strong> — 
      bao gồm vé khứ hồi + công viên nước Aquatopia. 
      <a href="/activities">Đặt vé ngay →</a>
    </blockquote>
  </article>

  <article>
    <h3>🎆 Show diễn "Kiss of the Sea"</h3>
    <p>
      Đại tiệc ánh sáng kết hợp nước, lửa, laser, 3D mapping và pháo hoa trên sân khấu mặt biển — 
      diễn ra <strong>21h mỗi tối (trừ thứ Ba)</strong>. Tiếp nối là màn pháo hoa tầm cao lúc 21h30. 
      Giá vé: <strong>700.000đ - 1.000.000đ</strong>. Một trải nghiệm mãn nhãn không thể bỏ lỡ!
    </p>
  </article>

  <article>
    <h3>🛍️ Chợ đêm VuiFest Bazaar</h3>
    <p>
      Khu chợ ven biển sôi động, <strong>miễn phí vào cửa</strong>, mở cửa 16h-24h. Nghệ thuật đường phố, 
      ẩm thực địa phương, quà lưu niệm độc đáo — tất cả hòa quyện trong không khí náo nhiệt đậm chất Địa Trung Hải.
    </p>

    <figure>
      <img 
        src="[IMG-04-URL]" 
        alt="Chợ đêm VuiFest Bazaar rực rỡ ánh đèn ven biển tại Sunset Town — thiên đường ẩm thực và mua sắm về đêm"
        loading="lazy"
      />
      <figcaption>Chợ đêm ven biển VuiFest Bazaar — sôi động và đầy sắc màu. Ảnh: Bích Phương</figcaption>
    </figure>
  </article>

  <article>
    <h3>🤿 Tour cano lặn ngắm san hô — Quần đảo An Thới</h3>
    <p>
      Xuất phát từ cảng An Thới, hành trình khám phá các đảo nhỏ: Hòn Móng Tay, Hòn Gầm Ghì, Hòn Mây Rút. 
      Thời điểm đẹp nhất: <strong>tháng 11 đến tháng 4</strong>. Giá tour trọn gói: 
      <strong>900.000đ - 1.200.000đ/khách</strong>, bao gồm ăn trưa, thiết bị lặn, flycam chụp ảnh.
    </p>

    <figure>
      <img 
        src="[IMG-05-URL]" 
        alt="Du khách dạo bước trên bãi cát trắng hoang sơ tại Hòn Mây Rút — một trong những hòn đảo đẹp nhất quần đảo An Thới"
        loading="lazy"
      />
      <figcaption>Hòn Mây Rút — viên ngọc thô giữa lòng quần đảo An Thới. Ảnh: Bích Phương</figcaption>
    </figure>
  </article>

  <article>
    <h3>🛐 Dinh Bà, Dinh Cậu & Nhà tù Phú Quốc</h3>
    <p>
      Điểm đến tâm linh và lịch sử không thể bỏ qua. Dinh Bà, Dinh Cậu là nơi ngư dân cầu an, 
      gắn với nhiều truyền thuyết huyền bí. Nhà tù Phú Quốc — di tích lịch sử được phục dựng sống động — 
      <strong>mở cửa miễn phí</strong> 7h-17h hàng ngày.
    </p>
  </article>
</section>

<section>
  <h2>Lưu ý quan trọng từ 9 Trip Phú Quốc</h2>

  <ul>
    <li><strong>Đặt phòng sớm:</strong> Mùa cao điểm (tháng 11-4), resort và khách sạn Nam đảo kín phòng trước 3-4 tuần.</li>
    <li><strong>Chống say sóng:</strong> Tour cano tốc độ cao dễ gây say. Uống thuốc trước 30 phút, ngồi giữa cano.</li>
    <li><strong>Trang phục lịch sự:</strong> Khi tham quan di tích tâm linh và Nhà tù Phú Quốc.</li>
    <li><strong>Không tự ý khám phá đảo hoang:</strong> Nhiều đảo nhỏ thuộc khu vực kiểm soát an ninh — chỉ tham gia tour có cấp phép.</li>
    <li><strong>Kiểm tra lịch phà/tàu:</strong> Có mặt tại cảng trước 30 phút, theo dõi dự báo thời tiết nếu đi mùa mưa.</li>
    <li><strong>Di chuyển an toàn ban đêm:</strong> Nếu thuê xe máy tự túc, kiểm tra nhiên liệu và bản đồ số.</li>
  </ul>
</section>

<footer>
  <p style="text-align:center; font-style:italic; border-top:1px solid #e5e7eb; padding-top:2rem; margin-top:3rem;">
    ✈️ <strong>Cùng 9 Trip Phú Quốc — khám phá đảo Ngọc theo cách trọn vẹn nhất!</strong><br>
    📞 Hotline: <strong>0877.901.901</strong> | 🌐 <a href="https://9tripphuquoc.com">9tripphuquoc.com</a><br>
    📧 Email: <strong>info@9tripphuquoc.com</strong>
  </p>
  <p style="text-align:center; font-size:0.85rem; color:#6b7280; margin-top:0.5rem;">
    <strong>Công ty TNHH 9 Trip Phú Quốc</strong> — 17 Chu Văn An, Khu Phố 5, đặc khu Phú Quốc, An Giang<br>
    MST: 1702261981
  </p>
</footer>`;

// Replace placeholders with actual URLs
let content = rawHtml;
for (const [placeholder, url] of Object.entries(urlMap)) {
  content = content.replaceAll(placeholder, url);
}

// Verify no placeholders remain
const remaining = content.match(/\[IMG-\d+-URL\]/g);
if (remaining) {
  console.error('❌ Unresolved placeholders:', remaining);
  process.exit(1);
}
console.log('✅ All image placeholders resolved');

// ─────────────────────────────────────────────────────────────────────────────
// Save to Firestore
// ─────────────────────────────────────────────────────────────────────────────

const slug = 'cam-nang-du-lich-nam-dao-phu-quoc-2026';
const docData = {
  slug,
  title: 'Cẩm Nang Du Lịch Nam Đảo Phú Quốc 2026: Tất Tần Tật Từ A-Z',
  excerpt: 'Nam đảo Phú Quốc đang trở thành tâm điểm du lịch mới với Thị trấn Hoàng Hôn, Cầu Hôn, cáp treo Hòn Thơm và những bãi biển đẹp nhất đảo Ngọc. Cùng 9 Trip Phú Quốc khám phá cẩm nang từ A-Z: thời điểm đẹp nhất, cách di chuyển, lưu trú, ăn uống và tất cả điểm vui chơi không thể bỏ lỡ tại Nam đảo trong năm 2026.',
  content,
  featuredImage: urlMap['[IMG-01-URL]'],
  author: '9 Trip Phú Quốc',
  category: 'cam-nang-du-lich',
  tags: ['phu-quoc', 'nam-dao', 'du-lich-2026', 'sunset-town', 'an-thoi', 'kinh-nghiem'],
  status: 'published',
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  metaTitle: 'Cẩm Nang Du Lịch Nam Đảo Phú Quốc 2026: Tất Tần Tật Từ A-Z — 9 Trip',
  metaDescription: 'Nam đảo Phú Quốc đang trở thành tâm điểm du lịch mới. Cùng 9 Trip Phú Quốc khám phá cẩm nang từ A-Z: thời điểm đẹp nhất, cách di chuyển, lưu trú, ăn uống và tất cả điểm vui chơi không thể bỏ lỡ tại Nam đảo năm 2026.',
  sourceUrl: 'https://vnexpress.net/cam-nang-du-lich-nam-dao-phu-quoc-5060005.html',
  sourceName: 'VnExpress',
};

async function saveBlog() {
  console.log(`\n💾 Saving blog to Firestore: blogs/${slug}`);
  
  const docRef = db.collection('blogs').doc(slug);
  const existing = await docRef.get();
  
  if (existing.exists) {
    console.log('⚠️  Document already exists. Overwriting...');
  }
  
  await docRef.set(docData);
  console.log(`✅ Blog saved successfully!`);
  console.log(`   Slug: ${slug}`);
  console.log(`   Title: ${docData.title}`);
  console.log(`   Content length: ${content.length} chars`);
  console.log(`   Images: ${Object.keys(urlMap).length}`);
  console.log(`   Tags: ${docData.tags.join(', ')}`);
}

saveBlog().catch(err => {
  console.error('❌ Save failed:', err);
  process.exit(1);
});
