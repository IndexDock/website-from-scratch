import type { APIRoute } from "astro";
import { siteConfig } from "../data/site";
import { indexableRoutes } from "../data/routes";

// scripts/validate-release.mjs requires every indexable built route to appear
// here with exactly the canonical URL SeoHead.astro emits, so both derive the
// URL the same way: new URL(route, siteUrl).
export const GET: APIRoute = () => {
  // A static build writes a file for every endpoint, so an unpublished site
  // emits a valid empty sitemap rather than an error body. robots.txt blocks
  // the whole site in that state anyway.
  const publishable = siteConfig.indexingEnabled && siteConfig.siteUrl;
  const base = publishable ? `${siteConfig.siteUrl!.replace(/\/$/, "")}/` : null;
  const entries = base
    ? indexableRoutes()
        .map((route) => `  <url><loc>${new URL(route, base).href}</loc></url>`)
        .join("\n")
    : "";

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}${entries ? "\n" : ""}</urlset>\n`,
    { headers: { "content-type": "application/xml; charset=utf-8" } },
  );
};
