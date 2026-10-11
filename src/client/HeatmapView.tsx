import React, { useEffect, useState, useMemo, useRef } from "react";

export interface DaySessionDetail {
  sessionId: string;
  sessionTitle: string;
  createdAt: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  turns: number;
}

export interface DayStats {
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  turns: number;
  level?: number;
  sessions?: DaySessionDetail[];
}

export interface ModelUsage {
  model: string;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  turns: number;
  percentage: number;
}

export interface SessionSummary {
  id: string;
  title: string;
  createdAt: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  turns: number;
  days: Record<string, DayStats>;
  models?: Record<string, { totalTokens: number; inputTokens: number; outputTokens: number; cacheReadTokens: number; turns: number }>;
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
  sessions: SessionSummary[];
  models?: ModelUsage[];
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
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Simple monochromatic gradient: Black -> Vibrant DeepSeek Blue
const DEEPSEEK_LEVELS = [
  "#0f1117", // Level 0: Black / dark void tile
  "#152c6f", // Level 1: Dark deep blue
  "#1f4cdb", // Level 2: Medium vibrant blue
  "#336dfa", // Level 3: Vibrant DeepSeek brand blue
  "#4f85ff", // Level 4: Bright electric DeepSeek blue
];

// Clean depth for tiles (subtle glow on peak tiles only)
const TILE_SHADOWS = [
  "none",
  "none",
  "none",
  "0 0 3px rgba(51, 109, 250, 0.35)",
  "0 0 6px rgba(79, 133, 255, 0.65)",
];

function HeatmapInnerView() {
  const [data, setData] = useState<HeatmapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [chartRange, setChartRange] = useState<14 | 30 | 90>(30);
  const [hoveredDay, setHoveredDay] = useState<{ date: string; stats: DayStats } | null>(null);
  const [hoveredBar, setHoveredBar] = useState<{
    date: string;
    label: string;
    totalTokens: number;
    billedTokens: number;
    cachedTokens: number;
    turns: number;
  } | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Dynamically enlarge the DSH Settings dialog panel so the calendar fits perfectly without a scrollbar
  useEffect(() => {
    if (typeof document === "undefined") return;
    const findPanel = () => {
      return (
        rootRef.current?.closest('[class*="_panel"]') ||
        document.querySelector('.VOzbGW_panel') ||
        document.querySelector('[class*="_panel"]')
      ) as HTMLElement | null;
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

  const fetchStats = () => {
    setLoading(true);
    fetch("/api/token-contribution/stats")
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

  // Compute active days & stats based on session filter
  const activeView = useMemo(() => {
    if (!data) return null;

    if (selectedSessionId === "all") {
      return {
        summary: data.summary,
        days: data.days,
        models: data.models || [],
        sessionTitle: "All Sessions (Global)",
      };
    }

    const session = (data.sessions || []).find((s) => s.id === selectedSessionId);
    if (!session) {
      return {
        summary: data.summary,
        days: data.days,
        models: data.models || [],
        sessionTitle: "All Sessions (Global)",
      };
    }

    let totalTokens = session.totalTokens;
    let totalInputTokens = session.inputTokens;
    let totalOutputTokens = session.outputTokens;
    let totalCacheReadTokens = session.cacheReadTokens;
    let totalTurns = session.turns;
    let activeDays = Object.values(session.days).filter((d) => d.totalTokens > 0).length;
    let dailyAverage = activeDays > 0 ? Math.round(totalTokens / activeDays) : 0;
    let peakDay: { date: string; tokens: number; turns: number } | null = null;

    for (const [date, stats] of Object.entries(session.days)) {
      if (!peakDay || stats.totalTokens > peakDay.tokens) {
        peakDay = { date, tokens: stats.totalTokens, turns: stats.turns };
      }
    }

    const positiveValues = Object.values(session.days)
      .map((d) => d.totalTokens)
      .filter((t) => t > 0)
      .sort((a, b) => a - b);

    let q1 = 1_000_000;
    let q2 = 5_000_000;
    let q3 = 15_000_000;

    if (positiveValues.length >= 4) {
      q1 = positiveValues[Math.floor(positiveValues.length * 0.25)];
      q2 = positiveValues[Math.floor(positiveValues.length * 0.50)];
      q3 = positiveValues[Math.floor(positiveValues.length * 0.75)];
    }

    const leveledDays: Record<string, DayStats> = {};
    for (const [date, stats] of Object.entries(session.days)) {
      let lvl = 0;
      if (stats.totalTokens === 0) lvl = 0;
      else if (stats.totalTokens <= q1) lvl = 1;
      else if (stats.totalTokens <= q2) lvl = 2;
      else if (stats.totalTokens <= q3) lvl = 3;
      else lvl = 4;
      leveledDays[date] = { ...stats, level: lvl };
    }

    // Models for this session
    const sessionModels: ModelUsage[] = session.models
      ? Object.entries(session.models)
          .map(([model, m]) => ({
            model,
            totalTokens: m.totalTokens,
            inputTokens: m.inputTokens,
            outputTokens: m.outputTokens,
            cacheReadTokens: m.cacheReadTokens,
            turns: m.turns,
            percentage: totalTokens > 0 ? Math.round((m.totalTokens / totalTokens) * 1000) / 10 : 0,
          }))
          .sort((a, b) => b.totalTokens - a.totalTokens)
      : [];

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
        dailyAverage,
      },
      days: leveledDays,
      models: sessionModels,
      sessionTitle: session.title,
    };
  }, [data, selectedSessionId]);

  // Compute 52-week calendar grid: 7 rows x 53 columns
  const calendarGrid = useMemo(() => {
    if (!activeView) return null;

    const weeks: Array<Array<{ date: string; stats: DayStats } | null>> = [];
    const now = new Date();
    const end = new Date(now);
    const start = new Date(now);
    start.setDate(start.getDate() - 364);
    start.setDate(start.getDate() - start.getDay());

    let current = new Date(start);
    let currentWeek: Array<{ date: string; stats: DayStats } | null> = [];

    while (current <= end || currentWeek.length > 0) {
      const dateKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
      const dayStats = activeView.days[dateKey] || {
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
  }, [activeView]);

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

  // Daily token timeline chart data for the selected range (14, 30, or 90 days)
  const chartData = useMemo(() => {
    if (!activeView) return [];
    const now = new Date();
    const items: Array<{
      date: string;
      label: string;
      totalTokens: number;
      billedTokens: number;
      cachedTokens: number;
      turns: number;
    }> = [];

    for (let i = chartRange - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const stats = activeView.days[dateKey] || {
        totalTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        turns: 0,
      };
      items.push({
        date: dateKey,
        label: `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`,
        totalTokens: stats.totalTokens,
        billedTokens: stats.inputTokens + stats.outputTokens,
        cachedTokens: stats.cacheReadTokens,
        turns: stats.turns,
      });
    }
    return items;
  }, [activeView, chartRange]);

  const maxChartTokens = useMemo(() => {
    return Math.max(...chartData.map((d) => d.totalTokens), 1_000_000);
  }, [chartData]);

  if (loading && !data) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--dsw-alias-label-secondary)" }}>
        Loading token usage statistics...
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

  if (!data || !activeView) return null;

  const { summary } = activeView;
  const cacheHitPercent =
    summary.totalTokens > 0
      ? Math.round((summary.totalCacheReadTokens / summary.totalTokens) * 100)
      : 0;

  const inspectedDayStats = selectedDate ? activeView.days[selectedDate] : null;

  return (
    <div
      data-dsh-heatmap="true"
      ref={rootRef}
      style={{
        boxSizing: "border-box",
        width: "100%",
        maxWidth: "1020px",
        margin: "0 auto",
        padding: "8px 0 40px",
        fontFamily: "inherit",
        color: "var(--dsw-alias-label-primary, #eeeeee)",
      }}
    >
      {/* Top Header & Filter Controls (OpenCode / Codex style) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 14,
          marginBottom: 16,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 20,
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
                fontSize: 11,
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: 12,
                background: "rgba(51, 109, 250, 0.12)",
                color: "#4f85ff",
                border: "1px solid rgba(51, 109, 250, 0.35)",
              }}
            >
              52 Weeks
            </span>
          </h2>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 12,
              color: "var(--dsw-alias-label-tertiary, #a0a0a0)",
            }}
          >
            Daily token throughput and model breakdown across sessions
          </p>
        </div>

        {/* Right side controls: Session selector & Refresh */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Session Filter Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, color: "var(--dsw-alias-label-tertiary)" }}>Session:</span>
            <select
              value={selectedSessionId}
              onChange={(e) => {
                setSelectedSessionId(e.target.value);
                setSelectedDate(null);
              }}
              style={{
                background: "var(--dsw-alias-bg-layer-2, #2c2c2c)",
                border: "1px solid var(--dsw-alias-border-l2, #494949)",
                color: "var(--dsw-alias-label-primary, #eeeeee)",
                borderRadius: 8,
                padding: "6px 12px",
                fontSize: 12,
                outline: "none",
                cursor: "pointer",
                maxWidth: 240,
              }}
            >
              <option value="all">All Sessions ({(data.sessions || []).length} total)</option>
              {(data.sessions || []).map((s) => (
                <option key={s.id} value={s.id}>
                  {new Date(s.createdAt).toLocaleDateString()} · {s.title.slice(0, 32)}
                </option>
              ))}
            </select>
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

      {/* Prominent Centered Total Token Usage Hero (Centered above the chart) */}
      <div
        style={{
          textAlign: "center",
          margin: "12px 0 20px",
          padding: "16px 20px",
          background: "var(--dsw-alias-bg-layer-2, #2c2c2c)",
          border: "1px solid var(--dsw-alias-border-l2, #494949)",
          borderRadius: 12,
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
        }}
      >
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--dsw-alias-label-tertiary, #a0a0a0)", fontWeight: 600 }}>
          Total Tokens Processed
        </div>
        <div style={{ fontSize: 36, fontWeight: 800, margin: "6px 0 2px", color: "#4f85ff", letterSpacing: "-0.03em" }}>
          {formatExact(summary.totalTokens)}
        </div>
        <div style={{ fontSize: 13, color: "var(--dsw-alias-label-secondary, #b9b9b9)" }}>
          <strong>{formatNumber(summary.totalTokens)}</strong> tokens across {summary.activeDays} active days ({summary.totalTurns} total requests)
        </div>
      </div>

      {/* Contribution Calendar Card (Centered and scaled to fit without horizontal scrollbars) */}
      <div
        style={{
          background: "var(--dsw-alias-bg-layer-2, #2c2c2c)",
          border: "1px solid var(--dsw-alias-border-l2, #494949)",
          borderRadius: 12,
          padding: "18px 20px",
          position: "relative",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
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

        {/* Clean, centered SVG Calendar Grid (Fits 1180px panel with zero scrollbars) */}
        {calendarGrid && (
          <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <svg
              viewBox="0 0 880 136"
              style={{
                width: "100%",
                maxWidth: "880px",
                height: "auto",
                display: "block",
                overflow: "visible",
              }}
            >
              {/* Month labels */}
              {monthHeaders.map((m, i) => (
                <text
                  key={i}
                  x={32 + m.col * 15.6}
                  y={11}
                  fontSize={11}
                  fill="var(--dsw-alias-label-tertiary, #888888)"
                  fontFamily="inherit"
                >
                  {m.label}
                </text>
              ))}

              {/* Day of week labels */}
              <text x={2} y={45} fontSize={10} fill="var(--dsw-alias-label-tertiary, #888888)" fontFamily="inherit">
                Mon
              </text>
              <text x={2} y={76} fontSize={10} fill="var(--dsw-alias-label-tertiary, #888888)" fontFamily="inherit">
                Wed
              </text>
              <text x={2} y={107} fontSize={10} fill="var(--dsw-alias-label-tertiary, #888888)" fontFamily="inherit">
                Fri
              </text>

              {/* Day Tiles: comfortable 12px with 15.6px step */}
              {calendarGrid.map((week, colIdx) => (
                <g key={colIdx} transform={`translate(${32 + colIdx * 15.6}, 18)`}>
                  {week.map((day, rowIdx) => {
                    if (!day) return null;

                    const lvl = day.stats.level || 0;
                    const bg = DEEPSEEK_LEVELS[lvl];
                    const isSelected = selectedDate === day.date;
                    const isHovered = hoveredDay?.date === day.date;

                    // GitHub-style glow & outline
                    const strokeColor = isSelected
                      ? "#ffffff"
                      : isHovered
                      ? "#5686fe"
                      : lvl === 0
                      ? "rgba(255, 255, 255, 0.06)"
                      : "transparent";

                    const strokeWidth = isSelected ? 1.8 : isHovered ? 1.4 : 1;

                    return (
                      <rect
                        key={rowIdx}
                        x={0}
                        y={rowIdx * 15.6}
                        width={12}
                        height={12}
                        rx={2.5}
                        ry={2.5}
                        fill={bg}
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        style={{
                          cursor: "pointer",
                          transition: "fill 0.12s ease, stroke 0.12s ease",
                          filter: isSelected
                            ? "drop-shadow(0 0 6px rgba(86, 134, 254, 0.9))"
                            : isHovered
                            ? "drop-shadow(0 0 4px rgba(86, 134, 254, 0.7))"
                            : lvl === 4
                            ? "drop-shadow(0 0 3px rgba(79, 133, 255, 0.5))"
                            : "none",
                        }}
                        onClick={() => {
                          setSelectedDate(isSelected ? null : day.date);
                        }}
                        onMouseEnter={(e) => {
                          setHoveredDay({ date: day.date, stats: day.stats });
                          const rect = e.currentTarget.getBoundingClientRect();
                          setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 8 });
                        }}
                        onMouseLeave={() => {
                          setHoveredDay(null);
                          setTooltipPos(null);
                        }}
                      />
                    );
                  })}
                </g>
              ))}
            </svg>

            {/* Bottom Legend */}
            <div
              style={{
                width: "100%",
                maxWidth: "880px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 12,
                fontSize: 11,
                color: "var(--dsw-alias-label-tertiary, #a0a0a0)",
              }}
            >
              <span style={{ fontSize: 11 }}>
                Tip: Click any day to inspect sessions and token breakdown
              </span>

              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span>Less</span>
                {DEEPSEEK_LEVELS.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 2.5,
                      backgroundColor: c,
                      border: i === 0 ? "1px solid rgba(255, 255, 255, 0.06)" : "none",
                      filter: i === 4 ? "drop-shadow(0 0 3px rgba(79, 133, 255, 0.5))" : "none",
                    }}
                  />
                ))}
                <span>More</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Secondary Metrics Grid (Under the chart, cache color cleared to neutral) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginTop: 18,
          marginBottom: 18,
        }}
      >
        {/* Card 1: Cache Hit Ratio (CLEARED BLUE COLOR -> Neutral/Clean White) */}
        <div
          style={{
            background: "var(--dsw-alias-bg-layer-2, #2c2c2c)",
            border: "1px solid var(--dsw-alias-border-l2, #494949)",
            borderRadius: 10,
            padding: "14px 16px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
          }}
        >
          <div style={{ fontSize: 11, color: "var(--dsw-alias-label-tertiary, #a0a0a0)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
            Cache Hit Ratio
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, margin: "6px 0 2px", color: "var(--dsw-alias-label-primary, #ffffff)" }}>
            {cacheHitPercent}%
          </div>
          <div style={{ fontSize: 11, color: "var(--dsw-alias-label-secondary, #b9b9b9)" }}>
            {formatNumber(summary.totalCacheReadTokens)} cached reads
          </div>
        </div>

        {/* Card 2: Daily Average / Turns */}
        <div
          style={{
            background: "var(--dsw-alias-bg-layer-2, #2c2c2c)",
            border: "1px solid var(--dsw-alias-border-l2, #494949)",
            borderRadius: 10,
            padding: "14px 16px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
          }}
        >
          <div style={{ fontSize: 11, color: "var(--dsw-alias-label-tertiary, #a0a0a0)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
            {selectedSessionId === "all" ? "Daily Average" : "Total Steps"}
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, margin: "6px 0 2px", color: "var(--dsw-alias-label-primary, #ffffff)" }}>
            {selectedSessionId === "all" ? formatNumber(summary.dailyAverage) : summary.totalTurns}
          </div>
          <div style={{ fontSize: 11, color: "var(--dsw-alias-label-secondary, #b9b9b9)" }}>
            {selectedSessionId === "all" ? `Across ${summary.activeDays} active days` : `${formatNumber(summary.totalInputTokens + summary.totalOutputTokens)} billed`}
          </div>
        </div>

        {/* Card 3: Streak / Activity */}
        <div
          style={{
            background: "var(--dsw-alias-bg-layer-2, #2c2c2c)",
            border: "1px solid var(--dsw-alias-border-l2, #494949)",
            borderRadius: 10,
            padding: "14px 16px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
          }}
        >
          <div style={{ fontSize: 11, color: "var(--dsw-alias-label-tertiary, #a0a0a0)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
            {selectedSessionId === "all" ? "Active Streak" : "Active Days"}
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, margin: "6px 0 2px", color: "var(--dsw-alias-label-primary, #ffffff)" }}>
            {selectedSessionId === "all" ? `${summary.currentStreak} days` : `${summary.activeDays} days`}
          </div>
          <div style={{ fontSize: 11, color: "var(--dsw-alias-label-secondary, #b9b9b9)" }}>
            {selectedSessionId === "all" ? `Longest streak: ${summary.longestStreak} days` : `Session: ${activeView.sessionTitle.slice(0, 24)}`}
          </div>
        </div>

        {/* Card 4: Peak Day */}
        <div
          style={{
            background: "var(--dsw-alias-bg-layer-2, #2c2c2c)",
            border: "1px solid var(--dsw-alias-border-l2, #494949)",
            borderRadius: 10,
            padding: "14px 16px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
          }}
        >
          <div style={{ fontSize: 11, color: "var(--dsw-alias-label-tertiary, #a0a0a0)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
            Peak Volume Day
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, margin: "6px 0 2px", color: "var(--dsw-alias-label-primary, #ffffff)" }}>
            {summary.peakDay ? formatNumber(summary.peakDay.tokens) : "None"}
          </div>
          <div style={{ fontSize: 11, color: "var(--dsw-alias-label-secondary, #b9b9b9)" }}>
            {summary.peakDay ? summary.peakDay.date : "No activity"}
          </div>
        </div>
      </div>

      {/* Top Models Breakdown Section */}
      {activeView.models && activeView.models.length > 0 && (
        <div
          style={{
            background: "var(--dsw-alias-bg-layer-2, #2c2c2c)",
            border: "1px solid var(--dsw-alias-border-l2, #494949)",
            borderRadius: 12,
            padding: "18px 20px",
            marginBottom: 18,
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 650, color: "var(--dsw-alias-label-primary, #ffffff)" }}>
              Model Usage Breakdown
            </div>
            <div style={{ fontSize: 11, color: "var(--dsw-alias-label-tertiary, #a0a0a0)" }}>
              {activeView.models.length} model{activeView.models.length === 1 ? "" : "s"} tracked
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {activeView.models.map((m) => (
              <div key={m.model}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                    marginBottom: 5,
                  }}
                >
                  <span style={{ fontWeight: 600, color: "var(--dsw-alias-label-primary)" }}>
                    {m.model}
                  </span>
                  <span style={{ color: "var(--dsw-alias-label-secondary)" }}>
                    <strong style={{ color: "#4f85ff" }}>{formatNumber(m.totalTokens)}</strong> ({m.percentage}%) · {m.turns} requests
                  </span>
                </div>
                <div
                  style={{
                    width: "100%",
                    height: 6,
                    background: "rgba(255, 255, 255, 0.06)",
                    borderRadius: 3,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.max(1, m.percentage)}%`,
                      height: "100%",
                      background: "#336dfa",
                      borderRadius: 3,
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Token Usage Trends Graph Card */}
      <div
        style={{
          background: "var(--dsw-alias-bg-layer-2, #2c2c2c)",
          border: "1px solid var(--dsw-alias-border-l2, #494949)",
          borderRadius: 12,
          padding: "18px 20px",
          position: "relative",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 650, color: "var(--dsw-alias-label-primary, #ffffff)" }}>
              Token Usage Trends
            </div>
            <div style={{ fontSize: 11, color: "var(--dsw-alias-label-tertiary, #a0a0a0)", marginTop: 2 }}>
              Daily billed vs cached token volume over time
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            {/* Legend: Billed vs Cached */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11, color: "var(--dsw-alias-label-secondary)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: "#4f85ff" }} />
                <span>Billed Tokens</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: "#253b82" }} />
                <span>Cache Reads</span>
              </div>
            </div>

            {/* Range Toggle: 14D | 30D | 90D */}
            <div
              style={{
                display: "inline-flex",
                background: "var(--dsw-alias-bg-layer-1, #1e1e1e)",
                border: "1px solid var(--dsw-alias-border-l2, #494949)",
                borderRadius: 8,
                padding: 2,
              }}
            >
              {[14, 30, 90].map((days) => (
                <button
                  key={days}
                  onClick={() => setChartRange(days as any)}
                  style={{
                    border: 0,
                    background: chartRange === days ? "var(--dsw-alias-bg-layer-2, #2c2c2c)" : "transparent",
                    color: chartRange === days ? "#4f85ff" : "var(--dsw-alias-label-tertiary)",
                    fontSize: 11,
                    padding: "3px 8px",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontWeight: chartRange === days ? 600 : 400,
                  }}
                >
                  {days}D
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* The SVG Timeline Bar Chart */}
        <div style={{ width: "100%", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <div style={{ minWidth: "680px", width: "100%" }}>
            <svg
              viewBox="0 0 880 180"
              style={{ width: "100%", height: "180px", display: "block", overflow: "visible" }}
            >
              {/* Horizontal grid lines & Y labels */}
              {[1, 0.66, 0.33, 0].map((ratio, i) => {
                const y = 20 + (1 - ratio) * 125;
                const tokenVal = Math.round(maxChartTokens * ratio);
                return (
                  <g key={i}>
                    <line
                      x1={45}
                      y1={y}
                      x2={870}
                      y2={y}
                      stroke="var(--dsw-alias-border-l1, rgba(255,255,255,0.08))"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={40}
                      y={y + 3}
                      fontSize={9}
                      fill="var(--dsw-alias-label-tertiary, #888888)"
                      textAnchor="end"
                      fontFamily="inherit"
                    >
                      {formatNumber(tokenVal)}
                    </text>
                  </g>
                );
              })}

              {/* Bars for each day in chartData */}
              {chartData.map((d, idx) => {
                const totalBarWidth = 825 / chartData.length;
                const barWidth = Math.max(5, Math.min(22, totalBarWidth - 5));
                const x = 50 + idx * totalBarWidth + (totalBarWidth - barWidth) / 2;

                const totalH = (d.totalTokens / maxChartTokens) * 125;
                const cachedH = d.totalTokens > 0 ? (d.cachedTokens / d.totalTokens) * totalH : 0;
                const billedH = totalH - cachedH;
                const yBase = 145;

                const isHovered = hoveredBar?.date === d.date;

                return (
                  <g
                    key={idx}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={(e) => {
                      setHoveredBar(d);
                      const rect = e.currentTarget.getBoundingClientRect();
                      setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 8 });
                    }}
                    onMouseLeave={() => {
                      setHoveredBar(null);
                      setTooltipPos(null);
                    }}
                    onClick={() => setSelectedDate(selectedDate === d.date ? null : d.date)}
                  >
                    {/* Hover hit area */}
                    <rect
                      x={x - 2}
                      y={20}
                      width={barWidth + 4}
                      height={125}
                      fill={isHovered ? "rgba(79, 133, 255, 0.08)" : "transparent"}
                      rx={3}
                    />

                    {/* Empty/Zero line marker if 0 tokens */}
                    {d.totalTokens === 0 ? (
                      <rect
                        x={x}
                        y={yBase - 2}
                        width={barWidth}
                        height={2}
                        fill="rgba(255, 255, 255, 0.08)"
                        rx={1}
                      />
                    ) : (
                      <g>
                        {/* Cached segment (bottom) */}
                        {cachedH > 0 && (
                          <rect
                            x={x}
                            y={yBase - cachedH}
                            width={barWidth}
                            height={cachedH}
                            fill="#253b82"
                            rx={billedH <= 0 ? 2 : 0}
                          />
                        )}
                        {/* Billed segment (top) */}
                        {billedH > 0 && (
                          <rect
                            x={x}
                            y={yBase - totalH}
                            width={barWidth}
                            height={billedH}
                            fill={isHovered ? "#60a5fa" : "#4f85ff"}
                            rx={2}
                            style={{
                              filter: isHovered ? "drop-shadow(0 0 5px rgba(79, 133, 255, 0.8))" : "none",
                            }}
                          />
                        )}
                      </g>
                    )}

                    {/* X-axis date labels: show every Nth label depending on range */}
                    {(chartRange === 14 || idx % (chartRange === 30 ? 3 : 7) === 0) && (
                      <text
                        x={x + barWidth / 2}
                        y={162}
                        fontSize={9}
                        fill="var(--dsw-alias-label-tertiary, #888888)"
                        textAnchor="middle"
                        fontFamily="inherit"
                      >
                        {d.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>

      {/* Day Inspection Detail Drawer (Opens when any day is clicked) */}
      {selectedDate && (
        <div
          style={{
            marginTop: 18,
            background: "var(--dsw-alias-bg-layer-2, #2c2c2c)",
            border: "1px solid var(--dsw-alias-border-l2, #494949)",
            borderRadius: 12,
            padding: "18px 20px",
            boxShadow: "0 6px 20px rgba(0, 0, 0, 0.25)",
            animation: "fadeIn 0.15s ease",
          }}
        >
          {/* Header of the Day Detail */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid var(--dsw-alias-border-l1, #3a3a3a)",
              paddingBottom: 12,
              marginBottom: 14,
            }}
          >
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--dsw-alias-label-primary, #ffffff)" }}>
                {new Date(selectedDate + "T00:00:00").toLocaleDateString(undefined, {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
              <div style={{ fontSize: 12, color: "var(--dsw-alias-label-secondary, #b9b9b9)", marginTop: 2 }}>
                {inspectedDayStats && inspectedDayStats.totalTokens > 0 ? (
                  <span>
                    <strong style={{ color: "#4f85ff" }}>{formatExact(inspectedDayStats.totalTokens)}</strong> total tokens across{" "}
                    <strong>{inspectedDayStats.turns}</strong> turns
                  </span>
                ) : (
                  "No activity recorded"
                )}
              </div>
            </div>

            <button
              onClick={() => setSelectedDate(null)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--dsw-alias-label-tertiary)",
                cursor: "pointer",
                fontSize: 16,
                padding: "4px 8px",
                borderRadius: 4,
              }}
              title="Close day view"
            >
              ✕
            </button>
          </div>

          {/* Breakdown Pills for the day */}
          {inspectedDayStats && inspectedDayStats.totalTokens > 0 && (
            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                marginBottom: 16,
                fontSize: 12,
              }}
            >
              <div style={{ padding: "6px 12px", background: "var(--dsw-alias-bg-layer-1, #1e1e1e)", borderRadius: 6, border: "1px solid var(--dsw-alias-border-l1)" }}>
                <span style={{ color: "var(--dsw-alias-label-tertiary)" }}>Billed Input: </span>
                <strong>{formatNumber(inspectedDayStats.inputTokens)}</strong>
              </div>
              <div style={{ padding: "6px 12px", background: "var(--dsw-alias-bg-layer-1, #1e1e1e)", borderRadius: 6, border: "1px solid var(--dsw-alias-border-l1)" }}>
                <span style={{ color: "var(--dsw-alias-label-tertiary)" }}>Output Generated: </span>
                <strong>{formatNumber(inspectedDayStats.outputTokens)}</strong>
              </div>
              <div style={{ padding: "6px 12px", background: "var(--dsw-alias-bg-layer-1, #1e1e1e)", borderRadius: 6, border: "1px solid var(--dsw-alias-border-l1)" }}>
                <span style={{ color: "var(--dsw-alias-label-tertiary)" }}>Cache Reads: </span>
                <strong>{formatNumber(inspectedDayStats.cacheReadTokens)}</strong> (
                {Math.round((inspectedDayStats.cacheReadTokens / inspectedDayStats.totalTokens) * 100)}%)
              </div>
            </div>
          )}

          {/* Sessions List for that Day */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--dsw-alias-label-primary)", marginBottom: 10 }}>
              Sessions Active on this Day ({(inspectedDayStats?.sessions || []).length})
            </div>

            {inspectedDayStats?.sessions && inspectedDayStats.sessions.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflowY: "auto" }}>
                {inspectedDayStats.sessions.map((sess, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      background: "var(--dsw-alias-bg-layer-1, #1e1e1e)",
                      border: "1px solid var(--dsw-alias-border-l1, #3a3a3a)",
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1, paddingRight: 16 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "var(--dsw-alias-label-primary, #ffffff)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {sess.sessionTitle}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--dsw-alias-label-tertiary, #a0a0a0)", marginTop: 2 }}>
                        Started {new Date(sess.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · ID: {sess.sessionId.slice(0, 10)}
                      </div>
                    </div>

                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#4f85ff" }}>
                        {formatNumber(sess.totalTokens)} tokens
                      </div>
                      <div style={{ fontSize: 11, color: "var(--dsw-alias-label-secondary)", marginTop: 2 }}>
                        {sess.turns} turns · {formatNumber(sess.inputTokens + sess.outputTokens)} billed
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: "16px", textAlign: "center", color: "var(--dsw-alias-label-tertiary)", fontSize: 12, background: "var(--dsw-alias-bg-layer-1)", borderRadius: 8 }}>
                No session records found for this date.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Hover Tooltip for Calendar Day */}
      {hoveredDay && tooltipPos && !selectedDate && (
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
              <div style={{ color: "#4f85ff", fontWeight: 600 }}>
                {formatExact(hoveredDay.stats.totalTokens)} tokens
              </div>
              <div style={{ fontSize: 11, color: "var(--dsw-alias-label-secondary)", marginTop: 2 }}>
                {hoveredDay.stats.turns} requests / steps
              </div>
              <div style={{ fontSize: 10, color: "var(--dsw-alias-label-tertiary)", marginTop: 4 }}>
                Click to inspect sessions on this day
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating Hover Tooltip for Chart Bar */}
      {hoveredBar && tooltipPos && (
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
            {new Date(hoveredBar.date + "T00:00:00").toLocaleDateString(undefined, {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </div>
          {hoveredBar.totalTokens === 0 ? (
            <div style={{ color: "var(--dsw-alias-label-tertiary)" }}>No activity recorded</div>
          ) : (
            <div>
              <div style={{ color: "#4f85ff", fontWeight: 600 }}>
                {formatExact(hoveredBar.totalTokens)} total tokens
              </div>
              <div style={{ fontSize: 11, color: "var(--dsw-alias-label-secondary)", marginTop: 2 }}>
                Billed: {formatNumber(hoveredBar.billedTokens)} · Cached: {formatNumber(hoveredBar.cachedTokens)}
              </div>
              <div style={{ fontSize: 10, color: "var(--dsw-alias-label-tertiary)", marginTop: 4 }}>
                {hoveredBar.turns} turns · Click to inspect day
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

class HeatmapErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: any }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, info: any) {
    console.error("Heatmap rendering error:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "30px 20px", color: "var(--dsw-alias-state-error-primary, #ef4444)" }}>
          <h3 style={{ margin: "0 0 10px 0" }}>Token Heatmap Encountered an Error</h3>
          <pre
            style={{
              fontSize: 12,
              background: "rgba(0,0,0,0.3)",
              padding: 12,
              borderRadius: 8,
              overflowX: "auto",
            }}
          >
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              marginTop: 12,
              padding: "6px 14px",
              background: "var(--dsw-alias-brand-primary, #3964fe)",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function HeatmapView() {
  return (
    <HeatmapErrorBoundary>
      <HeatmapInnerView />
    </HeatmapErrorBoundary>
  );
}
