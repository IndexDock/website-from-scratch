import type { APIRoute } from "astro";
import { siteConfig } from "../data/site";

// Generated rather than shipped as a static file so the starter, design-review
// and published states cannot drift apart. The starter and every review build
// stay fully blocked; only an approved indexable business site opens up.
export const GET: APIRoute = () => {
  if (!siteConfig.indexingEnabled) {
    return new Response("User-agent: *\nDisallow: /\n", {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const lines = ["User-agent: *", "Allow: /", "Disallow: /design-review/"];
  if (siteConfig.siteUrl) {
    lines.push("", `Sitemap: ${new URL("/sitemap.xml", siteConfig.siteUrl).href}`);
  }

  return new Response(`${lines.join("\n")}\n`, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
};
