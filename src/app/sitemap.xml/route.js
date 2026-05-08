/**
 * Dynamic Sitemap — tự động tạo sitemap.xml cho SEO.
 * Bao gồm tất cả static routes + dynamic routes từ Firestore.
 *
 * @returns {Promise<Response>}
 */
export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://9tripphuquoc.com";

  // Static routes
  const staticRoutes = [
    { path: "", priority: "1.0", changefreq: "daily" },
    { path: "/tours", priority: "0.9", changefreq: "daily" },
    { path: "/hotels", priority: "0.9", changefreq: "daily" },
    { path: "/activities", priority: "0.8", changefreq: "daily" },
    { path: "/cars", priority: "0.7", changefreq: "weekly" },
    { path: "/rentals", priority: "0.7", changefreq: "weekly" },
    { path: "/terms", priority: "0.4", changefreq: "monthly" },
    { path: "/privacy", priority: "0.4", changefreq: "monthly" },
    { path: "/cancellation", priority: "0.4", changefreq: "monthly" },
    { path: "/login", priority: "0.3", changefreq: "monthly" },
    { path: "/register", priority: "0.3", changefreq: "monthly" },
  ];

  // Dynamic routes from Firestore — safely try to fetch
  let dynamicUrls = [];

  try {
    const { adminDb } = await import("@/lib/firebase-admin");

    const collectionsToSitemap = ["tours", "hotels", "activities", "cars", "rentals"];
    const slugs = new Set();

    await Promise.all(
      collectionsToSitemap.map(async (colName) => {
        try {
          const snap = await adminDb.collection(colName).limit(500).get();
          snap.docs.forEach((doc) => {
            const data = doc.data();
            const slug = data.slug;
            if (slug && !slugs.has(slug)) {
              slugs.add(slug);
              dynamicUrls.push({
                path: `/${colName}/${slug}`,
                priority: "0.8",
                changefreq: "weekly",
                lastmod: data.updatedAt?._seconds
                  ? new Date(data.updatedAt._seconds * 1000).toISOString()
                  : new Date().toISOString(),
              });
            }
          });
        } catch {
          // Collection might not exist or be empty — skip silently
        }
      })
    );
  } catch {
    // Firestore unavailable — return static sitemap only
  }

  const allUrls = [
    ...staticRoutes.map((r) => ({
      loc: `${baseUrl}${r.path}`,
      priority: r.priority,
      changefreq: r.changefreq,
    })),
    ...dynamicUrls.map((r) => ({
      loc: `${baseUrl}${r.path}`,
      priority: r.priority,
      changefreq: r.changefreq,
      lastmod: r.lastmod,
    })),
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
  .map(
    (url) => `  <url>
    <loc>${url.loc}</loc>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>${url.lastmod ? `\n    <lastmod>${url.lastmod}</lastmod>` : ""}
  </url>`
  )
  .join("\n")}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
