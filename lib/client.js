window.__ModuleLoader__.load({ id: "dsh-plugin-token-heatmap", factory: (require) => { var module = { exports: {} }; var exports = module.exports;
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.tsx
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(index_exports);
var import_react3 = __toESM(require("react"), 1);
var import_client = require("react-dom/client");

// src/client/HeatmapView.tsx
var import_react = __toESM(require("react"), 1);
function formatNumber(num) {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(1) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(1) + "k";
  return num.toLocaleString();
}
function formatExact(num) {
  return num.toLocaleString();
}
var MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
var DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];
var DEEPSEEK_LEVELS = [
  "#0f1117",
  // Level 0: Black / dark void tile
  "#152c6f",
  // Level 1: Dark deep blue
  "#1f4cdb",
  // Level 2: Medium vibrant blue
  "#336dfa",
  // Level 3: Vibrant DeepSeek brand blue
  "#4f85ff"
  // Level 4: Bright electric DeepSeek blue
];
var TILE_SHADOWS = [
  "inset 0 1px 2px rgba(0, 0, 0, 0.7)",
  "0 0 4px rgba(21, 44, 111, 0.5)",
  "0 0 7px rgba(31, 76, 219, 0.65), inset 0 0 2px rgba(255, 255, 255, 0.2)",
  "0 0 10px rgba(51, 109, 250, 0.8), inset 0 0 3px rgba(255, 255, 255, 0.35)",
  "0 0 14px rgba(79, 133, 255, 0.95), 0 0 3px #ffffff, inset 0 0 4px #ffffff"
];
function HeatmapView() {
  const [data, setData] = (0, import_react.useState)(null);
  const [loading, setLoading] = (0, import_react.useState)(true);
  const [error, setError] = (0, import_react.useState)(null);
  const [selectedSessionId, setSelectedSessionId] = (0, import_react.useState)("all");
  const [hoveredDay, setHoveredDay] = (0, import_react.useState)(null);
  const [tooltipPos, setTooltipPos] = (0, import_react.useState)(null);
  const fetchStats = () => {
    setLoading(true);
    fetch("/api/dsh-token-heatmap/stats").then((r) => {
      if (!r.ok) throw new Error(`HTTP error ${r.status}`);
      return r.json();
    }).then((res) => {
      setData(res);
      setLoading(false);
    }).catch((err) => {
      setError(err.message);
      setLoading(false);
    });
  };
  (0, import_react.useEffect)(() => {
    fetchStats();
  }, []);
  const activeView = (0, import_react.useMemo)(() => {
    if (!data) return null;
    if (selectedSessionId === "all") {
      return {
        summary: data.summary,
        days: data.days,
        sessionTitle: "All Sessions (Global)"
      };
    }
    const session = data.sessions.find((s) => s.id === selectedSessionId);
    if (!session) {
      return {
        summary: data.summary,
        days: data.days,
        sessionTitle: "All Sessions (Global)"
      };
    }
    let totalTokens = session.totalTokens;
    let totalInputTokens = session.inputTokens;
    let totalOutputTokens = session.outputTokens;
    let totalCacheReadTokens = session.cacheReadTokens;
    let totalTurns = session.turns;
    let activeDays = Object.values(session.days).filter((d) => d.totalTokens > 0).length;
    let dailyAverage = activeDays > 0 ? Math.round(totalTokens / activeDays) : 0;
    let peakDay = null;
    for (const [date, stats] of Object.entries(session.days)) {
      if (!peakDay || stats.totalTokens > peakDay.tokens) {
        peakDay = { date, tokens: stats.totalTokens, turns: stats.turns };
      }
    }
    const positiveValues = Object.values(session.days).map((d) => d.totalTokens).filter((t) => t > 0).sort((a, b) => a - b);
    let q1 = 1e6;
    let q2 = 5e6;
    let q3 = 15e6;
    if (positiveValues.length >= 4) {
      q1 = positiveValues[Math.floor(positiveValues.length * 0.25)];
      q2 = positiveValues[Math.floor(positiveValues.length * 0.5)];
      q3 = positiveValues[Math.floor(positiveValues.length * 0.75)];
    }
    const leveledDays = {};
    for (const [date, stats] of Object.entries(session.days)) {
      let lvl = 0;
      if (stats.totalTokens === 0) lvl = 0;
      else if (stats.totalTokens <= q1) lvl = 1;
      else if (stats.totalTokens <= q2) lvl = 2;
      else if (stats.totalTokens <= q3) lvl = 3;
      else lvl = 4;
      leveledDays[date] = { ...stats, level: lvl };
    }
    return {
      summary: {
        totalTokens,
        totalInputTokens,
        totalOutputTokens,
        totalCacheReadTokens,
        totalTurns,
        activeDays,
        currentStreak: 0,
        longestStreak: 0,
        peakDay,
        dailyAverage
      },
      days: leveledDays,
      sessionTitle: session.title
    };
  }, [data, selectedSessionId]);
  const calendarGrid = (0, import_react.useMemo)(() => {
    if (!activeView) return null;
    const weeks = [];
    const now = /* @__PURE__ */ new Date();
    const end = new Date(now);
    const start = new Date(now);
    start.setDate(start.getDate() - 364);
    start.setDate(start.getDate() - start.getDay());
    let current = new Date(start);
    let currentWeek = [];
    while (current <= end || currentWeek.length > 0) {
      const dateKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
      const dayStats = activeView.days[dateKey] || {
        totalTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        turns: 0,
        level: 0
      };
      if (current <= end) {
        currentWeek.push({ date: dateKey, stats: dayStats });
      } else {
        currentWeek.push(null);
      }
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      current.setDate(current.getDate() + 1);
      if (current > end && currentWeek.length === 0) break;
    }
    return weeks;
  }, [activeView]);
  const monthHeaders = (0, import_react.useMemo)(() => {
    if (!calendarGrid) return [];
    const headers = [];
    let lastMonth = -1;
    calendarGrid.forEach((week, colIdx) => {
      const firstValidDay = week.find((d) => d !== null);
      if (firstValidDay) {
        const d = /* @__PURE__ */ new Date(firstValidDay.date + "T00:00:00");
        const month = d.getMonth();
        if (month !== lastMonth) {
          headers.push({ label: MONTH_NAMES[month], col: colIdx });
          lastMonth = month;
        }
      }
    });
    return headers;
  }, [calendarGrid]);
  if (loading && !data) {
    return /* @__PURE__ */ import_react.default.createElement("div", { style: { padding: "40px 20px", textAlign: "center", color: "var(--dsw-alias-label-secondary)" } }, "Loading token usage statistics...");
  }
  if (error) {
    return /* @__PURE__ */ import_react.default.createElement("div", { style: { padding: "20px", color: "var(--dsw-alias-state-error-primary, #ef4444)" } }, "Failed to load heatmap: ", error, /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        onClick: fetchStats,
        style: {
          marginLeft: 12,
          padding: "4px 10px",
          background: "var(--dsw-alias-bg-layer-2)",
          border: "1px solid var(--dsw-alias-border-l2)",
          color: "var(--dsw-alias-label-primary)",
          borderRadius: 6,
          cursor: "pointer"
        }
      },
      "Retry"
    ));
  }
  if (!data || !activeView) return null;
  const { summary } = activeView;
  const cacheHitPercent = summary.totalTokens > 0 ? Math.round(summary.totalCacheReadTokens / summary.totalTokens * 100) : 0;
  return /* @__PURE__ */ import_react.default.createElement(
    "div",
    {
      style: {
        boxSizing: "border-box",
        width: "100%",
        maxWidth: "960px",
        margin: "0 auto",
        padding: "16px 0 40px",
        fontFamily: "inherit",
        color: "var(--dsw-alias-label-primary, #eeeeee)"
      }
    },
    /* @__PURE__ */ import_react.default.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 14,
          marginBottom: 20
        }
      },
      /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement(
        "h2",
        {
          style: {
            margin: 0,
            fontSize: 22,
            fontWeight: 650,
            letterSpacing: "-0.02em",
            display: "flex",
            alignItems: "center",
            gap: 10
          }
        },
        "Token Usage Activity",
        /* @__PURE__ */ import_react.default.createElement(
          "span",
          {
            style: {
              fontSize: 11,
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: 12,
              background: "rgba(51, 109, 250, 0.12)",
              color: "#4f85ff",
              border: "1px solid rgba(51, 109, 250, 0.35)"
            }
          },
          "52 Weeks"
        )
      ), /* @__PURE__ */ import_react.default.createElement(
        "p",
        {
          style: {
            margin: "5px 0 0",
            fontSize: 13,
            color: "var(--dsw-alias-label-tertiary, #a0a0a0)"
          }
        },
        "Daily token volume and request step intensity across sessions"
      )),
      /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } }, /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6 } }, /* @__PURE__ */ import_react.default.createElement("span", { style: { fontSize: 12, color: "var(--dsw-alias-label-tertiary)" } }, "Session:"), /* @__PURE__ */ import_react.default.createElement(
        "select",
        {
          value: selectedSessionId,
          onChange: (e) => setSelectedSessionId(e.target.value),
          style: {
            background: "var(--dsw-alias-bg-layer-2, #2c2c2c)",
            border: "1px solid var(--dsw-alias-border-l2, #494949)",
            color: "var(--dsw-alias-label-primary, #eeeeee)",
            borderRadius: 8,
            padding: "6px 12px",
            fontSize: 12,
            outline: "none",
            cursor: "pointer",
            maxWidth: 240
          }
        },
        /* @__PURE__ */ import_react.default.createElement("option", { value: "all" }, "All Sessions (", data.sessions.length, " total)"),
        data.sessions.map((s) => /* @__PURE__ */ import_react.default.createElement("option", { key: s.id, value: s.id }, new Date(s.createdAt).toLocaleDateString(), " \xB7 ", s.title.slice(0, 32)))
      )), /* @__PURE__ */ import_react.default.createElement(
        "button",
        {
          onClick: fetchStats,
          title: "Refresh statistics",
          style: {
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "var(--dsw-alias-bg-layer-2, #2c2c2c)",
            border: "1px solid var(--dsw-alias-border-l2, #494949)",
            color: "var(--dsw-alias-label-primary)",
            borderRadius: 8,
            padding: "6px 12px",
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer"
          }
        },
        "\u21BB Refresh"
      ))
    ),
    /* @__PURE__ */ import_react.default.createElement(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 20
        }
      },
      /* @__PURE__ */ import_react.default.createElement(
        "div",
        {
          style: {
            background: "radial-gradient(ellipse at 50% 0%, rgba(51, 109, 250, 0.08) 0%, var(--dsw-alias-bg-layer-2, #2c2c2c) 100%)",
            border: "1px solid var(--dsw-alias-border-l2, #494949)",
            borderRadius: 10,
            padding: "14px 16px",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)"
          }
        },
        /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 11, color: "var(--dsw-alias-label-tertiary, #a0a0a0)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 } }, "Total Tokens"),
        /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 24, fontWeight: 700, margin: "6px 0 2px", color: "#4f85ff", textShadow: "0 0 16px rgba(79, 133, 255, 0.65), 0 0 4px rgba(79, 133, 255, 0.4)" } }, formatNumber(summary.totalTokens)),
        /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 11, color: "var(--dsw-alias-label-secondary, #b9b9b9)" } }, formatExact(summary.totalTokens), " tokens")
      ),
      /* @__PURE__ */ import_react.default.createElement(
        "div",
        {
          style: {
            background: "radial-gradient(ellipse at 50% 0%, rgba(56, 189, 248, 0.08) 0%, var(--dsw-alias-bg-layer-2, #2c2c2c) 100%)",
            border: "1px solid var(--dsw-alias-border-l2, #494949)",
            borderRadius: 10,
            padding: "14px 16px",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)"
          }
        },
        /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 11, color: "var(--dsw-alias-label-tertiary, #a0a0a0)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 } }, "Cache Hit Ratio"),
        /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 24, fontWeight: 700, margin: "6px 0 2px", color: "#38bdf8", textShadow: "0 0 14px rgba(56, 189, 248, 0.55)" } }, cacheHitPercent, "%"),
        /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 11, color: "var(--dsw-alias-label-secondary, #b9b9b9)" } }, formatNumber(summary.totalCacheReadTokens), " cached reads")
      ),
      /* @__PURE__ */ import_react.default.createElement(
        "div",
        {
          style: {
            background: "radial-gradient(ellipse at 50% 0%, rgba(255, 255, 255, 0.03) 0%, var(--dsw-alias-bg-layer-2, #2c2c2c) 100%)",
            border: "1px solid var(--dsw-alias-border-l2, #494949)",
            borderRadius: 10,
            padding: "14px 16px",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)"
          }
        },
        /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 11, color: "var(--dsw-alias-label-tertiary, #a0a0a0)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 } }, selectedSessionId === "all" ? "Daily Average" : "Total Steps"),
        /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 24, fontWeight: 700, margin: "6px 0 2px", color: "var(--dsw-alias-label-primary, #ffffff)", textShadow: "0 0 12px rgba(255, 255, 255, 0.2)" } }, selectedSessionId === "all" ? formatNumber(summary.dailyAverage) : summary.totalTurns),
        /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 11, color: "var(--dsw-alias-label-secondary, #b9b9b9)" } }, selectedSessionId === "all" ? `Across ${summary.activeDays} active days` : `${formatNumber(summary.totalInputTokens + summary.totalOutputTokens)} billed`)
      ),
      /* @__PURE__ */ import_react.default.createElement(
        "div",
        {
          style: {
            background: "radial-gradient(ellipse at 50% 0%, rgba(255, 255, 255, 0.03) 0%, var(--dsw-alias-bg-layer-2, #2c2c2c) 100%)",
            border: "1px solid var(--dsw-alias-border-l2, #494949)",
            borderRadius: 10,
            padding: "14px 16px",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)"
          }
        },
        /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 11, color: "var(--dsw-alias-label-tertiary, #a0a0a0)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 } }, selectedSessionId === "all" ? "Active Streak" : "Active Days"),
        /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 24, fontWeight: 700, margin: "6px 0 2px", color: "var(--dsw-alias-label-primary, #ffffff)", textShadow: "0 0 12px rgba(255, 255, 255, 0.2)" } }, selectedSessionId === "all" ? `${summary.currentStreak} days` : `${summary.activeDays} days`),
        /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 11, color: "var(--dsw-alias-label-secondary, #b9b9b9)" } }, selectedSessionId === "all" ? `Longest streak: ${summary.longestStreak} days` : `Session: ${activeView.sessionTitle.slice(0, 24)}`)
      )
    ),
    /* @__PURE__ */ import_react.default.createElement(
      "div",
      {
        style: {
          background: "radial-gradient(ellipse 90% 50% at 50% 0%, rgba(51, 109, 250, 0.09) 0%, var(--dsw-alias-bg-layer-2, #2c2c2c) 85%)",
          border: "1px solid var(--dsw-alias-border-l2, #494949)",
          borderRadius: 12,
          padding: "20px 22px",
          position: "relative",
          overflowX: "auto",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.06)"
        }
      },
      /* @__PURE__ */ import_react.default.createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
            fontSize: 13,
            fontWeight: 600
          }
        },
        /* @__PURE__ */ import_react.default.createElement("span", null, "Contribution Calendar"),
        summary.peakDay && /* @__PURE__ */ import_react.default.createElement("span", { style: { fontSize: 12, fontWeight: 400, color: "var(--dsw-alias-label-secondary)" } }, "Peak day: ", /* @__PURE__ */ import_react.default.createElement("strong", { style: { color: "var(--dsw-alias-label-primary)" } }, summary.peakDay.date), " (", formatNumber(summary.peakDay.tokens), " tokens)")
      ),
      calendarGrid && /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "inline-block", minWidth: 780 } }, /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "flex", marginLeft: 32, marginBottom: 4, height: 16 } }, monthHeaders.map((m, i) => /* @__PURE__ */ import_react.default.createElement(
        "div",
        {
          key: i,
          style: {
            position: "relative",
            left: m.col * 14,
            width: 0,
            whiteSpace: "nowrap",
            fontSize: 10,
            color: "var(--dsw-alias-label-tertiary, #a0a0a0)"
          }
        },
        m.label
      ))), /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "flex", gap: 6 } }, /* @__PURE__ */ import_react.default.createElement(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: 3,
            width: 26,
            fontSize: 9,
            color: "var(--dsw-alias-label-tertiary, #a0a0a0)",
            textAlign: "right",
            paddingTop: 1
          }
        },
        DAY_LABELS.map((lbl, idx) => /* @__PURE__ */ import_react.default.createElement("div", { key: idx, style: { height: 11, lineHeight: "11px" } }, lbl))
      ), /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "flex", gap: 3 } }, calendarGrid.map((week, colIdx) => /* @__PURE__ */ import_react.default.createElement("div", { key: colIdx, style: { display: "flex", flexDirection: "column", gap: 3 } }, week.map((day, rowIdx) => {
        if (!day) {
          return /* @__PURE__ */ import_react.default.createElement("div", { key: rowIdx, style: { width: 11, height: 11 } });
        }
        const lvl = day.stats.level || 0;
        const bg = DEEPSEEK_LEVELS[lvl];
        return /* @__PURE__ */ import_react.default.createElement(
          "div",
          {
            key: rowIdx,
            onMouseEnter: (e) => {
              setHoveredDay({ date: day.date, stats: day.stats });
              const rect = e.currentTarget.getBoundingClientRect();
              setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 8 });
            },
            onMouseLeave: () => {
              setHoveredDay(null);
              setTooltipPos(null);
            },
            style: {
              width: 11,
              height: 11,
              borderRadius: 2,
              backgroundColor: bg,
              boxShadow: TILE_SHADOWS[lvl],
              border: lvl === 0 ? "1px solid rgba(255, 255, 255, 0.05)" : "1px solid transparent",
              cursor: "pointer",
              transition: "all 0.12s ease",
              position: "relative"
            }
          }
        );
      }))))), /* @__PURE__ */ import_react.default.createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 6,
            marginTop: 14,
            fontSize: 11,
            color: "var(--dsw-alias-label-tertiary, #a0a0a0)"
          }
        },
        /* @__PURE__ */ import_react.default.createElement("span", null, "Less"),
        DEEPSEEK_LEVELS.map((c, i) => /* @__PURE__ */ import_react.default.createElement(
          "div",
          {
            key: i,
            style: {
              width: 11,
              height: 11,
              borderRadius: 2,
              backgroundColor: c,
              boxShadow: TILE_SHADOWS[i],
              border: i === 0 ? "1px solid rgba(255, 255, 255, 0.05)" : "none"
            }
          }
        )),
        /* @__PURE__ */ import_react.default.createElement("span", null, "More")
      ))
    ),
    hoveredDay && tooltipPos && /* @__PURE__ */ import_react.default.createElement(
      "div",
      {
        style: {
          position: "fixed",
          left: tooltipPos.x,
          top: tooltipPos.y,
          transform: "translate(-50%, -100%)",
          background: "var(--dsw-alias-bg-layer-1, #1e1e1e)",
          border: "1px solid var(--dsw-alias-border-l3, #555555)",
          borderRadius: 8,
          padding: "8px 12px",
          fontSize: 12,
          lineHeight: 1.4,
          boxShadow: "0 6px 18px rgba(0,0,0,0.35)",
          pointerEvents: "none",
          zIndex: 9999,
          whiteSpace: "nowrap"
        }
      },
      /* @__PURE__ */ import_react.default.createElement("div", { style: { fontWeight: 650, color: "var(--dsw-alias-label-primary, #ffffff)", marginBottom: 4 } }, (/* @__PURE__ */ new Date(hoveredDay.date + "T00:00:00")).toLocaleDateString(void 0, {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric"
      })),
      hoveredDay.stats.totalTokens === 0 ? /* @__PURE__ */ import_react.default.createElement("div", { style: { color: "var(--dsw-alias-label-tertiary)" } }, "No activity recorded") : /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("div", { style: { color: "#4f85ff", fontWeight: 600 } }, formatExact(hoveredDay.stats.totalTokens), " tokens"), /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 11, color: "var(--dsw-alias-label-secondary)", marginTop: 2 } }, hoveredDay.stats.turns, " requests / steps"), /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 10, color: "var(--dsw-alias-label-tertiary)", marginTop: 4 } }, "Billed: ", formatNumber(hoveredDay.stats.inputTokens + hoveredDay.stats.outputTokens), " \xB7 Cache: ", formatNumber(hoveredDay.stats.cacheReadTokens)))
    )
  );
}

// src/client/HeatmapModal.tsx
var import_react2 = __toESM(require("react"), 1);
function HeatmapModal({ open, onClose }) {
  if (!open) return null;
  return /* @__PURE__ */ import_react2.default.createElement(
    "div",
    {
      role: "dialog",
      "aria-modal": "true",
      "aria-label": "Token Usage Heatmap",
      onClick: onClose,
      style: {
        position: "fixed",
        inset: 0,
        zIndex: 1e4,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        overflowY: "auto"
      }
    },
    /* @__PURE__ */ import_react2.default.createElement(
      "div",
      {
        onClick: (e) => e.stopPropagation(),
        style: {
          position: "relative",
          width: "100%",
          maxWidth: "960px",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "var(--dsw-alias-bg-layer-1, #1e1e1e)",
          border: "1px solid var(--dsw-alias-border-l2, #494949)",
          borderRadius: "14px",
          boxShadow: "0 16px 40px rgba(0, 0, 0, 0.5)",
          padding: "24px 28px"
        }
      },
      /* @__PURE__ */ import_react2.default.createElement(
        "button",
        {
          onClick: onClose,
          "aria-label": "Close dialog",
          style: {
            position: "absolute",
            top: "16px",
            right: "18px",
            background: "transparent",
            border: "none",
            color: "var(--dsw-alias-label-tertiary, #a0a0a0)",
            fontSize: "20px",
            cursor: "pointer",
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "6px"
          }
        },
        "\u2715"
      ),
      /* @__PURE__ */ import_react2.default.createElement(HeatmapView, null)
    )
  );
}

// src/client/index.tsx
var name = "dsh-plugin-token-heatmap-client";
var inject = ["slots"];
function apply(ctx) {
  if (ctx.slots && typeof ctx.slots.inject === "function") {
    ctx.slots.inject("settings.section", () => {
      return ctx.slots.register(
        {
          name: "settings.section",
          id: "token-heatmap",
          order: 14,
          label: () => "Token Heatmap",
          icon: "chart"
        },
        HeatmapView
      );
    });
  }
  if (typeof document !== "undefined") {
    let ModalController = function() {
      const [isOpen, setIsOpen] = (0, import_react3.useState)(false);
      (0, import_react3.useEffect)(() => {
        const handleOpen = () => setIsOpen(true);
        const handleClose = () => setIsOpen(false);
        window.addEventListener("dsh:open-token-heatmap", handleOpen);
        window.addEventListener("keydown", (e) => {
          if (e.key === "Escape") handleClose();
        });
        return () => {
          window.removeEventListener("dsh:open-token-heatmap", handleOpen);
        };
      }, []);
      return /* @__PURE__ */ import_react3.default.createElement(HeatmapModal, { open: isOpen, onClose: () => setIsOpen(false) });
    };
    const modalContainer = document.createElement("div");
    modalContainer.id = "dsh-token-heatmap-modal-root";
    document.body.appendChild(modalContainer);
    const root = (0, import_client.createRoot)(modalContainer);
    root.render(/* @__PURE__ */ import_react3.default.createElement(ModalController, null));
    const observer = new MutationObserver(() => {
      const usageList = document.querySelector("[data-session-stats-usage]");
      if (!usageList) return;
      const dialogContainer = usageList.closest('div[role="dialog"]') || usageList.parentElement;
      if (!dialogContainer) return;
      if (dialogContainer.querySelector(".dsh-heatmap-trigger-btn") || document.querySelector(".dsh-heatmap-trigger-btn")) {
        return;
      }
      const button = document.createElement("button");
      button.className = "dsh-heatmap-trigger-btn";
      button.type = "button";
      button.innerHTML = "<span>View Token Usage Heatmap \u2192</span>";
      button.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        margin-top: 12px;
        padding: 8px 12px;
        background: rgba(51, 109, 250, 0.12);
        border: 1px solid rgba(51, 109, 250, 0.35);
        border-radius: 8px;
        color: #4f85ff;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 0 14px rgba(51, 109, 250, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.08);
        transition: all 0.15s ease;
      `;
      button.onmouseenter = () => {
        button.style.background = "rgba(51, 109, 250, 0.22)";
        button.style.borderColor = "#336dfa";
        button.style.boxShadow = "0 0 20px rgba(79, 133, 255, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.15)";
      };
      button.onmouseleave = () => {
        button.style.background = "rgba(51, 109, 250, 0.12)";
        button.style.borderColor = "rgba(51, 109, 250, 0.35)";
        button.style.boxShadow = "0 0 14px rgba(51, 109, 250, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.08)";
      };
      button.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const settingsTrigger = document.querySelector(
          'button[aria-label*="Setting" i], [data-sidebar-settings] button, button.settings'
        );
        if (settingsTrigger) {
          settingsTrigger.click();
          setTimeout(() => {
            const heatmapTab = Array.from(document.querySelectorAll("*")).find(
              (el) => el.textContent?.trim() === "Token Heatmap" && (el.tagName === "BUTTON" || el.tagName === "DIV" || el.getAttribute("role") === "tab" || el.classList.contains("ant-list-item"))
            );
            if (heatmapTab) {
              heatmapTab.click();
            } else {
              window.dispatchEvent(new CustomEvent("dsh:open-token-heatmap"));
            }
          }, 120);
        } else {
          window.dispatchEvent(new CustomEvent("dsh:open-token-heatmap"));
        }
      };
      dialogContainer.appendChild(button);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
}
return module.exports; } });
//# sourceMappingURL=client.js.map
