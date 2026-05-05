/**
 * Footer - Chân trang toàn cục.
 */
import Link from "next/link";
import Image from "next/image";
import { SITE, COMPANY, SOCIAL, SITE_DESCRIPTION } from "@/lib/constants";

const fbIcon = "/images/Facebook.webp";
const igIcon = "/images/Insta.webp";
const ytIcon = "/images/Youtube.webp";
const ttIcon = "/images/Tiktok.webp";
const logoImg = "/images/favicon.webp";

export default function Footer() {
  const socialLinks = [
    { href: SOCIAL.facebook, icon: fbIcon, alt: "Facebook" },
    { href: SOCIAL.instagram, icon: igIcon, alt: "Instagram" },
    { href: SOCIAL.youtube, icon: ytIcon, alt: "YouTube" },
    { href: SOCIAL.tiktok, icon: ttIcon, alt: "TikTok" },
    { href: SOCIAL.zalo, icon: null, alt: "Zalo", label: "ZA" },
  ];

  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company info */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Image
                src={logoImg}
                alt={SITE.name}
                width={40}
                height={40}
                className="rounded-lg"
              />
              <span className="font-bold text-xl text-white">{SITE.name}</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              {SITE_DESCRIPTION}
            </p>
            <div className="flex gap-3 mt-4">
              {socialLinks.map((social) => (
                <a
                  key={social.alt}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 bg-gray-800 rounded flex items-center justify-center hover:bg-blue-600 transition-colors"
                  aria-label={social.alt}
                >
                  {social.icon ? (
                    <Image
                      src={social.icon}
                      alt={social.alt}
                      width={18}
                      height={18}
                    />
                  ) : (
                    <span className="text-white text-xs font-bold">{social.label}</span>
                  )}
                </a>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="font-semibold text-white mb-4">Liên kết nhanh</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/tours" className="hover:text-blue-400 transition-colors">Tour du lịch</Link></li>
              <li><Link href="/hotels" className="hover:text-blue-400 transition-colors">Khách sạn</Link></li>
              <li><Link href="/activities" className="hover:text-blue-400 transition-colors">Hoạt động</Link></li>
              <li><Link href="/search" className="hover:text-blue-400 transition-colors">Tìm kiếm</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold text-white mb-4">Hỗ trợ</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/cancellation" className="hover:text-blue-400 transition-colors">Chính sách hủy</Link></li>
              <li><Link href="/terms" className="hover:text-blue-400 transition-colors">Điều khoản sử dụng</Link></li>
              <li><Link href="/privacy" className="hover:text-blue-400 transition-colors">Chính sách bảo mật</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-white mb-4">Liên hệ</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <span>📍</span> {COMPANY.address}
              </li>
              <li className="flex items-center gap-2">
                <span>📞</span> <a href={`tel:+84${SITE.phone.substring(1)}`} className="hover:text-blue-400 transition-colors">{SITE.phone}</a>
              </li>
              <li className="flex items-center gap-2">
                <span>✉️</span> <a href={`mailto:${SITE.email}`} className="hover:text-blue-400 transition-colors">{SITE.email}</a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Accepted Payment Methods */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <span className="text-xs text-gray-500 mr-2">Phương thức thanh toán:</span>
            {/* VNPay */}
            <span className="inline-flex items-center gap-1 bg-gray-800 rounded px-3 py-1.5 text-xs text-gray-300">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm3 3h2v2H8V8zm4 0h2v2h-2V8zm-4 4h2v2H8v-2zm4 0h2v2h-2v-2z"/></svg>
              VNPay
            </span>
            {/* MoMo */}
            <span className="inline-flex items-center gap-1 bg-gray-800 rounded px-3 py-1.5 text-xs text-gray-300">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="9"/></svg>
              MoMo
            </span>
            {/* PayPal */}
            <span className="inline-flex items-center gap-1 bg-gray-800 rounded px-3 py-1.5 text-xs text-gray-300">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797H8.864c-.69 0-1.283.502-1.39 1.186l-.06.307c-.108.552-.62.99-1.18.99H5.998c-.69 0-1.283.502-1.39 1.186l-.72 3.649c-.033.165-.04.334-.01.5.055.24.24.42.498.42h.005z"/></svg>
              PayPal
            </span>
            {/* Visa/Mastercard */}
            <span className="inline-flex items-center gap-1 bg-gray-800 rounded px-3 py-1.5 text-xs text-gray-300">
              💳 Visa/Mastercard
            </span>
            {/* Cash */}
            <span className="inline-flex items-center gap-1 bg-gray-800 rounded px-3 py-1.5 text-xs text-gray-300">
              💵 Tiền mặt
            </span>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-sm text-gray-500">
          © 2026 {COMPANY.legalName}. Tất cả quyền được bảo lưu.
        </div>
      </div>
    </footer>
  );
}