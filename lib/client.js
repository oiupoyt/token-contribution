window.__ModuleLoader__.load({ id: "token-contribution", factory: (require) => { var module = { exports: {} }; var exports = module.exports;
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

// src/shared/types.ts
var RANGES = [
  { id: "1h", label: "Last hour", ms: 36e5 },
  { id: "24h", label: "Last 24 hours", ms: 864e5 },
  { id: "7d", label: "Last 7 days", ms: 7 * 864e5 },
  { id: "30d", label: "Last 30 days", ms: 30 * 864e5 },
  { id: "90d", label: "Last 90 days", ms: 90 * 864e5 },
  { id: "365d", label: "Last year", ms: 365 * 864e5 },
  { id: "all", label: "All time", ms: 0 }
];
var COUNT_KEYS = [
  "totalTokens",
  "inputTokens",
  "outputTokens",
  "reasoningTokens",
  "cacheReadTokens",
  "cacheWriteTokens",
  "turns"
];
var fill = (o) => {
  for (const k of COUNT_KEYS) if (o[k] === void 0) o[k] = 0;
  return o;
};
function expandResponse(raw) {
  const sessions = (raw.sessions ?? []).map((s) => {
    fill(s);
    s.createdAt ??= 0;
    for (const d of Object.values(s.days ?? {})) fill(d);
    for (const m of Object.values(s.models ?? {})) fill(m);
    return s;
  });
  const byId = new Map(sessions.map((s) => [s.id, s]));
  for (const d of Object.values(raw.days ?? {})) {
    fill(d);
    d.level ??= 0;
    d.sessions = (d.sessions ?? []).map((row) => {
      const s = byId.get(row.sessionId);
      return fill({ ...row, sessionTitle: s?.title ?? row.sessionId, createdAt: s?.createdAt ?? 0 });
    });
  }
  for (const m of raw.models ?? []) fill(m), m.percentage ??= 0;
  for (const p of raw.providers ?? []) fill(p), p.percentage ??= 0;
  fill(raw.summary);
  raw.summary.activeDays ??= 0;
  raw.summary.currentStreak ??= 0;
  raw.summary.longestStreak ??= 0;
  raw.summary.dailyAverage ??= 0;
  raw.summary.peakDay ??= null;
  if (raw.summary.peakDay) raw.summary.peakDay.tokens ??= 0, raw.summary.peakDay.turns ??= 0;
  raw.sessions = sessions;
  raw.providers ??= [];
  raw.models ??= [];
  raw.range ??= "all";
  return raw;
}

// src/client/HeatmapView.tsx
var TOKEN_TYPES = [
  { key: "inputTokens", label: "Input", color: "#4f85ff" },
  { key: "outputTokens", label: "Output", color: "#22c55e" },
  { key: "reasoningTokens", label: "Reasoning", color: "#a855f7" },
  { key: "cacheReadTokens", label: "Cache read", color: "#8391ab" },
  { key: "cacheWriteTokens", label: "Cache write", color: "#f59e0b" }
];
var EMPTY_COUNTS = {
  totalTokens: 0,
  inputTokens: 0,
  outputTokens: 0,
  reasoningTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  turns: 0
};
function formatNumber(num) {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(1) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(1) + "k";
  return num.toLocaleString();
}
function formatExact(num) {
  return num.toLocaleString();
}
var RANGE_KEY = "token-contribution:range";
var SELECT = {
  background: "var(--dsw-alias-bg-layer-2, #2c2c2c)",
  border: "1px solid var(--dsw-alias-border-l2, #494949)",
  color: "var(--dsw-alias-label-primary, #eeeeee)",
  borderRadius: 8,
  padding: "6px 12px",
  fontSize: 12,
  cursor: "pointer"
};
var CARD = {
  background: "var(--dsw-alias-bg-layer-2, #2c2c2c)",
  border: "1px solid var(--dsw-alias-border-l2, #494949)",
  borderRadius: 12,
  padding: "18px 20px",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)"
};
function TypeLine({ counts }) {
  const parts = TOKEN_TYPES.filter((t) => counts[t.key] > 0);
  if (parts.length === 0) return null;
  return /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: "2px 12px", marginTop: 5, fontSize: 11, color: "var(--dsw-alias-label-secondary, #b9b9b9)" } }, parts.map((t) => /* @__PURE__ */ import_react.default.createElement("span", { key: t.key, title: `${t.label}: ${formatExact(counts[t.key])}`, style: { display: "inline-flex", alignItems: "center", gap: 4 } }, /* @__PURE__ */ import_react.default.createElement("span", { "aria-hidden": "true", style: { width: 6, height: 6, borderRadius: 2, background: t.color } }), t.label, " ", formatNumber(counts[t.key]))));
}
function TokenBreakdown({ counts, compact = false }) {
  const shown = TOKEN_TYPES.filter((t) => !compact || counts[t.key] > 0);
  if (shown.length === 0) return null;
  return /* @__PURE__ */ import_react.default.createElement(
    "div",
    {
      style: {
        display: "grid",
        gridTemplateColumns: compact ? "repeat(auto-fit, minmax(120px, 1fr))" : "repeat(auto-fit, minmax(150px, 1fr))",
        gap: compact ? 8 : 12
      }
    },
    shown.map((t) => /* @__PURE__ */ import_react.default.createElement(
      "div",
      {
        key: t.key,
        style: {
          padding: compact ? "6px 10px" : "12px 14px",
          background: "var(--dsw-alias-bg-layer-1, #1e1e1e)",
          border: "1px solid var(--dsw-alias-border-l1, #3a3a3a)",
          borderRadius: compact ? 6 : 10
        }
      },
      /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--dsw-alias-label-secondary, #b9b9b9)" } }, /* @__PURE__ */ import_react.default.createElement("span", { "aria-hidden": "true", style: { width: 8, height: 8, borderRadius: 2, background: t.color, flexShrink: 0 } }), t.label),
      /* @__PURE__ */ import_react.default.createElement(
        "div",
        {
          title: formatExact(counts[t.key]),
          style: { fontSize: compact ? 13 : 18, fontWeight: 700, marginTop: 4, color: "var(--dsw-alias-label-primary, #ffffff)", fontVariantNumeric: "tabular-nums" }
        },
        formatNumber(counts[t.key])
      )
    ))
  );
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
  const [range, setRange] = (0, import_react.useState)(() => {
    const saved = typeof localStorage !== "undefined" ? localStorage.getItem(RANGE_KEY) : null;
    return RANGES.find((r) => r.id === saved)?.id ?? "all";
  });
  const [selectedDate, setSelectedDate] = (0, import_react.useState)(null);
  const [chartRange, setChartRange] = (0, import_react.useState)(30);
  const [chartType, setChartType] = (0, import_react.useState)("all");
  const [hoveredDay, setHoveredDay] = (0, import_react.useState)(null);
  const [hoveredBar, setHoveredBar] = (0, import_react.useState)(null);
  const [tooltipPos, setTooltipPos] = (0, import_react.useState)(null);
  const rootRef = (0, import_react.useRef)(null);
  (0, import_react.useEffect)(() => {
    if (typeof document === "undefined") return;
    const findPanel = () => {
      return rootRef.current?.closest('[class*="_panel"]') || document.querySelector(".VOzbGW_panel") || document.querySelector('[class*="_panel"]');
    };
    const panel = findPanel();
    if (panel) {
      const prevWidth = panel.style.width;
      const prevMaxWidth = panel.style.maxWidth;
      const prevTransition = panel.style.transition;
      panel.style.transition = "width 0.25s cubic-bezier(0.16, 1, 0.3, 1), max-width 0.25s ease";
      panel.style.setProperty("width", "min(1180px, calc(100vw - 32px))", "important");
      panel.style.setProperty("max-width", "calc(100vw - 32px)", "important");
      return () => {
        panel.style.width = prevWidth;
        panel.style.maxWidth = prevMaxWidth;
        panel.style.transition = prevTransition;
      };
    }
  }, []);
  const requestSeq = (0, import_react.useRef)(0);
  const fetchStats = () => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);
    fetch(`/api/token-contribution/stats?range=${encodeURIComponent(range)}`).then((r) => {
      if (!r.ok) throw new Error(`HTTP error ${r.status}`);
      return r.json();
    }).then((res) => {
      if (seq !== requestSeq.current) return;
      setData(expandResponse(res));
      setLoading(false);
    }).catch((err) => {
      if (seq !== requestSeq.current) return;
      setError(err.message);
      setLoading(false);
    });
  };
  (0, import_react.useEffect)(() => {
    fetchStats();
    try {
      localStorage.setItem(RANGE_KEY, range);
    } catch {
    }
  }, [range]);
  (0, import_react.useEffect)(() => {
    if (data && selectedSessionId !== "all" && !data.sessions.some((s) => s.id === selectedSessionId)) {
      setSelectedSessionId("all");
      setSelectedDate(null);
    }
  }, [data]);
  const activeView = (0, import_react.useMemo)(() => {
    if (!data) return null;
    if (selectedSessionId === "all") {
      return {
        summary: data.summary,
        days: data.days,
        models: data.models,
        providers: data.providers,
        sessionTitle: "All Sessions (Global)"
      };
    }
    const session = (data.sessions || []).find((s) => s.id === selectedSessionId);
    if (!session) {
      return {
        summary: data.summary,
        days: data.days,
        models: data.models,
        providers: data.providers,
        sessionTitle: "All Sessions (Global)"
      };
    }
    const totalTokens = session.totalTokens;
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
      leveledDays[date] = {
        ...stats,
        level: lvl,
        sessions: [{ sessionId: session.id, sessionTitle: session.title, createdAt: session.createdAt, ...stats }]
      };
    }
    const pct = (t) => totalTokens > 0 ? Math.round(t / totalTokens * 1e3) / 10 : 0;
    const sessionModels = Object.entries(session.models).map(([model, m]) => ({ model, ...m, percentage: pct(m.totalTokens) })).sort((a, b) => b.totalTokens - a.totalTokens);
    const byProvider = /* @__PURE__ */ new Map();
    for (const m of sessionModels) {
      const p = byProvider.get(m.provider) ?? { ...EMPTY_COUNTS };
      for (const t of [...TOKEN_TYPES.map((x) => x.key), "totalTokens", "turns"]) p[t] += m[t];
      byProvider.set(m.provider, p);
    }
    const sessionProviders = [...byProvider].map(([provider, p]) => ({ provider, ...p, percentage: pct(p.totalTokens) })).sort((a, b) => b.totalTokens - a.totalTokens);
    const summary2 = {
      totalTokens,
      inputTokens: session.inputTokens,
      outputTokens: session.outputTokens,
      reasoningTokens: session.reasoningTokens,
      cacheReadTokens: session.cacheReadTokens,
      cacheWriteTokens: session.cacheWriteTokens,
      turns: session.turns,
      activeDays,
      currentStreak: 0,
      longestStreak: 0,
      peakDay,
      dailyAverage
    };
    return {
      summary: summary2,
      days: leveledDays,
      models: sessionModels,
      providers: sessionProviders,
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
      const dayStats = activeView.days[dateKey] || { ...EMPTY_COUNTS, level: 0, sessions: [] };
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
  const chartData = (0, import_react.useMemo)(() => {
    if (!activeView) return [];
    const now = /* @__PURE__ */ new Date();
    const items = [];
    for (let i = chartRange - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const stats = activeView.days[dateKey] || { ...EMPTY_COUNTS, level: 0, sessions: [] };
      items.push({
        date: dateKey,
        label: `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`,
        stats,
        // Bar height: one type when a type is picked, otherwise every type stacked.
        value: chartType === "all" ? TOKEN_TYPES.reduce((a, t) => a + stats[t.key], 0) : stats[chartType]
      });
    }
    return items;
  }, [activeView, chartRange, chartType]);
  const maxChartTokens = (0, import_react.useMemo)(() => {
    return Math.max(...chartData.map((d) => d.value), chartType === "all" ? 1e6 : 1e3);
  }, [chartData, chartType]);
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
  const cacheHitPercent = summary.totalTokens > 0 ? Math.round(summary.cacheReadTokens / summary.totalTokens * 100) : 0;
  const inspectedDayStats = selectedDate ? activeView.days[selectedDate] : null;
  return /* @__PURE__ */ import_react.default.createElement(
    "div",
    {
      "data-dsh-heatmap": "true",
      ref: rootRef,
      style: {
        boxSizing: "border-box",
        width: "100%",
        maxWidth: "1020px",
        margin: "0 auto",
        padding: "8px 0 40px",
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
          marginBottom: 16
        }
      },
      /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement(
        "h2",
        {
          style: {
            margin: 0,
            fontSize: 20,
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
          RANGES.find((r) => r.id === range)?.label ?? "All time"
        )
      ), /* @__PURE__ */ import_react.default.createElement(
        "p",
        {
          style: {
            margin: "4px 0 0",
            fontSize: 12,
            color: "var(--dsw-alias-label-tertiary, #a0a0a0)"
          }
        },
        "Daily token throughput and model breakdown across sessions"
      )),
      /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }, "aria-busy": loading }, /* @__PURE__ */ import_react.default.createElement("label", { style: { display: "flex", alignItems: "center", gap: 6 } }, /* @__PURE__ */ import_react.default.createElement("span", { style: { fontSize: 12, color: "var(--dsw-alias-label-tertiary)" } }, "Time:"), /* @__PURE__ */ import_react.default.createElement("select", { className: "tc-select", value: range, onChange: (e) => setRange(e.target.value), style: SELECT }, RANGES.map((r) => /* @__PURE__ */ import_react.default.createElement("option", { key: r.id, value: r.id }, r.label)))), /* @__PURE__ */ import_react.default.createElement("label", { style: { display: "flex", alignItems: "center", gap: 6 } }, /* @__PURE__ */ import_react.default.createElement("span", { style: { fontSize: 12, color: "var(--dsw-alias-label-tertiary)" } }, "Session:"), /* @__PURE__ */ import_react.default.createElement(
        "select",
        {
          className: "tc-select",
          value: selectedSessionId,
          onChange: (e) => {
            setSelectedSessionId(e.target.value);
            setSelectedDate(null);
          },
          style: { ...SELECT, maxWidth: 240 }
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
        loading ? "Loading\u2026" : "\u21BB Refresh"
      ))
    ),
    summary.turns === 0 && range !== "all" && /* @__PURE__ */ import_react.default.createElement("div", { role: "status", style: { ...CARD, margin: "12px 0 0", fontSize: 13, color: "var(--dsw-alias-label-secondary, #b9b9b9)" } }, "No requests in the ", RANGES.find((r) => r.id === range)?.label.toLowerCase(), ".", " ", /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        type: "button",
        onClick: () => setRange("all"),
        style: { background: "none", border: 0, padding: 0, color: "#4f85ff", cursor: "pointer", font: "inherit", textDecoration: "underline" }
      },
      "Show all time"
    )),
    /* @__PURE__ */ import_react.default.createElement(
      "div",
      {
        style: {
          textAlign: "center",
          margin: "12px 0 20px",
          padding: "16px 20px",
          background: "var(--dsw-alias-bg-layer-2, #2c2c2c)",
          border: "1px solid var(--dsw-alias-border-l2, #494949)",
          borderRadius: 12,
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)"
        }
      },
      /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--dsw-alias-label-tertiary, #a0a0a0)", fontWeight: 600 } }, "Total Tokens Processed"),
      /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 36, fontWeight: 800, margin: "6px 0 2px", color: "#4f85ff", letterSpacing: "-0.03em" } }, formatExact(summary.totalTokens)),
      /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 13, color: "var(--dsw-alias-label-secondary, #b9b9b9)" } }, /* @__PURE__ */ import_react.default.createElement("strong", null, formatNumber(summary.totalTokens)), " tokens across ", summary.activeDays, " active days (", summary.turns, " total requests)")
    ),
    /* @__PURE__ */ import_react.default.createElement(
      "div",
      {
        style: {
          background: "var(--dsw-alias-bg-layer-2, #2c2c2c)",
          border: "1px solid var(--dsw-alias-border-l2, #494949)",
          borderRadius: 12,
          padding: "18px 20px",
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
            marginBottom: 12,
            fontSize: 13,
            fontWeight: 600
          }
        },
        /* @__PURE__ */ import_react.default.createElement("span", null, "Contribution Calendar"),
        summary.peakDay && /* @__PURE__ */ import_react.default.createElement("span", { style: { fontSize: 12, fontWeight: 400, color: "var(--dsw-alias-label-secondary)" } }, "Peak day: ", /* @__PURE__ */ import_react.default.createElement("strong", { style: { color: "var(--dsw-alias-label-primary)" } }, summary.peakDay.date), " (", formatNumber(summary.peakDay.tokens), " tokens)")
      ),
      calendarGrid && /* @__PURE__ */ import_react.default.createElement("div", { style: { width: "100%", display: "flex", flexDirection: "column", alignItems: "center" } }, /* @__PURE__ */ import_react.default.createElement(
        "svg",
        {
          viewBox: "0 0 880 136",
          style: {
            width: "100%",
            maxWidth: "880px",
            height: "auto",
            display: "block",
            overflow: "visible"
          }
        },
        monthHeaders.map((m, i) => /* @__PURE__ */ import_react.default.createElement(
          "text",
          {
            key: i,
            x: 32 + m.col * 15.6,
            y: 11,
            fontSize: 11,
            fill: "var(--dsw-alias-label-tertiary, #888888)",
            fontFamily: "inherit"
          },
          m.label
        )),
        /* @__PURE__ */ import_react.default.createElement("text", { x: 2, y: 45, fontSize: 10, fill: "var(--dsw-alias-label-tertiary, #888888)", fontFamily: "inherit" }, "Mon"),
        /* @__PURE__ */ import_react.default.createElement("text", { x: 2, y: 76, fontSize: 10, fill: "var(--dsw-alias-label-tertiary, #888888)", fontFamily: "inherit" }, "Wed"),
        /* @__PURE__ */ import_react.default.createElement("text", { x: 2, y: 107, fontSize: 10, fill: "var(--dsw-alias-label-tertiary, #888888)", fontFamily: "inherit" }, "Fri"),
        calendarGrid.map((week, colIdx) => /* @__PURE__ */ import_react.default.createElement("g", { key: colIdx, transform: `translate(${32 + colIdx * 15.6}, 18)` }, week.map((day, rowIdx) => {
          if (!day) return null;
          const lvl = day.stats.level || 0;
          const bg = DEEPSEEK_LEVELS[lvl];
          const isSelected = selectedDate === day.date;
          const isHovered = hoveredDay?.date === day.date;
          const strokeColor = isSelected ? "#ffffff" : isHovered ? "#5686fe" : lvl === 0 ? "rgba(255, 255, 255, 0.06)" : "transparent";
          const strokeWidth = isSelected ? 1.8 : isHovered ? 1.4 : 1;
          return /* @__PURE__ */ import_react.default.createElement(
            "rect",
            {
              key: rowIdx,
              x: 0,
              y: rowIdx * 15.6,
              width: 12,
              height: 12,
              rx: 2.5,
              ry: 2.5,
              fill: bg,
              stroke: strokeColor,
              strokeWidth,
              style: {
                cursor: "pointer",
                transition: "fill 0.12s ease, stroke 0.12s ease",
                filter: isSelected ? "drop-shadow(0 0 6px rgba(86, 134, 254, 0.9))" : isHovered ? "drop-shadow(0 0 4px rgba(86, 134, 254, 0.7))" : lvl === 4 ? "drop-shadow(0 0 3px rgba(79, 133, 255, 0.5))" : "none"
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
      ), /* @__PURE__ */ import_react.default.createElement(
        "div",
        {
          style: {
            width: "100%",
            maxWidth: "880px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 12,
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
              width: 12,
              height: 12,
              borderRadius: 2.5,
              backgroundColor: c,
              border: i === 0 ? "1px solid rgba(255, 255, 255, 0.06)" : "none",
              filter: i === 4 ? "drop-shadow(0 0 3px rgba(79, 133, 255, 0.5))" : "none"
            }
          }
        )), /* @__PURE__ */ import_react.default.createElement("span", null, "More"))
      ))
    ),
    /* @__PURE__ */ import_react.default.createElement(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginTop: 18,
          marginBottom: 18
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
        /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 11, color: "var(--dsw-alias-label-tertiary, #a0a0a0)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 } }, "Cache Hit Ratio"),
        /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 24, fontWeight: 700, margin: "6px 0 2px", color: "var(--dsw-alias-label-primary, #ffffff)" } }, cacheHitPercent, "%"),
        /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 11, color: "var(--dsw-alias-label-secondary, #b9b9b9)" } }, formatNumber(summary.cacheReadTokens), " cached reads")
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
        /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 24, fontWeight: 700, margin: "6px 0 2px", color: "var(--dsw-alias-label-primary, #ffffff)" } }, selectedSessionId === "all" ? formatNumber(summary.dailyAverage) : summary.turns),
        /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 11, color: "var(--dsw-alias-label-secondary, #b9b9b9)" } }, selectedSessionId === "all" ? `Across ${summary.activeDays} active days` : `${formatNumber(summary.inputTokens + summary.outputTokens)} billed`)
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
        /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 11, color: "var(--dsw-alias-label-tertiary, #a0a0a0)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 } }, "Peak Volume Day"),
        /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 20, fontWeight: 700, margin: "6px 0 2px", color: "var(--dsw-alias-label-primary, #ffffff)" } }, summary.peakDay ? formatNumber(summary.peakDay.tokens) : "None"),
        /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 11, color: "var(--dsw-alias-label-secondary, #b9b9b9)" } }, summary.peakDay ? summary.peakDay.date : "No activity")
      )
    ),
    /* @__PURE__ */ import_react.default.createElement("div", { style: { ...CARD, marginBottom: 18 } }, /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 } }, /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 13, fontWeight: 650, color: "var(--dsw-alias-label-primary, #ffffff)" } }, "Token types"), /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 11, color: "var(--dsw-alias-label-secondary, #b9b9b9)" } }, "Total counts input, output and cache read. Reasoning is reported separately and not added.")), /* @__PURE__ */ import_react.default.createElement(TokenBreakdown, { counts: summary })),
    activeView.providers.length > 0 && /* @__PURE__ */ import_react.default.createElement("div", { style: { ...CARD, marginBottom: 18 } }, /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 } }, /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 13, fontWeight: 650, color: "var(--dsw-alias-label-primary, #ffffff)" } }, "Providers"), /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 11, color: "var(--dsw-alias-label-secondary, #b9b9b9)" } }, activeView.providers.length, " provider", activeView.providers.length === 1 ? "" : "s")), /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10 } }, activeView.providers.map((p) => /* @__PURE__ */ import_react.default.createElement("div", { key: p.provider }, /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12, marginBottom: 5, flexWrap: "wrap" } }, /* @__PURE__ */ import_react.default.createElement("span", { style: { fontWeight: 600, color: "var(--dsw-alias-label-primary)" } }, p.provider), /* @__PURE__ */ import_react.default.createElement("span", { style: { color: "var(--dsw-alias-label-secondary)" } }, /* @__PURE__ */ import_react.default.createElement("strong", { style: { color: "#4f85ff" } }, formatNumber(p.totalTokens)), " (", p.percentage, "%) \xB7 ", p.turns, " requests")), /* @__PURE__ */ import_react.default.createElement("div", { style: { width: "100%", height: 6, background: "rgba(255, 255, 255, 0.06)", borderRadius: 3, overflow: "hidden" } }, /* @__PURE__ */ import_react.default.createElement("div", { style: { width: `${Math.max(1, p.percentage)}%`, height: "100%", background: "#336dfa", borderRadius: 3 } })), /* @__PURE__ */ import_react.default.createElement(TypeLine, { counts: p }))))),
    activeView.models && activeView.models.length > 0 && /* @__PURE__ */ import_react.default.createElement(
      "div",
      {
        style: {
          background: "var(--dsw-alias-bg-layer-2, #2c2c2c)",
          border: "1px solid var(--dsw-alias-border-l2, #494949)",
          borderRadius: 12,
          padding: "18px 20px",
          marginBottom: 18,
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)"
        }
      },
      /* @__PURE__ */ import_react.default.createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12
          }
        },
        /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 13, fontWeight: 650, color: "var(--dsw-alias-label-primary, #ffffff)" } }, "Model Usage Breakdown"),
        /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 11, color: "var(--dsw-alias-label-tertiary, #a0a0a0)" } }, activeView.models.length, " model", activeView.models.length === 1 ? "" : "s", " tracked")
      ),
      /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10 } }, activeView.models.map((m) => /* @__PURE__ */ import_react.default.createElement("div", { key: m.model }, /* @__PURE__ */ import_react.default.createElement(
        "div",
        {
          style: {
            display: "flex",
            justifyContent: "space-between",
            fontSize: 12,
            marginBottom: 5
          }
        },
        /* @__PURE__ */ import_react.default.createElement("span", { style: { fontWeight: 600, color: "var(--dsw-alias-label-primary)" } }, m.model, /* @__PURE__ */ import_react.default.createElement("span", { style: { fontWeight: 400, color: "var(--dsw-alias-label-secondary)", marginLeft: 6 } }, m.provider)),
        /* @__PURE__ */ import_react.default.createElement("span", { style: { color: "var(--dsw-alias-label-secondary)" } }, /* @__PURE__ */ import_react.default.createElement("strong", { style: { color: "#4f85ff" } }, formatNumber(m.totalTokens)), " (", m.percentage, "%) \xB7 ", m.turns, " requests")
      ), /* @__PURE__ */ import_react.default.createElement(
        "div",
        {
          style: {
            width: "100%",
            height: 6,
            background: "rgba(255, 255, 255, 0.06)",
            borderRadius: 3,
            overflow: "hidden"
          }
        },
        /* @__PURE__ */ import_react.default.createElement(
          "div",
          {
            style: {
              width: `${Math.max(1, m.percentage)}%`,
              height: "100%",
              background: "#336dfa",
              borderRadius: 3,
              transition: "width 0.3s ease"
            }
          }
        )
      ), /* @__PURE__ */ import_react.default.createElement(TypeLine, { counts: m }))))
    ),
    /* @__PURE__ */ import_react.default.createElement(
      "div",
      {
        style: {
          background: "var(--dsw-alias-bg-layer-2, #2c2c2c)",
          border: "1px solid var(--dsw-alias-border-l2, #494949)",
          borderRadius: 12,
          padding: "18px 20px",
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
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 16
          }
        },
        /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 13, fontWeight: 650, color: "var(--dsw-alias-label-primary, #ffffff)" } }, "Token Usage Trends"), /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 11, color: "var(--dsw-alias-label-tertiary, #a0a0a0)", marginTop: 2 } }, chartType === "all" ? "Daily tokens by type" : `Daily ${TOKEN_TYPES.find((t) => t.key === chartType)?.label.toLowerCase()} tokens`)),
        /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" } }, /* @__PURE__ */ import_react.default.createElement("div", { role: "group", "aria-label": "Chart token type", style: { display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", fontSize: 11 } }, [{ key: "all", label: "All", color: "" }, ...TOKEN_TYPES].map((t) => {
          const on = chartType === t.key;
          return /* @__PURE__ */ import_react.default.createElement(
            "button",
            {
              key: t.key,
              type: "button",
              "aria-pressed": on,
              onClick: () => setChartType(t.key),
              style: {
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "3px 8px",
                borderRadius: 6,
                border: `1px solid ${on ? "var(--dsw-alias-border-l2, #494949)" : "transparent"}`,
                background: on ? "var(--dsw-alias-bg-layer-1, #1e1e1e)" : "transparent",
                color: on ? "var(--dsw-alias-label-primary, #ffffff)" : "var(--dsw-alias-label-secondary, #b9b9b9)",
                fontSize: 11,
                cursor: "pointer"
              }
            },
            t.color && /* @__PURE__ */ import_react.default.createElement("span", { "aria-hidden": "true", style: { width: 8, height: 8, borderRadius: 2, background: t.color } }),
            t.label
          );
        })), /* @__PURE__ */ import_react.default.createElement(
          "div",
          {
            style: {
              display: "inline-flex",
              background: "var(--dsw-alias-bg-layer-1, #1e1e1e)",
              border: "1px solid var(--dsw-alias-border-l2, #494949)",
              borderRadius: 8,
              padding: 2
            }
          },
          [14, 30, 90].map((days) => /* @__PURE__ */ import_react.default.createElement(
            "button",
            {
              key: days,
              onClick: () => setChartRange(days),
              style: {
                border: 0,
                background: chartRange === days ? "var(--dsw-alias-bg-layer-2, #2c2c2c)" : "transparent",
                color: chartRange === days ? "#4f85ff" : "var(--dsw-alias-label-tertiary)",
                fontSize: 11,
                padding: "3px 8px",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: chartRange === days ? 600 : 400
              }
            },
            days,
            "D"
          ))
        ))
      ),
      /* @__PURE__ */ import_react.default.createElement("div", { style: { width: "100%", overflowX: "auto", WebkitOverflowScrolling: "touch" } }, /* @__PURE__ */ import_react.default.createElement("div", { style: { minWidth: "680px", width: "100%" } }, /* @__PURE__ */ import_react.default.createElement(
        "svg",
        {
          viewBox: "0 0 880 180",
          style: { width: "100%", height: "180px", display: "block", overflow: "visible" }
        },
        [1, 0.66, 0.33, 0].map((ratio, i) => {
          const y = 20 + (1 - ratio) * 125;
          const tokenVal = Math.round(maxChartTokens * ratio);
          return /* @__PURE__ */ import_react.default.createElement("g", { key: i }, /* @__PURE__ */ import_react.default.createElement(
            "line",
            {
              x1: 45,
              y1: y,
              x2: 870,
              y2: y,
              stroke: "var(--dsw-alias-border-l1, rgba(255,255,255,0.08))",
              strokeDasharray: "4 4"
            }
          ), /* @__PURE__ */ import_react.default.createElement(
            "text",
            {
              x: 40,
              y: y + 3,
              fontSize: 9,
              fill: "var(--dsw-alias-label-tertiary, #888888)",
              textAnchor: "end",
              fontFamily: "inherit"
            },
            formatNumber(tokenVal)
          ));
        }),
        chartData.map((d, idx) => {
          const totalBarWidth = 825 / chartData.length;
          const barWidth = Math.max(5, Math.min(22, totalBarWidth - 5));
          const x = 50 + idx * totalBarWidth + (totalBarWidth - barWidth) / 2;
          const totalH = d.value / maxChartTokens * 125;
          const yBase = 145;
          const shown = chartType === "all" ? TOKEN_TYPES : TOKEN_TYPES.filter((t) => t.key === chartType);
          let acc = 0;
          const segments = shown.map((t) => {
            const h = d.value > 0 ? d.stats[t.key] / d.value * totalH : 0;
            const seg = { key: t.key, color: t.color, y: yBase - acc - h, h };
            acc += h;
            return seg;
          }).filter((seg) => seg.h > 0);
          const isHovered = hoveredBar?.date === d.date;
          return /* @__PURE__ */ import_react.default.createElement(
            "g",
            {
              key: idx,
              style: { cursor: "pointer" },
              onMouseEnter: (e) => {
                setHoveredBar(d);
                const rect = e.currentTarget.getBoundingClientRect();
                setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 8 });
              },
              onMouseLeave: () => {
                setHoveredBar(null);
                setTooltipPos(null);
              },
              onClick: () => setSelectedDate(selectedDate === d.date ? null : d.date)
            },
            /* @__PURE__ */ import_react.default.createElement(
              "rect",
              {
                x: x - 2,
                y: 20,
                width: barWidth + 4,
                height: 125,
                fill: isHovered ? "rgba(79, 133, 255, 0.08)" : "transparent",
                rx: 3
              }
            ),
            d.value === 0 ? /* @__PURE__ */ import_react.default.createElement("rect", { x, y: yBase - 2, width: barWidth, height: 2, fill: "rgba(255, 255, 255, 0.08)", rx: 1 }) : /* @__PURE__ */ import_react.default.createElement("g", { style: { filter: isHovered ? "drop-shadow(0 0 5px rgba(79, 133, 255, 0.8))" : "none" } }, segments.map((seg, i) => /* @__PURE__ */ import_react.default.createElement(
              "rect",
              {
                key: seg.key,
                x,
                y: seg.y,
                width: barWidth,
                height: Math.max(seg.h, 0.5),
                fill: seg.color,
                rx: i === segments.length - 1 ? 2 : 0
              }
            ))),
            (chartRange === 14 || idx % (chartRange === 30 ? 3 : 7) === 0) && /* @__PURE__ */ import_react.default.createElement(
              "text",
              {
                x: x + barWidth / 2,
                y: 162,
                fontSize: 9,
                fill: "var(--dsw-alias-label-tertiary, #888888)",
                textAnchor: "middle",
                fontFamily: "inherit"
              },
              d.label
            )
          );
        })
      )))
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
      inspectedDayStats && inspectedDayStats.totalTokens > 0 && /* @__PURE__ */ import_react.default.createElement("div", { style: { marginBottom: 16 } }, /* @__PURE__ */ import_react.default.createElement(TokenBreakdown, { counts: inspectedDayStats, compact: true })),
      /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: "var(--dsw-alias-label-primary)", marginBottom: 10 } }, "Sessions Active on this Day (", (inspectedDayStats?.sessions || []).length, ")"), inspectedDayStats?.sessions && inspectedDayStats.sessions.length > 0 ? /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflowY: "auto" } }, inspectedDayStats.sessions.map((sess, idx) => /* @__PURE__ */ import_react.default.createElement(
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
        /* @__PURE__ */ import_react.default.createElement("div", { style: { minWidth: 0, flex: 1, paddingRight: 16 } }, /* @__PURE__ */ import_react.default.createElement("div", { style: { fontWeight: 600, fontSize: 13, color: "var(--dsw-alias-label-primary, #ffffff)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, sess.sessionTitle), /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 11, color: "var(--dsw-alias-label-tertiary, #a0a0a0)", marginTop: 2 } }, "Started ", new Date(sess.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), " \xB7 ID: ", sess.sessionId.slice(0, 10)), /* @__PURE__ */ import_react.default.createElement(TypeLine, { counts: sess })),
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
    ),
    hoveredBar && tooltipPos && /* @__PURE__ */ import_react.default.createElement(
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
      /* @__PURE__ */ import_react.default.createElement("div", { style: { fontWeight: 650, color: "var(--dsw-alias-label-primary, #ffffff)", marginBottom: 4 } }, (/* @__PURE__ */ new Date(hoveredBar.date + "T00:00:00")).toLocaleDateString(void 0, {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric"
      })),
      hoveredBar.stats.totalTokens === 0 ? /* @__PURE__ */ import_react.default.createElement("div", { style: { color: "var(--dsw-alias-label-tertiary)" } }, "No activity recorded") : /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("div", { style: { color: "#4f85ff", fontWeight: 600 } }, formatExact(hoveredBar.stats.totalTokens), " total tokens"), /* @__PURE__ */ import_react.default.createElement(TypeLine, { counts: hoveredBar.stats }), /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 10, color: "var(--dsw-alias-label-tertiary)", marginTop: 4 } }, hoveredBar.stats.turns, " turns \xB7 Click to inspect day"))
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
var name = "token-contribution-client";
var inject = ["slots"];
function apply(ctx) {
  if (ctx.slots && typeof ctx.slots.inject === "function") {
    ctx.slots.inject("settings.section", () => {
      return ctx.slots.register(
        {
          name: "settings.section",
          id: "token-contribution",
          order: 14,
          label: () => "Token Contribution",
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
        window.addEventListener("dsh:open-token-contribution", handleOpen);
        window.addEventListener("dsh:open-token-heatmap", handleOpen);
        window.addEventListener("keydown", (e) => {
          if (e.key === "Escape") handleClose();
        });
        return () => {
          window.removeEventListener("dsh:open-token-contribution", handleOpen);
          window.removeEventListener("dsh:open-token-heatmap", handleOpen);
        };
      }, []);
      return /* @__PURE__ */ import_react3.default.createElement(HeatmapModal, { open: isOpen, onClose: () => setIsOpen(false) });
    };
    if (!document.getElementById("dsh-token-heatmap-panel-resize")) {
      const resizeStyle = document.createElement("style");
      resizeStyle.id = "dsh-token-heatmap-panel-resize";
      resizeStyle.textContent = `
        /* Dynamically widen DSH Settings panel when Token Heatmap is active */
        .VOzbGW_panel:has([data-dsh-heatmap]),
        [class*="_panel"]:has([data-dsh-heatmap]) {
          width: min(1180px, calc(100vw - 32px)) !important;
          max-width: calc(100vw - 32px) !important;
          transition: width 0.25s cubic-bezier(0.16, 1, 0.3, 1), max-width 0.25s ease !important;
        }
        .tc-select:focus-visible {
          outline: 2px solid #4f85ff;
          outline-offset: 2px;
        }
      `;
      document.head.appendChild(resizeStyle);
    }
    const modalContainer = document.createElement("div");
    modalContainer.id = "token-contribution-modal-root";
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
      button.innerHTML = "<span>View Token Contribution \u2192</span>";
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
              (el) => (el.textContent?.trim() === "Token Contribution" || el.textContent?.trim() === "Token Heatmap") && (el.tagName === "BUTTON" || el.tagName === "DIV" || el.getAttribute("role") === "tab" || el.classList.contains("ant-list-item"))
            );
            if (heatmapTab) {
              heatmapTab.click();
            } else {
              window.dispatchEvent(new CustomEvent("dsh:open-token-contribution"));
            }
          }, 120);
        } else {
          window.dispatchEvent(new CustomEvent("dsh:open-token-contribution"));
        }
      };
      dialogContainer.appendChild(button);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
}
return module.exports; } });
//# sourceMappingURL=client.js.map
