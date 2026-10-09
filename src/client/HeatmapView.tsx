import React, { useEffect, useState, useMemo } from "react";

export interface DayStats {
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  turns: number;
  level?: number;
}

export interface SummaryStats {
  totalTokens: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheReadTokens: number;
  totalTurns: number;
  activeDays: number;
  currentStreak: number;
  longestStreak: number;
  peakDay: { date: string; tokens: number; turns: number } | null;
  dailyAverage: number;
}

export interface HeatmapResponse {
  summary: SummaryStats;
  days: Record<string, DayStats>;
  startDate: string;
  endDate: string;
}

function formatNumber(num: number): string {
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + "B";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "k";
  return num.toLocaleString();
}

function formatExact(num: number): string {
  return num.toLocaleString();
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

// Themes: Green (GitHub classic) and DeepSeek Blue/Indigo
const COLOR_THEMES = {
  green: {
    name: "GitHub Emerald",
    levels: [
      "var(--dsw-alias-interactive-bg-hover, rgba(128, 128, 128, 0.08))",
      "#0e4429",
      "#006d32",
      "#26a641",
      "#39d353",
    ],
  },
  deepseek: {
    name: "DeepSeek Indigo",
    levels: [
      "var(--dsw-alias-interactive-bg-hover, rgba(128, 128, 128, 0.08))",
      "#1e1e4a",
      "#2e3188",
      "#434fc7",
      "#6366f1",
    ],
  },
};

export function HeatmapView() {
  const [data, setData] = useState<HeatmapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [themeKey, setThemeKey] = useState<"green" | "deepseek">("green");
  const [hoveredDay, setHoveredDay] = useState<{ date: string; stats: DayStats } | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const fetchStats = () => {
    setLoading(true);
    fetch("/api/dsh-token-heatmap/stats")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP error ${r.status}`);
        return r.json();
      })
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Compute 52-week calendar grid: 7 rows x 53 columns
  const calendarGrid = useMemo(() => {
    if (!data) return null;

    const weeks: Array<Array<{ date: string; stats: DayStats } | null>> = [];
    const now = new Date();
    // End on current week Saturday
    const end = new Date(now);
    // Start 52 weeks back on Sunday
    const start = new Date(now);
    start.setDate(start.getDate() - 364);
    // Align start to nearest previous Sunday
    start.setDate(start.getDate() - start.getDay());

    let current = new Date(start);
    let currentWeek: Array<{ date: string; stats: DayStats } | null> = [];

    while (current <= end || currentWeek.length > 0) {
      const dateKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
      const dayStats = data.days[dateKey] || {
        totalTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        turns: 0,
        level: 0,
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
  }, [data]);

  // Compute month headers
  const monthHeaders = useMemo(() => {
    if (!calendarGrid) return [];
    const headers: Array<{ label: string; col: number }> = [];
    let lastMonth = -1;

    calendarGrid.forEach((week, colIdx) => {
      const firstValidDay = week.find((d) => d !== null);
      if (firstValidDay) {
        const d = new Date(firstValidDay.date + "T00:00:00");
        const month = d.getMonth();
        if (month !== lastMonth) {
          headers.push({ label: MONTH_NAMES[month], col: colIdx });
          lastMonth = month;
        }
      }
    });

    return headers;
  }, [calendarGrid]);

  const activeTheme = COLOR_THEMES[themeKey];

  if (loading && !data) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--dsw-alias-label-secondary)" }}>
        Loading token usage heatmap...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "20px", color: "var(--dsw-alias-state-error-primary, #ef4444)" }}>
        Failed to load heatmap: {error}
        <button
          onClick={fetchStats}
          style={{
            marginLeft: 12,
            padding: "4px 10px",
            background: "var(--dsw-alias-bg-layer-2)",
            border: "1px solid var(--dsw-alias-border-l2)",
            color: "var(--dsw-alias-label-primary)",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { summary } = data;
  const cacheHitPercent =
    summary.totalTokens > 0
      ? Math.round((summary.totalCacheReadTokens / summary.totalTokens) * 100)
      : 0;

  return (
    <div
      style={{
        boxSizing: "border-box",
        width: "100%",
        maxWidth: "960px",
        margin: "0 auto",
        padding: "16px 0 40px",
        fontFamily: "inherit",
        color: "var(--dsw-alias-label-primary, #eeeeee)",
      }}
    >
      {/* Title Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 650,
              letterSpacing: "-0.02em",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            Token Usage Activity
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                padding: "2px 8px",
                borderRadius: 12,
                background: "var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,0.15))",
                color: "var(--dsw-alias-label-secondary)",
              }}
            >
              Last 12 Months
            </span>
          </h2>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 13,
              color: "var(--dsw-alias-label-tertiary, #a0a0a0)",
            }}
          >
            Daily token volume and request step intensity across all sessions
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Theme Switcher */}
          <div
            style={{
              display: "inline-flex",
              background: "var(--dsw-alias-bg-layer-2, #2c2c2c)",
              border: "1px solid var(--dsw-alias-border-l2, #494949)",
              borderRadius: 8,
              padding: 2,
            }}
          >
            <button
              onClick={() => setThemeKey("green")}
              style={{
                border: 0,
                background: themeKey === "green" ? "var(--dsw-alias-bg-layer-1, #1e1e1e)" : "transparent",
                color: themeKey === "green" ? "var(--dsw-alias-label-primary)" : "var(--dsw-alias-label-tertiary)",
                fontSize: 12,
                padding: "4px 10px",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: themeKey === "green" ? 600 : 400,
              }}
            >
              Emerald
            </button>
            <button
              onClick={() => setThemeKey("deepseek")}
              style={{
                border: 0,
                background: themeKey === "deepseek" ? "var(--dsw-alias-bg-layer-1, #1e1e1e)" : "transparent",
                color: themeKey === "deepseek" ? "var(--dsw-alias-label-primary)" : "var(--dsw-alias-label-tertiary)",
                fontSize: 12,
                padding: "4px 10px",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: themeKey === "deepseek" ? 600 : 400,
              }}
            >
              Indigo
            </button>
          </div>

          <button
            onClick={fetchStats}
            title="Refresh statistics"
            style={{
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
              cursor: "pointer",
            }}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {/* Card 1: Total Tokens */}
        <div
          style={{
            background: "var(--dsw-alias-bg-layer-2, #2c2c2c)",
            border: "1px solid var(--dsw-alias-border-l2, #494949)",
            borderRadius: 10,
            padding: "14px 16px",
          }}
        >
          <div style={{ fontSize: 11, color: "var(--dsw-alias-label-tertiary, #a0a0a0)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
            Total Tokens
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, margin: "6px 0 2px", color: "var(--dsw-alias-label-primary, #ffffff)" }}>
            {formatNumber(summary.totalTokens)}
          </div>
          <div style={{ fontSize: 11, color: "var(--dsw-alias-label-secondary, #b9b9b9)" }}>
            {formatExact(summary.totalTokens)} total
          </div>
        </div>

        {/* Card 2: Cache Efficiency */}
        <div
          style={{
            background: "var(--dsw-alias-bg-layer-2, #2c2c2c)",
            border: "1px solid var(--dsw-alias-border-l2, #494949)",
            borderRadius: 10,
            padding: "14px 16px",
          }}
        >
          <div style={{ fontSize: 11, color: "var(--dsw-alias-label-tertiary, #a0a0a0)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
            Cache Hit Ratio
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, margin: "6px 0 2px", color: "#10b981" }}>
            {cacheHitPercent}%
          </div>
          <div style={{ fontSize: 11, color: "var(--dsw-alias-label-secondary, #b9b9b9)" }}>
            {formatNumber(summary.totalCacheReadTokens)} cached reads
          </div>
        </div>

        {/* Card 3: Daily Average */}
        <div
          style={{
            background: "var(--dsw-alias-bg-layer-2, #2c2c2c)",
            border: "1px solid var(--dsw-alias-border-l2, #494949)",
            borderRadius: 10,
            padding: "14px 16px",
          }}
        >
          <div style={{ fontSize: 11, color: "var(--dsw-alias-label-tertiary, #a0a0a0)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
            Daily Average
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, margin: "6px 0 2px", color: "var(--dsw-alias-label-primary, #ffffff)" }}>
            {formatNumber(summary.dailyAverage)}
          </div>
          <div style={{ fontSize: 11, color: "var(--dsw-alias-label-secondary, #b9b9b9)" }}>
            Across {summary.activeDays} active days
          </div>
        </div>

        {/* Card 4: Streaks */}
        <div
          style={{
            background: "var(--dsw-alias-bg-layer-2, #2c2c2c)",
            border: "1px solid var(--dsw-alias-border-l2, #494949)",
            borderRadius: 10,
            padding: "14px 16px",
          }}
        >
          <div style={{ fontSize: 11, color: "var(--dsw-alias-label-tertiary, #a0a0a0)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
            Active Streak
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, margin: "6px 0 2px", color: "var(--dsw-alias-label-primary, #ffffff)" }}>
            {summary.currentStreak} {summary.currentStreak === 1 ? "day" : "days"}
          </div>
          <div style={{ fontSize: 11, color: "var(--dsw-alias-label-secondary, #b9b9b9)" }}>
            Longest streak: {summary.longestStreak} days
          </div>
        </div>
      </div>

      {/* Heatmap Card */}
      <div
        style={{
          background: "var(--dsw-alias-bg-layer-2, #2c2c2c)",
          border: "1px solid var(--dsw-alias-border-l2, #494949)",
          borderRadius: 12,
          padding: "20px 22px",
          position: "relative",
          overflowX: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <span>Contribution Calendar</span>
          {summary.peakDay && (
            <span style={{ fontSize: 12, fontWeight: 400, color: "var(--dsw-alias-label-secondary)" }}>
              Peak day: <strong style={{ color: "var(--dsw-alias-label-primary)" }}>{summary.peakDay.date}</strong> ({formatNumber(summary.peakDay.tokens)} tokens)
            </span>
          )}
        </div>

        {/* SVG Heatmap */}
        {calendarGrid && (
          <div style={{ display: "inline-block", minWidth: 780 }}>
            {/* Month labels */}
            <div style={{ display: "flex", marginLeft: 32, marginBottom: 4, height: 16 }}>
              {monthHeaders.map((m, i) => (
                <div
                  key={i}
                  style={{
                    position: "relative",
                    left: m.col * 14,
                    width: 0,
                    whiteSpace: "nowrap",
                    fontSize: 10,
                    color: "var(--dsw-alias-label-tertiary, #a0a0a0)",
                  }}
                >
                  {m.label}
                </div>
              ))}
            </div>

            {/* Grid with day labels */}
            <div style={{ display: "flex", gap: 6 }}>
              {/* Day of week labels */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                  width: 26,
                  fontSize: 9,
                  color: "var(--dsw-alias-label-tertiary, #a0a0a0)",
                  textAlign: "right",
                  paddingTop: 1,
                }}
              >
                {DAY_LABELS.map((lbl, idx) => (
                  <div key={idx} style={{ height: 11, lineHeight: "11px" }}>
                    {lbl}
                  </div>
                ))}
              </div>

              {/* Columns of weeks */}
              <div style={{ display: "flex", gap: 3 }}>
                {calendarGrid.map((week, colIdx) => (
                  <div key={colIdx} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    {week.map((day, rowIdx) => {
                      if (!day) {
                        return <div key={rowIdx} style={{ width: 11, height: 11 }} />;
                      }
                      const lvl = day.stats.level || 0;
                      const bg = activeTheme.levels[lvl];

                      return (
                        <div
                          key={rowIdx}
                          onMouseEnter={(e) => {
                            setHoveredDay({ date: day.date, stats: day.stats });
                            const rect = e.currentTarget.getBoundingClientRect();
                            setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 8 });
                          }}
                          onMouseLeave={() => {
                            setHoveredDay(null);
                            setTooltipPos(null);
                          }}
                          style={{
                            width: 11,
                            height: 11,
                            borderRadius: 2,
                            backgroundColor: bg,
                            border:
                              lvl === 0
                                ? "1px solid var(--dsw-alias-border-l1, rgba(255,255,255,0.06))"
                                : "1px solid transparent",
                            cursor: "pointer",
                            transition: "transform 0.1s ease, filter 0.1s ease",
                          }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend & Footnote */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 6,
                marginTop: 14,
                fontSize: 11,
                color: "var(--dsw-alias-label-tertiary, #a0a0a0)",
              }}
            >
              <span>Less</span>
              {activeTheme.levels.map((c, i) => (
                <div
                  key={i}
                  style={{
                    width: 11,
                    height: 11,
                    borderRadius: 2,
                    backgroundColor: c,
                    border: i === 0 ? "1px solid var(--dsw-alias-border-l1)" : "none",
                  }}
                />
              ))}
              <span>More</span>
            </div>
          </div>
        )}
      </div>

      {/* Floating Hover Tooltip */}
      {hoveredDay && tooltipPos && (
        <div
          style={{
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
            whiteSpace: "nowrap",
          }}
        >
          <div style={{ fontWeight: 650, color: "var(--dsw-alias-label-primary, #ffffff)", marginBottom: 4 }}>
            {new Date(hoveredDay.date + "T00:00:00").toLocaleDateString(undefined, {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </div>
          {hoveredDay.stats.totalTokens === 0 ? (
            <div style={{ color: "var(--dsw-alias-label-tertiary)" }}>No activity recorded</div>
          ) : (
            <div>
              <div style={{ color: "#34d399", fontWeight: 600 }}>
                {formatExact(hoveredDay.stats.totalTokens)} tokens
              </div>
              <div style={{ fontSize: 11, color: "var(--dsw-alias-label-secondary)", marginTop: 2 }}>
                {hoveredDay.stats.turns} requests / steps
              </div>
              <div style={{ fontSize: 10, color: "var(--dsw-alias-label-tertiary)", marginTop: 4 }}>
                Billed: {formatNumber(hoveredDay.stats.inputTokens + hoveredDay.stats.outputTokens)} · Cache: {formatNumber(hoveredDay.stats.cacheReadTokens)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
