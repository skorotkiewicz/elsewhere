import { resolve, sep } from "node:path";

const root = resolve(import.meta.dir, "../dist");
if (!(await Bun.file(resolve(root, "index.html")).exists())) {
  throw new Error("Build the app first with bun run build.");
}

const server = Bun.serve({
  port: Number(Bun.env.PORT ?? 3000),
  async fetch(request) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
    }
    let pathname;
    try { pathname = decodeURIComponent(new URL(request.url).pathname); }
    catch { return new Response("Bad request", { status: 400 }); }
    const path = resolve(root, pathname === "/" ? "index.html" : "." + pathname);
    if (!path.startsWith(root + sep)) return new Response("Forbidden", { status: 403 });
    const file = Bun.file(path);
    if (!(await file.exists())) return new Response("Not found", { status: 404 });
    return new Response(request.method === "HEAD" ? null : file, {
      headers: { "Content-Type": file.type, "X-Content-Type-Options": "nosniff" },
    });
  },
});

console.log(`Elsewhere production preview at ${server.url}`);
