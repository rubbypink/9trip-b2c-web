/**
 * Site constants — Thông tin công ty, social links, cấu hình site.
 * Tập trung để tránh trùng lặp và dễ bảo trì.
 */

export const SITE = {
  /** Domain chính thức */
  url: "https://9tripphuquoc.com",
  /** Tên site hiển thị */
  name: "9 Trip Phú Quốc",
  /** Mô tả ngắn */
  tagline: "Đặt Tour & Khách Sạn Trực Tuyến",
  /** Số điện thoại hỗ trợ */
  phone: "0877901901",
  /** Email liên hệ */
  email: "info@9tripphuquoc.com",
};

export const COMPANY = {
  /** Tên pháp lý đầy đủ */
  legalName: "Công ty TNHH 9 Trip Phú Quốc",
  /** Địa chỉ trụ sở */
  address: "17 Chu Văn An, Khu Phố 5, đặc khu Phú Quốc, An Giang",
  /** Mã số thuế (để trống nếu chưa có) */
  taxCode: "1702261981",
};

export const SOCIAL = {
  facebook: "https://facebook.com/9tripphuquoc",
  instagram: "https://www.instagram.com/9tripphuquoc/",
  youtube: "https://www.youtube.com/@9tripphuquoc",
  tiktok: "https://www.tiktok.com/@9tripphuquoc",
  zalo: "https://m.me/0877901901",
};

/** Mô tả ngắn dùng trong footer và metadata */
export const SITE_DESCRIPTION =
  "Nền tảng đặt Tour du lịch, Khách sạn, Hoạt động trải nghiệm và Thuê xe hàng đầu Việt Nam. Giá tốt nhất, hỗ trợ 24/7.";

/** Từ khóa SEO */
export const SITE_KEYWORDS =
  "tour du lịch, đặt khách sạn, travel, booking, vinpearl, phú quốc, 9trip";

/** Số lượng item mỗi trang cho listing */
export const PAGE_SIZE = 20;

/** Blur placeholder cho next/image (gray-200 SVG) */
export const BLUR_DATA_URL =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MDAgMzAwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTVlN2ViIi8+PC9zdmc+";
