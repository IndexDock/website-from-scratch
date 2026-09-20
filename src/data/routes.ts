// Derives the indexable public routes from the pages that actually exist, so a
// page added during implementation reaches the sitemap without anyone
// remembering to list it. scripts/validate-release.mjs fails a release whose
// sitemap omits an indexable route, and that failure blocks publication.
//
// Starter sites are one to five static pages. Dynamic routes are excluded
// because their parameters cannot be enumerated here; a site that ever needs
// one must extend this function deliberately.
const pageModules = import.meta.glob("../pages/**/*.{astro,md,mdx,html}");

export function indexableRoutes(): string[] {
  const routes = new Set<string>();

  for (const path of Object.keys(pageModules)) {
    const relativePath = path.replace("../pages/", "").replace(/\.(astro|md|mdx|html)$/, "");

    if (relativePath === "404") continue;
    if (relativePath.includes("[")) continue;
    if (relativePath === "design-review" || relativePath.startsWith("design-review/")) continue;
    if (relativePath.split("/").some((segment) => segment.startsWith("_"))) continue;

    if (relativePath === "index") {
      routes.add("/");
      continue;
    }

    const withoutIndex = relativePath.endsWith("/index")
      ? relativePath.slice(0, -"/index".length)
      : relativePath;
    routes.add(`/${withoutIndex}/`);
  }

  return [...routes].sort((a, b) => (a === "/" ? -1 : b === "/" ? 1 : a.localeCompare(b)));
}
