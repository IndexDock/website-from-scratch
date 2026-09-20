import type { APIRoute } from "astro";

// Emitted at build time so continuous integration can prove which commit is
// actually serving. Cloudflare Workers Builds sets WORKERS_CI_COMMIT_SHA;
// GitHub Actions sets GITHUB_SHA. When neither exists, the endpoint still
// renders and `scripts/verify-cloudflare-deployment.mjs` falls back to marker
// verification rather than failing.
const commit =
  process.env.WORKERS_CI_COMMIT_SHA ?? process.env.GITHUB_SHA ?? null;

export const GET: APIRoute = () =>
  new Response(JSON.stringify({ commit, builtAt: new Date().toISOString() }), {
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
    },
  });
