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
function HeatmapInnerView() {
  const [data, setData] = (0, import_react.useState)(null);
  const [loading, setLoading] = (0, import_react.useState)(true);
  const [error, setError] = (0, import_react.useState)(null);
  const [selectedSessionId, setSelectedSessionId] = (0, import_react.useState)("all");
  const [selectedDate, setSelectedDate] = (0, import_react.useState)(null);
  const [hoveredDay, setHoveredDay] = (0, import_react.useState)(null);
  const [tooltipPos, setTooltipPos] = (0, import_react.useState)(null);
  const scrollContainerRef = (0, import_react.useRef)(null);
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
    const session = (data.sessions || []).find((s) => s.id === selectedSessionId);
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
  (0, import_react.useEffect)(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
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
  const inspectedDayStats = selectedDate ? activeView.days[selectedDate] : null;
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
          onChange: (e) => {
            setSelectedSessionId(e.target.value);
            setSelectedDate(null);
          },
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
        /* @__PURE__ */ import_react.default.createElement("option", { value: "all" }, "All Sessions (", (data.sessions || []).length, " total)"),
        (data.sessions || []).map((s) => /* @__PURE__ */ import_react.default.createElement("option", { key: s.id, value: s.id }, new Date(s.createdAt).toLocaleDateString(), " \xB7 ", s.title.slice(0, 32)))
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
            background: "var(--dsw-alias-bg-layer-2, #2c2c2c)",
            border: "1px solid var(--dsw-alias-border-l2, #494949)",
            borderRadius: 10,
            padding: "14px 16px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)"
          }
        },
        /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 11, color: "var(--dsw-alias-label-tertiary, #a0a0a0)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 } }, "Total Tokens"),
        /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 24, fontWeight: 700, margin: "6px 0 2px", color: "#4f85ff" } }, formatNumber(summary.totalTokens)),
        /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 11, color: "var(--dsw-alias-label-secondary, #b9b9b9)" } }, formatExact(summary.totalTokens), " tokens")
      ),
      /* @__PURE__ */ import_react.default.createElement(
        "div",
        {
          style: {
            background: "var(--dsw-alias-bg-layer-2, #2c2c2c)",
            border: "1px solid var(--dsw-alias-border-l2, #494949)",
            borderRadius: 10,
            padding: "14px 16px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)"
          }
        },
        /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 11, color: "var(--dsw-alias-label-tertiary, #a0a0a0)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 } }, "Cache Hit Ratio"),
        /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 24, fontWeight: 700, margin: "6px 0 2px", color: "#38bdf8" } }, cacheHitPercent, "%"),
        /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 11, color: "var(--dsw-alias-label-secondary, #b9b9b9)" } }, formatNumber(summary.totalCacheReadTokens), " cached reads")
      ),
      /* @__PURE__ */ import_react.default.createElement(
        "div",
        {
          style: {
            background: "var(--dsw-alias-bg-layer-2, #2c2c2c)",
            border: "1px solid var(--dsw-alias-border-l2, #494949)",
            borderRadius: 10,
            padding: "14px 16px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)"
          }
        },
        /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 11, color: "var(--dsw-alias-label-tertiary, #a0a0a0)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 } }, selectedSessionId === "all" ? "Daily Average" : "Total Steps"),
        /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 24, fontWeight: 700, margin: "6px 0 2px", color: "var(--dsw-alias-label-primary, #ffffff)" } }, selectedSessionId === "all" ? formatNumber(summary.dailyAverage) : summary.totalTurns),
        /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 11, color: "var(--dsw-alias-label-secondary, #b9b9b9)" } }, selectedSessionId === "all" ? `Across ${summary.activeDays} active days` : `${formatNumber(summary.totalInputTokens + summary.totalOutputTokens)} billed`)
      ),
      /* @__PURE__ */ import_react.default.createElement(
        "div",
        {
          style: {
            background: "var(--dsw-alias-bg-layer-2, #2c2c2c)",
            border: "1px solid var(--dsw-alias-border-l2, #494949)",
            borderRadius: 10,
            padding: "14px 16px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)"
          }
        },
        /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 11, color: "var(--dsw-alias-label-tertiary, #a0a0a0)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 } }, selectedSessionId === "all" ? "Active Streak" : "Active Days"),
        /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 24, fontWeight: 700, margin: "6px 0 2px", color: "var(--dsw-alias-label-primary, #ffffff)" } }, selectedSessionId === "all" ? `${summary.currentStreak} days` : `${summary.activeDays} days`),
        /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 11, color: "var(--dsw-alias-label-secondary, #b9b9b9)" } }, selectedSessionId === "all" ? `Longest streak: ${summary.longestStreak} days` : `Session: ${activeView.sessionTitle.slice(0, 24)}`)
      )
    ),
    /* @__PURE__ */ import_react.default.createElement(
      "div",
      {
        style: {
          background: "var(--dsw-alias-bg-layer-2, #2c2c2c)",
          border: "1px solid var(--dsw-alias-border-l2, #494949)",
          borderRadius: 12,
          padding: "20px 22px",
          position: "relative",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)"
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
      calendarGrid && /* @__PURE__ */ import_react.default.createElement(
        "div",
        {
          ref: scrollContainerRef,
          style: {
            width: "100%",
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
            paddingBottom: "10px"
          }
        },
        /* @__PURE__ */ import_react.default.createElement("div", { style: { minWidth: "920px", width: "100%", display: "inline-block" } }, /* @__PURE__ */ import_react.default.createElement(
          "svg",
          {
            viewBox: "0 0 920 152",
            style: {
              width: "100%",
              minWidth: "920px",
              height: "152px",
              display: "block",
              overflow: "visible"
            }
          },
          monthHeaders.map((m, i) => /* @__PURE__ */ import_react.default.createElement(
            "text",
            {
              key: i,
              x: 36 + m.col * 16.5,
              y: 12,
              fontSize: 11,
              fill: "var(--dsw-alias-label-tertiary, #888888)",
              fontFamily: "inherit"
            },
            m.label
          )),
          /* @__PURE__ */ import_react.default.createElement("text", { x: 4, y: 51, fontSize: 10, fill: "var(--dsw-alias-label-tertiary, #888888)", fontFamily: "inherit" }, "Mon"),
          /* @__PURE__ */ import_react.default.createElement("text", { x: 4, y: 85, fontSize: 10, fill: "var(--dsw-alias-label-tertiary, #888888)", fontFamily: "inherit" }, "Wed"),
          /* @__PURE__ */ import_react.default.createElement("text", { x: 4, y: 119, fontSize: 10, fill: "var(--dsw-alias-label-tertiary, #888888)", fontFamily: "inherit" }, "Fri"),
          calendarGrid.map((week, colIdx) => /* @__PURE__ */ import_react.default.createElement("g", { key: colIdx, transform: `translate(${36 + colIdx * 16.5}, 22)` }, week.map((day, rowIdx) => {
            if (!day) return null;
            const lvl = day.stats.level || 0;
            const bg = DEEPSEEK_LEVELS[lvl];
            const isSelected = selectedDate === day.date;
            const isHovered = hoveredDay?.date === day.date;
            const strokeColor = isSelected ? "#ffffff" : isHovered ? "#5686fe" : lvl === 0 ? "rgba(255, 255, 255, 0.06)" : "transparent";
            const strokeWidth = isSelected ? 2 : isHovered ? 1.5 : 1;
            return /* @__PURE__ */ import_react.default.createElement(
              "rect",
              {
                key: rowIdx,
                x: 0,
                y: rowIdx * 17,
                width: 13,
                height: 13,
                rx: 2.5,
                ry: 2.5,
                fill: bg,
                stroke: strokeColor,
                strokeWidth,
                style: {
                  cursor: "pointer",
                  transition: "fill 0.12s ease, stroke 0.12s ease",
                  filter: isSelected ? "drop-shadow(0 0 6px rgba(86, 134, 254, 0.9))" : isHovered ? "drop-shadow(0 0 4px rgba(86, 134, 254, 0.7))" : lvl === 4 ? "drop-shadow(0 0 4px rgba(79, 133, 255, 0.6))" : "none"
                },
                onClick: () => {
                  setSelectedDate(isSelected ? null : day.date);
                },
                onMouseEnter: (e) => {
                  setHoveredDay({ date: day.date, stats: day.stats });
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 8 });
                },
                onMouseLeave: () => {
                  setHoveredDay(null);
                  setTooltipPos(null);
                }
              }
            );
          })))
        )),
        /* @__PURE__ */ import_react.default.createElement(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 14,
              fontSize: 11,
              color: "var(--dsw-alias-label-tertiary, #a0a0a0)"
            }
          },
          /* @__PURE__ */ import_react.default.createElement("span", { style: { fontSize: 11 } }, "Tip: Click any day to inspect sessions and token breakdown"),
          /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6 } }, /* @__PURE__ */ import_react.default.createElement("span", null, "Less"), DEEPSEEK_LEVELS.map((c, i) => /* @__PURE__ */ import_react.default.createElement(
            "div",
            {
              key: i,
              style: {
                width: 12.5,
                height: 12.5,
                borderRadius: 2.5,
                backgroundColor: c,
                border: i === 0 ? "1px solid rgba(255, 255, 255, 0.06)" : "none",
                filter: i === 4 ? "drop-shadow(0 0 3px rgba(79, 133, 255, 0.5))" : "none"
              }
            }
          )), /* @__PURE__ */ import_react.default.createElement("span", null, "More"))
        )
      )
    ),
    selectedDate && /* @__PURE__ */ import_react.default.createElement(
      "div",
      {
        style: {
          marginTop: 18,
          background: "var(--dsw-alias-bg-layer-2, #2c2c2c)",
          border: "1px solid var(--dsw-alias-border-l2, #494949)",
          borderRadius: 12,
          padding: "18px 20px",
          boxShadow: "0 6px 20px rgba(0, 0, 0, 0.25)",
          animation: "fadeIn 0.15s ease"
        }
      },
      /* @__PURE__ */ import_react.default.createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--dsw-alias-border-l1, #3a3a3a)",
            paddingBottom: 12,
            marginBottom: 14
          }
        },
        /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 16, fontWeight: 700, color: "var(--dsw-alias-label-primary, #ffffff)" } }, (/* @__PURE__ */ new Date(selectedDate + "T00:00:00")).toLocaleDateString(void 0, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric"
        })), /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 12, color: "var(--dsw-alias-label-secondary, #b9b9b9)", marginTop: 2 } }, inspectedDayStats && inspectedDayStats.totalTokens > 0 ? /* @__PURE__ */ import_react.default.createElement("span", null, /* @__PURE__ */ import_react.default.createElement("strong", { style: { color: "#4f85ff" } }, formatExact(inspectedDayStats.totalTokens)), " total tokens across", " ", /* @__PURE__ */ import_react.default.createElement("strong", null, inspectedDayStats.turns), " turns") : "No activity recorded")),
        /* @__PURE__ */ import_react.default.createElement(
          "button",
          {
            onClick: () => setSelectedDate(null),
            style: {
              background: "transparent",
              border: "none",
              color: "var(--dsw-alias-label-tertiary)",
              cursor: "pointer",
              fontSize: 16,
              padding: "4px 8px",
              borderRadius: 4
            },
            title: "Close day view"
          },
          "\u2715"
        )
      ),
      inspectedDayStats && inspectedDayStats.totalTokens > 0 && /* @__PURE__ */ import_react.default.createElement(
        "div",
        {
          style: {
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 16,
            fontSize: 12
          }
        },
        /* @__PURE__ */ import_react.default.createElement("div", { style: { padding: "6px 12px", background: "var(--dsw-alias-bg-layer-1, #1e1e1e)", borderRadius: 6, border: "1px solid var(--dsw-alias-border-l1)" } }, /* @__PURE__ */ import_react.default.createElement("span", { style: { color: "var(--dsw-alias-label-tertiary)" } }, "Billed Input: "), /* @__PURE__ */ import_react.default.createElement("strong", null, formatNumber(inspectedDayStats.inputTokens))),
        /* @__PURE__ */ import_react.default.createElement("div", { style: { padding: "6px 12px", background: "var(--dsw-alias-bg-layer-1, #1e1e1e)", borderRadius: 6, border: "1px solid var(--dsw-alias-border-l1)" } }, /* @__PURE__ */ import_react.default.createElement("span", { style: { color: "var(--dsw-alias-label-tertiary)" } }, "Output Generated: "), /* @__PURE__ */ import_react.default.createElement("strong", null, formatNumber(inspectedDayStats.outputTokens))),
        /* @__PURE__ */ import_react.default.createElement("div", { style: { padding: "6px 12px", background: "var(--dsw-alias-bg-layer-1, #1e1e1e)", borderRadius: 6, border: "1px solid var(--dsw-alias-border-l1)" } }, /* @__PURE__ */ import_react.default.createElement("span", { style: { color: "var(--dsw-alias-label-tertiary)" } }, "Cache Reads: "), /* @__PURE__ */ import_react.default.createElement("strong", { style: { color: "#38bdf8" } }, formatNumber(inspectedDayStats.cacheReadTokens)), " (", Math.round(inspectedDayStats.cacheReadTokens / inspectedDayStats.totalTokens * 100), "%)")
      ),
      /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: "var(--dsw-alias-label-primary)", marginBottom: 10 } }, "Sessions Active on this Day (", inspectedDayStats?.sessions?.length || 0, ")"), inspectedDayStats?.sessions && inspectedDayStats.sessions.length > 0 ? /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflowY: "auto" } }, inspectedDayStats.sessions.map((sess, idx) => /* @__PURE__ */ import_react.default.createElement(
        "div",
        {
          key: idx,
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 14px",
            background: "var(--dsw-alias-bg-layer-1, #1e1e1e)",
            border: "1px solid var(--dsw-alias-border-l1, #3a3a3a)",
            borderRadius: 8
          }
        },
        /* @__PURE__ */ import_react.default.createElement("div", { style: { minWidth: 0, flex: 1, paddingRight: 16 } }, /* @__PURE__ */ import_react.default.createElement("div", { style: { fontWeight: 600, fontSize: 13, color: "var(--dsw-alias-label-primary, #ffffff)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, sess.sessionTitle), /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 11, color: "var(--dsw-alias-label-tertiary, #a0a0a0)", marginTop: 2 } }, "Started ", new Date(sess.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), " \xB7 ID: ", sess.sessionId.slice(0, 10))),
        /* @__PURE__ */ import_react.default.createElement("div", { style: { textAlign: "right", flexShrink: 0 } }, /* @__PURE__ */ import_react.default.createElement("div", { style: { fontWeight: 700, fontSize: 13, color: "#4f85ff" } }, formatNumber(sess.totalTokens), " tokens"), /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 11, color: "var(--dsw-alias-label-secondary)", marginTop: 2 } }, sess.turns, " turns \xB7 ", formatNumber(sess.inputTokens + sess.outputTokens), " billed"))
      ))) : /* @__PURE__ */ import_react.default.createElement("div", { style: { padding: "16px", textAlign: "center", color: "var(--dsw-alias-label-tertiary)", fontSize: 12, background: "var(--dsw-alias-bg-layer-1)", borderRadius: 8 } }, "No session records found for this date."))
    ),
    hoveredDay && tooltipPos && !selectedDate && /* @__PURE__ */ import_react.default.createElement(
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
      hoveredDay.stats.totalTokens === 0 ? /* @__PURE__ */ import_react.default.createElement("div", { style: { color: "var(--dsw-alias-label-tertiary)" } }, "No activity recorded") : /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("div", { style: { color: "#4f85ff", fontWeight: 600 } }, formatExact(hoveredDay.stats.totalTokens), " tokens"), /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 11, color: "var(--dsw-alias-label-secondary)", marginTop: 2 } }, hoveredDay.stats.turns, " requests / steps"), /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 10, color: "var(--dsw-alias-label-tertiary)", marginTop: 4 } }, "Click to inspect sessions on this day"))
    )
  );
}
var HeatmapErrorBoundary = class extends import_react.default.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("Heatmap rendering error:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return /* @__PURE__ */ import_react.default.createElement("div", { style: { padding: "30px 20px", color: "var(--dsw-alias-state-error-primary, #ef4444)" } }, /* @__PURE__ */ import_react.default.createElement("h3", { style: { margin: "0 0 10px 0" } }, "Token Heatmap Encountered an Error"), /* @__PURE__ */ import_react.default.createElement(
        "pre",
        {
          style: {
            fontSize: 12,
            background: "rgba(0,0,0,0.3)",
            padding: 12,
            borderRadius: 8,
            overflowX: "auto"
          }
        },
        String(this.state.error?.message || this.state.error)
      ), /* @__PURE__ */ import_react.default.createElement(
        "button",
        {
          onClick: () => this.setState({ hasError: false, error: null }),
          style: {
            marginTop: 12,
            padding: "6px 14px",
            background: "var(--dsw-alias-brand-primary, #3964fe)",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer"
          }
        },
        "Retry"
      ));
    }
    return this.props.children;
  }
};
function HeatmapView() {
  return /* @__PURE__ */ import_react.default.createElement(HeatmapErrorBoundary, null, /* @__PURE__ */ import_react.default.createElement(HeatmapInnerView, null));
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
          maxWidth: "1040px",
          maxHeight: "92vh",
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
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
        transition: all 0.15s ease;
      `;
      button.onmouseenter = () => {
        button.style.background = "rgba(51, 109, 250, 0.22)";
        button.style.borderColor = "#336dfa";
        button.style.boxShadow = "0 2px 8px rgba(51, 109, 250, 0.25)";
      };
      button.onmouseleave = () => {
        button.style.background = "rgba(51, 109, 250, 0.12)";
        button.style.borderColor = "rgba(51, 109, 250, 0.35)";
        button.style.boxShadow = "0 1px 4px rgba(0, 0, 0, 0.15)";
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
