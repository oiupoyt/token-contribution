const name = "dsh-plugin-token-heatmap";
const inject = ["webServer"];
function apply(ctx) {
  ctx.effect(
    () => ctx.webServer.register({
      kind: "prefix",
      path: "/api/dsh-token-heatmap",
      handler: async (req, res) => {
        const url = new URL(req.url, "http://localhost");
        const pathname = url.pathname.replace(/\/+$/, "");
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
            const { aggregateTokens } = await import(`./aggregator.js?t=${Date.now()}`);
            const data = await aggregateTokens();
            res.writeHead(200, {
              "Content-Type": "application/json; charset=utf-8",
              "Cache-Control": "no-cache"
            });
            res.end(JSON.stringify(data));
          } catch (err) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: err?.message || "Failed to aggregate token stats" }));
          }
          return;
        }
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Not found" }));
      }
    })
  );
}
export {
  apply,
  inject,
  name
};
//# sourceMappingURL=index.js.map
