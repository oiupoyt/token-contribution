// src/client/index.tsx
import React3, { useState as useState2, useEffect as useEffect2 } from "react";
import { createRoot } from "react-dom/client";

// src/client/HeatmapView.tsx
import React, { useEffect, useState, useMemo } from "react";
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
var COLOR_THEMES = {
  green: {
    name: "GitHub Emerald",
    levels: [
      "var(--dsw-alias-interactive-bg-hover, rgba(128, 128, 128, 0.08))",
      "#0e4429",
      "#006d32",
      "#26a641",
      "#39d353"
    ]
  },
  deepseek: {
    name: "DeepSeek Indigo",
    levels: [
      "var(--dsw-alias-interactive-bg-hover, rgba(128, 128, 128, 0.08))",
      "#1e1e4a",
      "#2e3188",
      "#434fc7",
      "#6366f1"
    ]
  }
};
function HeatmapView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [themeKey, setThemeKey] = useState("green");
  const [hoveredDay, setHoveredDay] = useState(null);
  const [tooltipPos, setTooltipPos] = useState(null);
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
  useEffect(() => {
    fetchStats();
  }, []);
  const calendarGrid = useMemo(() => {
    if (!data) return null;
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
      const dayStats = data.days[dateKey] || {
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
  }, [data]);
  const monthHeaders = useMemo(() => {
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
  const activeTheme = COLOR_THEMES[themeKey];
  if (loading && !data) {
    return /* @__PURE__ */ React.createElement("div", { style: { padding: "40px 20px", textAlign: "center", color: "var(--dsw-alias-label-secondary)" } }, "Loading token usage heatmap...");
  }
  if (error) {
    return /* @__PURE__ */ React.createElement("div", { style: { padding: "20px", color: "var(--dsw-alias-state-error-primary, #ef4444)" } }, "Failed to load heatmap: ", error, /* @__PURE__ */ React.createElement(
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
  if (!data) return null;
  const { summary } = data;
  const cacheHitPercent = summary.totalTokens > 0 ? Math.round(summary.totalCacheReadTokens / summary.totalTokens * 100) : 0;
  return /* @__PURE__ */ React.createElement(
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
    /* @__PURE__ */ React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 20
        }
      },
      /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(
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
        /* @__PURE__ */ React.createElement(
          "span",
          {
            style: {
              fontSize: 12,
              fontWeight: 500,
              padding: "2px 8px",
              borderRadius: 12,
              background: "var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,0.15))",
              color: "var(--dsw-alias-label-secondary)"
            }
          },
          "Last 12 Months"
        )
      ), /* @__PURE__ */ React.createElement(
        "p",
        {
          style: {
            margin: "6px 0 0",
            fontSize: 13,
            color: "var(--dsw-alias-label-tertiary, #a0a0a0)"
          }
        },
        "Daily token volume and request step intensity across all sessions"
      )),
      /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } }, /* @__PURE__ */ React.createElement(
        "div",
        {
          style: {
            display: "inline-flex",
            background: "var(--dsw-alias-bg-layer-2, #2c2c2c)",
            border: "1px solid var(--dsw-alias-border-l2, #494949)",
            borderRadius: 8,
            padding: 2
          }
        },
        /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: () => setThemeKey("green"),
            style: {
              border: 0,
              background: themeKey === "green" ? "var(--dsw-alias-bg-layer-1, #1e1e1e)" : "transparent",
              color: themeKey === "green" ? "var(--dsw-alias-label-primary)" : "var(--dsw-alias-label-tertiary)",
              fontSize: 12,
              padding: "4px 10px",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: themeKey === "green" ? 600 : 400
            }
          },
          "Emerald"
        ),
        /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: () => setThemeKey("deepseek"),
            style: {
              border: 0,
              background: themeKey === "deepseek" ? "var(--dsw-alias-bg-layer-1, #1e1e1e)" : "transparent",
              color: themeKey === "deepseek" ? "var(--dsw-alias-label-primary)" : "var(--dsw-alias-label-tertiary)",
              fontSize: 12,
              padding: "4px 10px",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: themeKey === "deepseek" ? 600 : 400
            }
          },
          "Indigo"
        )
      ), /* @__PURE__ */ React.createElement(
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
    /* @__PURE__ */ React.createElement(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 20
        }
      },
      /* @__PURE__ */ React.createElement(
        "div",
        {
          style: {
            background: "var(--dsw-alias-bg-layer-2, #2c2c2c)",
            border: "1px solid var(--dsw-alias-border-l2, #494949)",
            borderRadius: 10,
            padding: "14px 16px"
          }
        },
        /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "var(--dsw-alias-label-tertiary, #a0a0a0)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 } }, "Total Tokens"),
        /* @__PURE__ */ React.createElement("div", { style: { fontSize: 24, fontWeight: 700, margin: "6px 0 2px", color: "var(--dsw-alias-label-primary, #ffffff)" } }, formatNumber(summary.totalTokens)),
        /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "var(--dsw-alias-label-secondary, #b9b9b9)" } }, formatExact(summary.totalTokens), " total")
      ),
      /* @__PURE__ */ React.createElement(
        "div",
        {
          style: {
            background: "var(--dsw-alias-bg-layer-2, #2c2c2c)",
            border: "1px solid var(--dsw-alias-border-l2, #494949)",
            borderRadius: 10,
            padding: "14px 16px"
          }
        },
        /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "var(--dsw-alias-label-tertiary, #a0a0a0)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 } }, "Cache Hit Ratio"),
        /* @__PURE__ */ React.createElement("div", { style: { fontSize: 24, fontWeight: 700, margin: "6px 0 2px", color: "#10b981" } }, cacheHitPercent, "%"),
        /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "var(--dsw-alias-label-secondary, #b9b9b9)" } }, formatNumber(summary.totalCacheReadTokens), " cached reads")
      ),
      /* @__PURE__ */ React.createElement(
        "div",
        {
          style: {
            background: "var(--dsw-alias-bg-layer-2, #2c2c2c)",
            border: "1px solid var(--dsw-alias-border-l2, #494949)",
            borderRadius: 10,
            padding: "14px 16px"
          }
        },
        /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "var(--dsw-alias-label-tertiary, #a0a0a0)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 } }, "Daily Average"),
        /* @__PURE__ */ React.createElement("div", { style: { fontSize: 24, fontWeight: 700, margin: "6px 0 2px", color: "var(--dsw-alias-label-primary, #ffffff)" } }, formatNumber(summary.dailyAverage)),
        /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "var(--dsw-alias-label-secondary, #b9b9b9)" } }, "Across ", summary.activeDays, " active days")
      ),
      /* @__PURE__ */ React.createElement(
        "div",
        {
          style: {
            background: "var(--dsw-alias-bg-layer-2, #2c2c2c)",
            border: "1px solid var(--dsw-alias-border-l2, #494949)",
            borderRadius: 10,
            padding: "14px 16px"
          }
        },
        /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "var(--dsw-alias-label-tertiary, #a0a0a0)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 } }, "Active Streak"),
        /* @__PURE__ */ React.createElement("div", { style: { fontSize: 24, fontWeight: 700, margin: "6px 0 2px", color: "var(--dsw-alias-label-primary, #ffffff)" } }, summary.currentStreak, " ", summary.currentStreak === 1 ? "day" : "days"),
        /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "var(--dsw-alias-label-secondary, #b9b9b9)" } }, "Longest streak: ", summary.longestStreak, " days")
      )
    ),
    /* @__PURE__ */ React.createElement(
      "div",
      {
        style: {
          background: "var(--dsw-alias-bg-layer-2, #2c2c2c)",
          border: "1px solid var(--dsw-alias-border-l2, #494949)",
          borderRadius: 12,
          padding: "20px 22px",
          position: "relative",
          overflowX: "auto"
        }
      },
      /* @__PURE__ */ React.createElement(
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
        /* @__PURE__ */ React.createElement("span", null, "Contribution Calendar"),
        summary.peakDay && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, fontWeight: 400, color: "var(--dsw-alias-label-secondary)" } }, "Peak day: ", /* @__PURE__ */ React.createElement("strong", { style: { color: "var(--dsw-alias-label-primary)" } }, summary.peakDay.date), " (", formatNumber(summary.peakDay.tokens), " tokens)")
      ),
      calendarGrid && /* @__PURE__ */ React.createElement("div", { style: { display: "inline-block", minWidth: 780 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", marginLeft: 32, marginBottom: 4, height: 16 } }, monthHeaders.map((m, i) => /* @__PURE__ */ React.createElement(
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
      ))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6 } }, /* @__PURE__ */ React.createElement(
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
        DAY_LABELS.map((lbl, idx) => /* @__PURE__ */ React.createElement("div", { key: idx, style: { height: 11, lineHeight: "11px" } }, lbl))
      ), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 3 } }, calendarGrid.map((week, colIdx) => /* @__PURE__ */ React.createElement("div", { key: colIdx, style: { display: "flex", flexDirection: "column", gap: 3 } }, week.map((day, rowIdx) => {
        if (!day) {
          return /* @__PURE__ */ React.createElement("div", { key: rowIdx, style: { width: 11, height: 11 } });
        }
        const lvl = day.stats.level || 0;
        const bg = activeTheme.levels[lvl];
        return /* @__PURE__ */ React.createElement(
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
              border: lvl === 0 ? "1px solid var(--dsw-alias-border-l1, rgba(255,255,255,0.06))" : "1px solid transparent",
              cursor: "pointer",
              transition: "transform 0.1s ease, filter 0.1s ease"
            }
          }
        );
      }))))), /* @__PURE__ */ React.createElement(
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
        /* @__PURE__ */ React.createElement("span", null, "Less"),
        activeTheme.levels.map((c, i) => /* @__PURE__ */ React.createElement(
          "div",
          {
            key: i,
            style: {
              width: 11,
              height: 11,
              borderRadius: 2,
              backgroundColor: c,
              border: i === 0 ? "1px solid var(--dsw-alias-border-l1)" : "none"
            }
          }
        )),
        /* @__PURE__ */ React.createElement("span", null, "More")
      ))
    ),
    hoveredDay && tooltipPos && /* @__PURE__ */ React.createElement(
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
      /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 650, color: "var(--dsw-alias-label-primary, #ffffff)", marginBottom: 4 } }, (/* @__PURE__ */ new Date(hoveredDay.date + "T00:00:00")).toLocaleDateString(void 0, {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric"
      })),
      hoveredDay.stats.totalTokens === 0 ? /* @__PURE__ */ React.createElement("div", { style: { color: "var(--dsw-alias-label-tertiary)" } }, "No activity recorded") : /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { color: "#34d399", fontWeight: 600 } }, formatExact(hoveredDay.stats.totalTokens), " tokens"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "var(--dsw-alias-label-secondary)", marginTop: 2 } }, hoveredDay.stats.turns, " requests / steps"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "var(--dsw-alias-label-tertiary)", marginTop: 4 } }, "Billed: ", formatNumber(hoveredDay.stats.inputTokens + hoveredDay.stats.outputTokens), " \xB7 Cache: ", formatNumber(hoveredDay.stats.cacheReadTokens)))
    )
  );
}

// src/client/HeatmapModal.tsx
import React2 from "react";
function HeatmapModal({ open, onClose }) {
  if (!open) return null;
  return /* @__PURE__ */ React2.createElement(
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
    /* @__PURE__ */ React2.createElement(
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
      /* @__PURE__ */ React2.createElement(
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
      /* @__PURE__ */ React2.createElement(HeatmapView, null)
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
      const [isOpen, setIsOpen] = useState2(false);
      useEffect2(() => {
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
      return /* @__PURE__ */ React3.createElement(HeatmapModal, { open: isOpen, onClose: () => setIsOpen(false) });
    };
    const modalContainer = document.createElement("div");
    modalContainer.id = "dsh-token-heatmap-modal-root";
    document.body.appendChild(modalContainer);
    const root = createRoot(modalContainer);
    root.render(/* @__PURE__ */ React3.createElement(ModalController, null));
    const observer = new MutationObserver(() => {
      const statDialogs = document.querySelectorAll(
        'div[role="dialog"][aria-label*="usage" i], div[role="dialog"][aria-label*="Token" i], [data-session-stats-usage]'
      );
      statDialogs.forEach((dialog) => {
        if (dialog.querySelector(".dsh-heatmap-trigger-btn")) return;
        const button = document.createElement("button");
        button.className = "dsh-heatmap-trigger-btn";
        button.type = "button";
        button.innerHTML = "<span>\u{1F4CA} View 12-Month Activity Heatmap \u2192</span>";
        button.style.cssText = `
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          margin-top: 12px;
          padding: 8px 12px;
          background: var(--dsw-alias-interactive-bg-hover, rgba(128, 128, 128, 0.12));
          border: 1px solid var(--dsw-alias-border-l2, #494949);
          border-radius: 8px;
          color: var(--dsw-alias-brand-primary, #6366f1);
          font-size: 12px;
          font-weight: 550;
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease;
        `;
        button.onmouseenter = () => {
          button.style.background = "var(--dsw-alias-border-l1, rgba(128, 128, 128, 0.2))";
          button.style.borderColor = "var(--dsw-alias-brand-primary, #6366f1)";
        };
        button.onmouseleave = () => {
          button.style.background = "var(--dsw-alias-interactive-bg-hover, rgba(128, 128, 128, 0.12))";
          button.style.borderColor = "var(--dsw-alias-border-l2, #494949)";
        };
        button.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          window.dispatchEvent(new CustomEvent("dsh:open-token-heatmap"));
        };
        dialog.appendChild(button);
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
}
export {
  apply,
  inject,
  name
};
