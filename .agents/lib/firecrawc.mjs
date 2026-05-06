  // import 'dotenv/config';
  import Firecrawl from '@mendable/firecrawl-js';
  import fs from 'fs';

  export const FireCrawl = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY });

  export async function saveFileSync(fileName, data) {
      const myVariable = data;
      const dataToSave = JSON.stringify(myVariable, null, 4);
      try {
        await fs.writeFileSync(fileName, dataToSave, 'utf8');
        console.log('Lưu file hoàn tất');
      } catch (err) {
        console.error('Lỗi khi lưu file:', err);
      }
    }
  
    export async function crawlHotelsOnBooking() {
  
      // URL tìm kiếm của bạn
      const searchUrl = 'https://www.booking.com/searchresults.vi.html?ss=Phú+Quốc&ssne=Phú+Quốc&ssne_untouched=Phú+Quốc&checkin=2026-06-11&checkout=2026-06-12&dest_id=-3726177&dest_type=city&order=bayesian_review_score&group_adults=2&req_adults=2&no_rooms=1&group_children=0&req_children=0&age=&req_age=&slp_r_match_to=0&shw_aparth=1&nflt=price%3DVND-900000-4100000-1%3Bpopular_activities%3D302%3Bht_id%3D206%3Breview_score%3D90%3Bht_id%3D204%3Breview_score%3D80%3Bclass%3D4%3Bclass%3D5%3Bdi%3D15809%3Bdi%3D15808%3Bdi%3D15803%3Bdi%3D15807%3Bhotelfacility%3D433&lang=vi&soz=1&lang_changed=1';
  
      console.log('🔍 Đang bắt đầu quét danh sách khách sạn...');
  
      try {
        const res = await FireCrawl.scrape(searchUrl, {
            formats: ['json', 'markdown'], // Lấy markdown để debug nếu cần
            timeout: 600000, // Tăng timeout lên 60 giây vì trang có thể tải chậm
            actions: [
                { type: 'wait', milliseconds: 3000 }, // Đợi trang load hẳn
                { type: 'scroll', direction: 'down' }, // Cuộn để kích hoạt lazy load
                { type: 'wait', milliseconds: 2000 }
            ],
            // Giới hạn AI chỉ quét trong các thẻ tiêu đề khách sạn để chính xác hơn
            includeTags: ['a[data-testid="title-link"]', '.sr_property_block_main_row'], 
            onlyMainContent: true,
            formats: [{
                type: 'json',
                schema: {
                    type: 'object',
                    properties: {
                        hotelUrls: {
                            type: 'array',
                            items: { type: 'string' },
                            description: "Absolute URLs of the hotel detail pages"
                        }
                    },
                    required: ['hotelUrls']
                },
                prompt: "Extract all hotel detail URLs from the search results. They are usually links with data-testid='title-link'. Return absolute URLs only."
            }]
        });

        if (!res.success) {
            console.error('❌ Lỗi Firecrawl:', res.error);
            return [];
        }

        // BƯỚC DEBUG: Nếu không có kết quả, in thử 500 ký tự đầu của markdown
        if (!res.json?.hotelUrls || res.json.hotelUrls.length === 0) {
            console.log('⚠️ Không tìm thấy URL nào. Kiểm tra nội dung trang web:');
            console.log(res.markdown?.substring(0, 500)); 
            // Nếu đoạn log trên hiện ra "Security Check" hoặc "Robot", nghĩa là bạn bị chặn IP.
            return [];
        }

        // Làm sạch URL (Xóa bỏ các tham số rác như &label, &sid để mảng URL gọn hơn)
        const cleanUrls = res.json.hotelUrls.map(url => {
            try {
                const u = new URL(url);
                return `${u.origin}${u.pathname}`; // Chỉ giữ lại domain và đường dẫn
            } catch { return url; }
        });

        const uniqueUrls = [...new Set(cleanUrls)]; // Loại bỏ URL trùng lặp
        
        console.log(`✅ Tìm thấy ${uniqueUrls.length} khách sạn.`);
        
        // Lưu vào file
        await saveFileSync('phuquoc_hotel_links.json', uniqueUrls);
        
        return uniqueUrls;

    } catch (error) {
        console.error('❌ Lỗi thực thi:', error.message);
        return [];
    }
}
crawlHotelsOnBooking ();