import index from "./index.html";

const server = Bun.serve({
  port: Number(Bun.env.PORT ?? 3000),
  routes: { "/": index },
  development: { hmr: true, console: true },
});

console.log(`Elsewhere is ready at ${server.url}`);
