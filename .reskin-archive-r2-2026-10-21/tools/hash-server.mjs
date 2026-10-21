/**
 * Hash-route capture server for the reskin verification.
 *
 * The app uses `createWebHashHistory()` (deep links survive static/IPFS hosting). The reskin
 * capture script builds URLs as `new URL(route, baseUrl)`, which for `/art` requests the *path*
 * `/art`; the served SPA then sees no hash and renders `/` — every route collapses to home.
 *
 * This tooling server (never bundled, never imported by the app) serves the production build and
 * answers an extension-less route path with a 302 to the hash form (`/art` -> `/#/art`). Playwright
 * follows the redirect, the hash router resolves the intended route, and every capture measures the
 * real page. Query strings are preserved.
 */
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(HERE, "..", "..");
const DIST = path.join(PROJECT, "dist");
const PORT = Number(process.env.RESKIN_HASH_PORT || 4321);

const MIME = new Map(Object.entries({
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8",
}));

function safeJoin(root, urlPath) {
  const decoded = decodeURIComponent(urlPath);
  const resolved = path.resolve(root, `.${decoded}`);
  return resolved.startsWith(root + path.sep) ? resolved : null;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://127.0.0.1:${PORT}`);
  const pathname = url.pathname;

  // Route paths are extension-less; hash mode needs them after `#`.
  if (pathname !== "/" && !path.extname(pathname)) {
    const suffix = url.search || "";
    res.writeHead(302, { location: `/#${pathname}${suffix}` });
    res.end();
    return;
  }

  let filePath = safeJoin(DIST, pathname === "/" ? "/index.html" : pathname);
  if (!filePath) {
    res.writeHead(403);
    res.end("forbidden");
    return;
  }
  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "content-type": MIME.get(ext) || "application/octet-stream",
      "cache-control": "no-store",
    });
    res.end(data);
  } catch {
    try {
      const fallback = await fs.readFile(path.join(DIST, "index.html"));
      res.writeHead(200, { "content-type": MIME.get(".html"), "cache-control": "no-store" });
      res.end(fallback);
    } catch {
      res.writeHead(404);
      res.end("not found");
    }
  }
});

server.listen(PORT, "127.0.0.1", () => {
  process.stdout.write(`hash-route capture server on http://127.0.0.1:${PORT} (dist: ${DIST})\n`);
});

process.on("SIGTERM", () => server.close(() => process.exit(0)));
