import { NextResponse } from 'next/server';

/**
 * Next.js Edge Middleware — bảo vệ route yêu cầu đăng nhập.
 * Kiểm tra cookie `auth-session` (được AuthProvider set khi user đăng nhập Firebase).
 * Chuyển hướng về /login nếu chưa xác thực.
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
 * Middleware chính — chạy trên Edge Runtime.
 * @param {import('next/server').NextRequest} request
 * @returns {NextResponse}
 */
export default function middleware(request) {
  const { pathname, protocol, host } = request.nextUrl;

  if (protocol === 'http:') {
    const httpsUrl = new URL(`https://${host}${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(httpsUrl, 301);
  }

  if (pathname.startsWith('/flights')) {
    const homeUrl = new URL('/', request.url);
    return NextResponse.redirect(homeUrl, 301);
  }

  const authCookie = request.cookies.get('auth-session');
  const isProtected = PROTECTED_PATHS.some((path) => pathname.startsWith(path));

  if (isProtected && !authCookie?.value) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

/**
 * Matcher — chỉ chạy middleware trên các path được chỉ định (hiệu suất cao hơn).
 * Không chạy trên static files, API routes, hoặc Next.js internal routes.
 */
export const config = {
  matcher: ['/checkout/:path*', '/cart/:path*', '/account/:path*', '/booking/confirmation/:path*'],
};
