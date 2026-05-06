/**
 * Seed Blog Data Script — Khởi tạo dữ liệu mẫu cho blog module.
 *
 * Tạo dữ liệu mẫu cho collection:
 * - posts: Danh sách bài viết blog
 *
 * Chạy: bun run src/scripts/seedBlog.js
 */

import admin from 'firebase-admin';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Init Firebase Admin SDK ──────────────────────────────────────────

// Thử tìm service account JSON theo pattern của dự án
const serviceAccountPath = path.resolve(__dirname, "../../tripphuquoc-db-fs-firebase-adminsdk-fbsvc-5695f7d555.json");

if (fs.existsSync(serviceAccountPath)) {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8')))
    });
  }
} else {
  // Fallback dùng environment variables nếu có
  if (!admin.apps.length) {
    try {
      admin.initializeApp();
    } catch (error) {
      console.error("❌ Không tìm thấy service account JSON và không thể khởi tạo mặc định.");
      console.error("Vui lòng kiểm tra file:", serviceAccountPath);
      process.exit(1);
    }
  }
}

const db = admin.apps.length ? getFirestore() : null;

// ─── Config ───────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes("--dry-run");

// ─── Mock Data ────────────────────────────────────────────────────────

const posts = [
  {
    title: "Kinh nghiệm du lịch Phú Quốc tự túc 2026: Lịch trình 4 ngày 3 đêm",
    slug: "kinh-nghiem-du-lich-phu-quoc-tu-tuc-2026",
    excerpt: "Khám phá đảo Ngọc Phú Quốc với lịch trình chi tiết 4 ngày 3 đêm, từ những bãi biển hoang sơ đến các khu vui chơi đẳng cấp thế giới.",
    content: `
      <article>
        <p>Phú Quốc, hòn đảo lớn nhất Việt Nam, luôn là điểm đến hấp dẫn du khách bởi vẻ đẹp hoang sơ của những bãi biển cát trắng mịn, làn nước trong xanh và hệ sinh thái đa dạng. Năm 2026, Phú Quốc càng trở nên lôi cuốn hơn với nhiều dịch vụ du lịch mới mẻ và đẳng cấp.</p>
        <h2>Lịch trình gợi ý 4 ngày 3 đêm</h2>
        <h3>Ngày 1: Khám phá Bắc Đảo - VinWonders & Grand World</h3>
        <p>Sau khi hạ cánh xuống sân bay Phú Quốc, bạn nên di chuyển về phía Bắc Đảo. Đây là nơi tập trung các khu vui chơi giải trí lớn nhất. Grand World - "Thành phố không ngủ" là điểm đến lý tưởng để dạo chơi, thưởng thức ẩm thực và xem các show diễn nghệ thuật đặc sắc như "Tinh hoa Việt Nam".</p>
        <h3>Ngày 2: Trải nghiệm Cáp treo Hòn Thơm & Nam Đảo</h3>
        <p>Đừng bỏ lỡ cơ hội đi cáp treo vượt biển dài nhất thế giới để đến với Hòn Thơm. Tại đây, bạn có thể thỏa sức vui chơi tại công viên nước Aquatopia. Chiều về, hãy ghé thăm Bãi Sao - một trong những bãi biển đẹp nhất Phú Quốc với bãi cát trắng mịn màng.</p>
        <h3>Ngày 3: Tour 4 đảo & Lặn ngắm san hô</h3>
        <p>Một chuyến đi cano khám phá các hòn đảo nhỏ như Hòn Móng Tay, Hòn Gầm Ghì, Hòn Mây Rút sẽ mang lại cho bạn những trải nghiệm khó quên. Bạn sẽ được lặn ngắm những rặng san hô rực rỡ sắc màu dưới làn nước trong vắt.</p>
        <h3>Ngày 4: Mua sắm đặc sản & Tạm biệt đảo Ngọc</h3>
        <p>Trước khi ra sân bay, hãy ghé thăm chợ Dương Đông hoặc các cơ sở sản xuất nước mắm, vườn tiêu để mua quà cho người thân. Những chai nước mắm truyền thống hay những gói tiêu thơm nồng là món quà không thể thiếu sau chuyến đi Phú Quốc.</p>
        <h2>Lưu ý khi du lịch Phú Quốc</h2>
        <ul>
          <li>Thời điểm đẹp nhất: Từ tháng 11 đến tháng 4 năm sau (mùa khô).</li>
          <li>Phương tiện di chuyển: Nên thuê xe máy để chủ động khám phá hoặc đi taxi/grab nếu đi nhóm đông.</li>
          <li>Trang phục: Mang theo đồ bơi, kem chống nắng và mũ rộng vành.</li>
        </ul>
        <p>Hy vọng với lịch trình này, bạn sẽ có một chuyến du lịch Phú Quốc thật trọn vẹn và ý nghĩa!</p>
      </article>
    `,
    featuredImage: "https://picsum.photos/800/450?random=1",
    author: "Biên tập viên 9Trip",
    category: "Kinh nghiệm",
    tags: ["Phú Quốc", "Du lịch tự túc", "Lịch trình"],
    status: "published"
  },
  {
    title: "Top 10 bãi biển đẹp nhất Phú Quốc bạn không nên bỏ lỡ",
    slug: "top-10-bai-bien-dep-nhat-phu-quoc",
    excerpt: "Phú Quốc sở hữu những bãi biển tuyệt đẹp làm say lòng du khách. Cùng 9Trip điểm qua 10 bãi biển không thể bỏ qua khi đến đây.",
    content: `
      <article>
        <p>Được mệnh danh là đảo Ngọc, Phú Quốc không thiếu những bãi biển đẹp như tranh vẽ. Mỗi bãi biển lại mang một vẻ đẹp riêng, từ sôi động, hiện đại đến hoang sơ, tĩnh lặng.</p>
        <h2>1. Bãi Sao - Thiên đường cát trắng</h2>
        <p>Nằm ở phía Nam đảo, Bãi Sao nổi tiếng với bãi cát trắng tinh khôi và làn nước xanh ngọc bích. Đây là nơi lý tưởng để tắm biển và chụp những bức ảnh "sống ảo" lung linh.</p>
        <h2>2. Bãi Khem - Vẻ đẹp quyến rũ</h2>
        <p>Cạnh Bãi Sao là Bãi Khem, nơi có những khu resort đẳng cấp quốc tế. Bãi biển ở đây rất sạch và yên tĩnh, phù hợp cho những ai muốn tìm không gian nghỉ dưỡng riêng tư.</p>
        <h2>3. Bãi Trường - Nơi ngắm hoàng hôn đẹp nhất</h2>
        <p>Với chiều dài hơn 20km, Bãi Trường là bãi biển dài nhất Phú Quốc. Đây cũng là địa điểm tuyệt vời nhất để ngắm cảnh hoàng hôn buông xuống trên biển.</p>
        <h2>4. Bãi Ông Lang - Vẻ đẹp bình yên</h2>
        <p>Nếu bạn thích sự tĩnh lặng, hãy đến với Bãi Ông Lang. Bãi biển này có nhiều ghềnh đá và nước rất trong, cực kỳ thích hợp để lặn ngắm cá và san hô gần bờ.</p>
        <h2>5. Bãi Dài - Hoang sơ và thơ mộng</h2>
        <p>Nằm ở phía Tây Bắc, Bãi Dài từng được bình chọn là một trong những bãi biển hoang sơ đẹp nhất thế giới. Không gian ở đây rất thoáng đãng và gần gũi với thiên nhiên.</p>
        <p>Ngoài ra còn có các bãi biển khác như Bãi Gành Dầu, Bãi Vũng Bầu, Hòn Móng Tay... mỗi nơi đều xứng đáng để bạn dành thời gian khám phá.</p>
        <p>Hãy lên kế hoạch và trải nghiệm ngay những bãi biển tuyệt vời này trong chuyến đi sắp tới của bạn nhé!</p>
      </article>
    `,
    featuredImage: "https://picsum.photos/800/450?random=2",
    author: "Biên tập viên 9Trip",
    category: "Du lịch",
    tags: ["Bãi biển", "Phú Quốc", "Top list"],
    status: "published"
  },
  {
    title: "Ăn gì ở Phú Quốc? Khám phá ẩm thực đảo Ngọc từ A đến Z",
    slug: "an-gi-o-phu-quoc-am-thuc-dao-ngoc",
    excerpt: "Ẩm thực Phú Quốc không chỉ có hải sản tươi sống mà còn rất nhiều món ăn đặc sản độc đáo mang hương vị biển cả.",
    content: `
      <article>
        <p>Đến với Phú Quốc, bên cạnh việc tham quan các danh lam thắng cảnh, việc thưởng thức ẩm thực địa phương là một trải nghiệm không thể bỏ qua. Đảo Ngọc sẽ chiêu đãi bạn bằng những món ăn tươi ngon và đậm đà.</p>
        <h2>Gỏi cá trích - Món ăn trứ danh</h2>
        <p>Đây là món ăn đặc sản số một của Phú Quốc. Cá trích tươi sống được làm sạch, thái lát mỏng rồi trộn với hành tây, hành tím, dừa nạo... Cuốn cá với bánh tráng, rau sống và chấm nước mắm đậu phộng, bạn sẽ cảm nhận được vị ngọt của cá, vị béo của dừa và vị cay nồng của nước chấm.</p>
        <h2>Bún quậy Kiến Xây - Trải nghiệm độc đáo</h2>
        <p>Món bún này có cái tên khá lạ tai và cách thưởng thức cũng rất đặc biệt. Thực khách sẽ tự tay pha chế nước chấm theo khẩu vị riêng. Sợi bún được làm tại chỗ, ăn kèm với chả tôm, chả cá tươi rói và nước dùng nóng hổi.</p>
        <h2>Hải sản nướng tại Chợ Đêm Dương Đông</h2>
        <p>Chợ đêm là thiên đường của các tín đồ hải sản. Tại đây, bạn có thể tìm thấy đủ loại từ nhum biển, còi biên mai, mực trứng đến các loại ốc, ghẹ... Tất cả đều được chế biến ngay tại chỗ, thơm phức và hấp dẫn.</p>
        <h2>Bún kèn - Hương vị dân dã</h2>
        <p>Bún kèn là món ăn ít người biết đến nhưng lại mang hương vị rất riêng. Nước dùng được nấu từ cá xay nhuyễn kết hợp với nước cốt dừa và bột nghệ, tạo nên màu vàng bắt mắt và vị béo ngậy đặc trưng.</p>
        <p>Đừng quên thưởng thức thêm rượu sim, mật sim hay các loại bánh khéo khi dạo chơi trên đảo nhé. Ẩm thực Phú Quốc chắc chắn sẽ làm hài lòng cả những thực khách khó tính nhất!</p>
      </article>
    `,
    featuredImage: "https://picsum.photos/800/450?random=3",
    author: "Biên tập viên 9Trip",
    category: "Ẩm thực",
    tags: ["Ẩm thực", "Đặc sản", "Ăn uống"],
    status: "published"
  },
  {
    title: "Review VinWonders và Vinpearl Safari Phú Quốc: Có gì hấp dẫn?",
    slug: "review-vinwonders-vinpearl-safari-phu-quoc",
    excerpt: "Hai khu vui chơi giải trí lớn nhất Phú Quốc có gì mà khiến du khách mê mẩn đến vậy? Cùng review chi tiết trong bài viết này.",
    content: `
      <article>
        <p>VinWonders và Vinpearl Safari là hai điểm đến không thể bỏ qua, đặc biệt là với các gia đình có trẻ nhỏ khi đến Phú Quốc. Đây là tổ hợp vui chơi giải trí và bảo tồn động vật quy mô lớn hàng đầu khu vực.</p>
        <h2>Vinpearl Safari - Công viên chăm sóc và bảo tồn động vật bán hoang dã</h2>
        <p>Đây là công viên safari đầu tiên tại Việt Nam được thiết kế theo mô hình safari thế giới. Bạn sẽ được ngồi trên xe bus chuyên dụng để đi vào khu vực sinh sống của các loài động vật hoang dã như hổ, sư tử, tê giác, hươu cao cổ... Cảm giác được tận mắt ngắm nhìn chúng ở khoảng cách gần vô cùng thú vị.</p>
        <h2>VinWonders - Công viên chủ đề lớn nhất Việt Nam</h2>
        <p>Với 6 phân khu tượng trưng cho 6 vùng lãnh địa cùng 12 chủ đề đặc sắc, VinWonders mang đến cho bạn những trải nghiệm giải trí đỉnh cao. Từ những trò chơi cảm giác mạnh đầy thách thức đến khu vực công viên nước sôi động và thủy cung hình rùa khổng lồ - Cung điện Hải Vương.</p>
        <h3>Kinh nghiệm đi chơi:</h3>
        <ul>
          <li>Nên đi Safari vào buổi sáng sớm khi thời tiết còn mát mẻ và các loài thú đang hoạt động tích cực.</li>
          <li>Dành buổi chiều và tối cho VinWonders để tận hưởng các trò chơi và xem show diễn Once rực rỡ.</li>
          <li>Mua vé combo để tiết kiệm chi phí và thuận tiện trong việc di chuyển giữa hai khu vực.</li>
        </ul>
        <p>Chắc chắn bạn sẽ có những giây phút vui chơi sảng khoái và nhiều kỷ niệm đẹp tại đây!</p>
      </article>
    `,
    featuredImage: "https://picsum.photos/800/450?random=4",
    author: "Biên tập viên 9Trip",
    category: "Review",
    tags: ["VinWonders", "Safari", "Vui chơi"],
    status: "published"
  },
  {
    title: "Hướng dẫn cách di chuyển đến Phú Quốc: Máy bay, tàu cao tốc hay phà?",
    slug: "huong-dan-di-chuyen-den-phu-quoc",
    excerpt: "Có nhiều cách để bạn có thể đặt chân đến đảo Ngọc. Tùy vào ngân sách và thời gian mà bạn có thể chọn phương tiện phù hợp nhất.",
    content: `
      <article>
        <p>Việc di chuyển đến Phú Quốc ngày nay đã trở nên rất thuận tiện và dễ dàng. Bạn có thể lựa chọn đường hàng không hoặc đường biển tùy theo điểm xuất phát và sở thích cá nhân.</p>
        <h2>1. Đường hàng không - Nhanh chóng và tiện lợi</h2>
        <p>Đây là cách phổ biến nhất. Các hãng hàng không như Vietnam Airlines, Vietjet Air, Bamboo Airways đều có chuyến bay thẳng từ Hà Nội, TP.HCM, Đà Nẵng, Hải Phòng... đến sân bay quốc tế Phú Quốc. Thời gian bay chỉ mất khoảng 1-2 giờ.</p>
        <h2>2. Đường biển - Trải nghiệm thú vị</h2>
        <p>Nếu bạn xuất phát từ các tỉnh miền Tây như Kiên Giang, bạn có thể chọn đi tàu cao tốc hoặc phà từ Rạch Giá hoặc Hà Tiên.</p>
        <ul>
          <li><strong>Tàu cao tốc:</strong> Mất khoảng 1 giờ 15 phút từ Hà Tiên hoặc 2 giờ 30 phút từ Rạch Giá. Các hãng tàu uy tín như Superdong, Phú Quốc Express.</li>
          <li><strong>Phà:</strong> Phù hợp nếu bạn muốn mang theo xe máy hoặc ô tô ra đảo. Thời gian di chuyển bằng phà sẽ lâu hơn tàu cao tốc một chút.</li>
        </ul>
        <h2>3. Di chuyển tại Phú Quốc</h2>
        <p>Sau khi đến đảo, bạn có thể thuê xe máy (khoảng 120k-150k/ngày), đi taxi, grab hoặc sử dụng hệ thống xe bus điện VinBus miễn phí nếu ở khu vực Bắc Đảo.</p>
        <p>Hy vọng những thông tin này sẽ giúp bạn lựa chọn được phương thức di chuyển phù hợp nhất cho chuyến hành trình của mình!</p>
      </article>
    `,
    featuredImage: "https://picsum.photos/800/450?random=5",
    author: "Biên tập viên 9Trip",
    category: "Hướng dẫn",
    tags: ["Di chuyển", "Máy bay", "Tàu cao tốc"],
    status: "published"
  }
];

// ─── Main ─────────────────────────────────────────────────────────────

/**
 * Main function to seed blog posts.
 */
async function main() {
  console.log("=".repeat(70));
  console.log("🌱 9 Trip — Seed Blog Data Script");
  console.log("=".repeat(70));

  console.log(`Mode: ${DRY_RUN ? "🧪 DRY RUN (no writes)" : "✍️  LIVE (will write to Firestore)"}`);
  console.log();

  const startTime = Date.now();
  let created = 0;
  let skipped = 0;

  try {
    for (const post of posts) {
      const docId = post.slug;
      
      if (DRY_RUN) {
        console.log(`   🧪 [DRY RUN] Would create: ${docId}`);
        created++;
        continue;
      }

      const docRef = db.collection("posts").doc(docId);
      const existing = await docRef.get();

      if (existing.exists) {
        console.log(`   ⏭️  ${docId} — already exists, skipping`);
        skipped++;
        continue;
      }

      const now = Timestamp.now();
      const postDoc = {
        ...post,
        createdAt: now,
        updatedAt: now
      };

      await docRef.set(postDoc);
      console.log(`   ✅ Created: ${docId}`);
      created++;
    }
  } catch (error) {
    console.error("\n❌ Fatal error:", error.message);
    process.exit(1);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n" + "=".repeat(70));
  console.log("📊 SEED SUMMARY");
  console.log("=".repeat(70));
  console.log(`Time elapsed: ${elapsed}s`);
  console.log(`Created: ${created}`);
  console.log(`Skipped: ${skipped}`);
  console.log();
}

main().catch(console.error);
