/**
 * Footer - Chân trang toàn cục.
 */
import Link from "next/link";
import Image from "next/image";
import { SITE, COMPANY, SOCIAL, SITE_DESCRIPTION } from "@/lib/constants";

import fbIcon from "@/media/pics/Facebook.webp";
import igIcon from "@/media/pics/Insta.webp";
import ytIcon from "@/media/pics/Youtube.webp";
import ttIcon from "@/media/pics/Tiktok.webp";
import logoImg from "@/media/pics/favicon.webp";

export default function Footer() {
  const socialLinks = [
    { href: SOCIAL.facebook, icon: fbIcon, alt: "Facebook" },
    { href: SOCIAL.instagram, icon: igIcon, alt: "Instagram" },
    { href: SOCIAL.youtube, icon: ytIcon, alt: "YouTube" },
    { href: SOCIAL.tiktok, icon: ttIcon, alt: "TikTok" },
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
                  <Image
                    src={social.icon}
                    alt={social.alt}
                    width={18}
                    height={18}
                  />
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
                <span>📞</span> {SITE.phone}
              </li>
              <li className="flex items-center gap-2">
                <span>✉️</span> {SITE.email}
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-sm text-gray-500">
          © 2026 {COMPANY.legalName}. Tất cả quyền được bảo lưu.
        </div>
      </div>
    </footer>
  );
}