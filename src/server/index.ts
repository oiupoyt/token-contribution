import { aggregateTokens } from "./aggregator.js";

export const name = "dsh-plugin-token-heatmap";
export const inject = ["webServer"];

export function apply(ctx: any) {
  ctx.effect(() =>
    ctx.webServer.register({
      kind: "prefix",
      path: "/api/dsh-token-heatmap",
      handler: async (req: any, res: any) => {
        const url = new URL(req.url, "http://localhost");
        const pathname = url.pathname.replace(/\/+$/, "");

        // Set common headers
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");

        if (req.method === "OPTIONS") {
          res.writeHead(204);
          res.end();
          return;
        }

        if (req.method === "GET" && (pathname === "/api/dsh-token-heatmap" || pathname === "/api/dsh-token-heatmap/stats")) {
          try {
            const data = await aggregateTokens();
            res.writeHead(200, {
              "Content-Type": "application/json; charset=utf-8",
              "Cache-Control": "no-cache",
            });
            res.end(JSON.stringify(data));
          } catch (err: any) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: err?.message || "Failed to aggregate token stats" }));
          }
          return;
        }

        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Not found" }));
      },
    })
  );
}
