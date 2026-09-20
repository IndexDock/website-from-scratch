import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";

const root = resolve("dist");
const port = Number.parseInt(process.env.PORT ?? "4321", 10);
const host = process.env.HOST ?? "127.0.0.1";

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function safePathname(rawPathname) {
  try {
    const decoded = decodeURIComponent(rawPathname);
    const normalized = normalize(decoded).replace(/^([/\\])+/, "");
    const candidate = resolve(join(root, normalized));
    return candidate === root || candidate.startsWith(`${root}${sep}`) ? candidate : null;
  } catch {
    return null;
  }
}

async function resolveFile(pathname) {
  const candidate = safePathname(pathname);
  if (!candidate) return null;

  try {
    const details = await stat(candidate);
    if (details.isDirectory()) {
      const indexFile = join(candidate, "index.html");
      await access(indexFile);
      return indexFile;
    }
    return details.isFile() ? candidate : null;
  } catch {
    return null;
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? `${host}:${port}`}`);
  const requestedFile = await resolveFile(url.pathname);
  const file = requestedFile ?? await resolveFile("/404.html");

  if (!file) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(requestedFile ? 200 : 404, {
    "cache-control": "no-store",
    "content-type": contentTypes[extname(file).toLowerCase()] ?? "application/octet-stream",
  });
  createReadStream(file).pipe(response);
});

server.listen(port, host, () => {
  console.log(`Serving ${root} at http://${host}:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
