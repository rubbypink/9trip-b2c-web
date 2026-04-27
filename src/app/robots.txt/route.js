/**
 * Robots.txt — cho phép tất cả crawlers, trỏ đến sitemap.
 *
 * @returns {Promise<Response>}
 */
export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://9tripphuquoc.com";

  const robots = `User-agent: *
Allow: /
Disallow: /account/
Disallow: /cart/
Disallow: /checkout/
Disallow: /api/

Sitemap: ${baseUrl}/sitemap.xml
`;

  return new Response(robots, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
