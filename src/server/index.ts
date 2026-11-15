import { aggregateTokens, serializeResponse } from "./aggregator.js";

export const name = "token-contribution";
export const inject = ["webServer"];

const PATHS = new Set(["/api/token-contribution", "/api/token-contribution/stats", "/api/dsh-token-heatmap/stats"]);

export function apply(ctx: any) {
  ctx.effect(() =>
    ctx.webServer.register({
      kind: "prefix",
      path: "/api/token-contribution",
      handler: async (req: any, res: any) => {
        const url = new URL(req.url, "http://localhost");
        const pathname = url.pathname.replace(/\/+$/, "");
        if (req.method !== "GET" || !PATHS.has(pathname)) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Not found" }));
          return;
        }
        try {
          // One aggregator for the life of the host: its cache is what makes
          // repeat requests cheap. (0.1 re-imported the module per request,
          // which discarded the cache and re-read every session every time.)
          const data = await aggregateTokens(undefined, { range: url.searchParams.get("range") ?? undefined });
          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-cache" });
          res.end(serializeResponse(data));
        } catch (err: any) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: err?.message || "Failed to aggregate token stats" }));
        }
      },
    }),
  );
}
