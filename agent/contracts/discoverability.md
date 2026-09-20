# Discoverability contract

## Metadata and social sharing

Every indexable page requires a unique title, description, canonical URL, and accurate crawler directive. The published site requires a client-specific favicon and a working absolute `og:image`; use matching Open Graph and Twitter image metadata. The temporary Starter and design-review output remain `noindex`.

## Crawler files

`robots.txt` and `sitemap.xml` are generated from `src/data/site.ts`, not hand-authored. `src/pages/robots.txt.ts` blocks everything until `indexingEnabled` is true, then opens the site and points at the sitemap. `src/pages/sitemap.xml.ts` lists every route `src/data/routes.ts` derives from the pages that exist, using the same canonical formula as `SeoHead.astro`, so a page added during implementation reaches the sitemap without anyone remembering to add it.

Do not commit a hand-written `public/robots.txt` or `public/sitemap.xml`; a file in `public/` would shadow the generated route and silently drift from the site's real state. A site that ever needs a dynamic route must extend `indexableRoutes()` deliberately, because parameters cannot be enumerated there.

## Structured data

Select schema from verified reality and visible content. Use `Person` for an individual professional, `Organization` for a genuine organization, an appropriate `LocalBusiness` subtype for a qualifying local business, and `Service` for real visible services. Never invent an address, logo, ratings, price range, opening hours, credentials, or organizational identity.

Use `FAQPage` only when genuine questions and answers are visible on the page and the schema matches them exactly. Validate all emitted JSON-LD.

## Baseline answer readiness

Where it naturally serves the visitor, use a genuine audience question as a heading and place a concise direct answer immediately beneath it before supporting detail. Do not turn every heading into a question, create FAQ padding, or promise rankings, citations, traffic, or answer-engine inclusion.

## Breadcrumbs

Do not use breadcrumbs on a one-page site or normally on the homepage. On a multi-page site, use visible breadcrumbs on meaningful internal pages when they improve orientation. Add `BreadcrumbList` only when it matches the visible hierarchy. Utility pages may be exempt.

## Navigation and contacts

Use sticky navigation by default when persistent navigation or contact access improves a multi-section or multi-page business site. It must remain compact, preserve focus visibility, avoid layout shift, and not cover anchored headings. Document an exception for a very short page or a design where stickiness would reduce usability.

When Telegram, Viber, or another messenger is an approved contact channel, use its recognizable icon with an accessible name, adequate touch target, and verified destination. Do not display unapproved channels.
