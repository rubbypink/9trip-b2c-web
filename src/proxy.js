import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

/**
 * Next.js Edge Proxy — bảo vệ route yêu cầu đăng nhập + security headers.
 * Kiểm tra cookie `auth-session` (được AuthProvider set khi user đăng nhập Firebase).
 * Chuyển hướng về /login nếu chưa xác thực.
 * Inject security headers cho mọi response.
 *
 * Các route được bảo vệ:
 * - /checkout — thanh toán
 * - /cart — giỏ hàng
 * - /account — dashboard cá nhân
 * - /booking/confirmation — xác nhận đặt chỗ
 */

/** @type {string[]} Đường dẫn yêu cầu đăng nhập */
const PROTECTED_PATHS = ['/checkout', '/cart', '/account', '/booking/confirmation'];

/**
 * Inject security headers chuẩn OWASP / MDN vào response.
 * @param {NextResponse} response
 * @returns {NextResponse}
 */
function applySecurityHeaders(response) {
  // Ngăn clickjacking
  response.headers.set('X-Frame-Options', 'DENY');
  // Ngăn MIME-sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  // HSTS — bắt buộc HTTPS trong 2 năm, include subdomains, preload eligible
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  // Hạn chế thông tin leak qua feature policy (đơn giản)
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // XSS protection (legacy nhưng vẫn hữu ích cho older browsers)
  response.headers.set('X-XSS-Protection', '1; mode=block');

  return response;
}

/**
 * Proxy chính — chạy trên Edge Runtime.
 * @param {import('next/server').NextRequest} request
 * @returns {Promise<NextResponse>}
 */
export default async function proxy(request) {
  const { pathname, protocol, host } = request.nextUrl;

  if (protocol === 'http:' && !host.includes('localhost')) {
    const httpsUrl = new URL(`https://${host}${pathname}${request.nextUrl.search}`);
    return applySecurityHeaders(NextResponse.redirect(httpsUrl, 301));
  }

  if (pathname.startsWith('/flights')) {
    const homeUrl = new URL('/', request.url);
    return applySecurityHeaders(NextResponse.redirect(homeUrl, 301));
  }

  const authCookie = request.cookies.get('auth-session');
  const isProtected = PROTECTED_PATHS.some((path) => pathname.startsWith(path));

  if (isProtected) {
    if (!authCookie?.value) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return applySecurityHeaders(NextResponse.redirect(loginUrl));
    }

    try {
      await adminAuth.verifyIdToken(authCookie.value);
    } catch (error) {
      console.error('[proxy] verifyIdToken error:', error.message);
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return applySecurityHeaders(NextResponse.redirect(loginUrl));
    }
  }

  return applySecurityHeaders(NextResponse.next());
}

/**
 * Matcher — chỉ chạy proxy trên các path được chỉ định (hiệu suất cao hơn).
 * Không chạy trên static files, API routes, hoặc Next.js internal routes.
 */
export const config = {
  matcher: ['/checkout/:path*', '/cart/:path*', '/account/:path*', '/booking/confirmation/:path*'],
};
