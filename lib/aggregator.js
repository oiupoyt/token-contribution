import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
const fileCache = /* @__PURE__ */ new Map();
function findSessionFiles(dir) {
  const results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...findSessionFiles(fullPath));
      } else if (entry.name.endsWith(".jsonl.zstd") || entry.name.endsWith(".jsonl")) {
        results.push(fullPath);
      }
    }
  } catch {
  }
  return results;
}
async function parseSessionFile(filePath) {
  try {
    const stat = fs.statSync(filePath);
    const cached = fileCache.get(filePath);
    if (cached && cached.mtimeMs === stat.mtimeMs) {
      return cached.session;
    }
    const isZstd = filePath.endsWith(".zstd");
    const days = {};
    let sessionId = path.basename(path.dirname(filePath));
    let title = "";
    let createdAt = stat.birthtimeMs || stat.mtimeMs;
    let totalTokens = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCacheReadTokens = 0;
    let totalTurns = 0;
    await new Promise((resolve) => {
      let buffer = "";
      const handleLine = (line) => {
        if (line.includes('"type":"session"')) {
          try {
            const obj = JSON.parse(line);
            if (obj.id) sessionId = obj.id;
            if (obj.createdAt) createdAt = obj.createdAt;
          } catch {
          }
        }
        if (!title && line.includes('"session/title"')) {
          try {
            const obj = JSON.parse(line);
            if (obj.data?.title) title = obj.data.title;
          } catch {
          }
        }
        if (!title && line.includes('"subagent/descriptor"')) {
          try {
            const obj = JSON.parse(line);
            if (obj.data?.label) title = obj.data.label;
          } catch {
          }
        }
        if (line.includes('"usage"')) {
          try {
            const obj = JSON.parse(line);
            const time = obj.time || obj.data && obj.data.time;
            const usage = obj.usage || obj.data && obj.data.usage;
            if (time && usage) {
              const d = new Date(time);
              const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
              const input = Number(usage.inputTokens) || 0;
              const output = Number(usage.outputTokens) || 0;
              const cacheRead = Number(usage.cacheReadTokens) || 0;
              const cacheWrite = Number(usage.cacheWriteTokens) || 0;
              const total = input + output + cacheRead;
              if (!days[dateKey]) {
                days[dateKey] = {
                  totalTokens: 0,
                  inputTokens: 0,
                  outputTokens: 0,
                  cacheReadTokens: 0,
                  cacheWriteTokens: 0,
                  turns: 0
                };
              }
              days[dateKey].totalTokens += total;
              days[dateKey].inputTokens += input;
              days[dateKey].outputTokens += output;
              days[dateKey].cacheReadTokens += cacheRead;
              days[dateKey].cacheWriteTokens += cacheWrite;
              days[dateKey].turns += 1;
              totalTokens += total;
              totalInputTokens += input;
              totalOutputTokens += output;
              totalCacheReadTokens += cacheRead;
              totalTurns += 1;
            }
          } catch {
          }
        }
      };
      if (isZstd) {
        const proc = spawn("zstd", ["-dc", filePath], { stdio: ["ignore", "pipe", "ignore"] });
        proc.stdout.on("data", (chunk) => {
          buffer += chunk.toString("utf8");
          let idx;
          while ((idx = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 1);
            handleLine(line);
          }
        });
        proc.on("close", () => {
          if (buffer.trim().length > 0) handleLine(buffer);
          resolve();
        });
        proc.on("error", () => resolve());
      } else {
        const stream = fs.createReadStream(filePath, { encoding: "utf8" });
        stream.on("data", (chunk) => {
          buffer += chunk;
          let idx;
          while ((idx = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 1);
            handleLine(line);
          }
        });
        stream.on("end", () => {
          if (buffer.trim().length > 0) handleLine(buffer);
          resolve();
        });
        stream.on("error", () => resolve());
      }
    });
    const session = {
      id: sessionId,
      title: title || `Session ${sessionId.slice(0, 8)}`,
      createdAt,
      totalTokens,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      cacheReadTokens: totalCacheReadTokens,
      turns: totalTurns,
      days
    };
    fileCache.set(filePath, { mtimeMs: stat.mtimeMs, session });
    return session;
  } catch {
    return null;
  }
}
async function aggregateTokens(customSessionsRoot) {
  const sessionsRoot = customSessionsRoot || path.join(os.homedir(), ".dsh", "sessions");
  const files = findSessionFiles(sessionsRoot);
  const parsedSessions = (await Promise.all(files.map(parseSessionFile))).filter(Boolean);
  parsedSessions.sort((a, b) => b.createdAt - a.createdAt);
  const days = {};
  for (const session of parsedSessions) {
    for (const [date, stats] of Object.entries(session.days)) {
      if (!days[date]) {
        days[date] = {
          totalTokens: 0,
          inputTokens: 0,
          outputTokens: 0,
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
          turns: 0,
          sessions: []
        };
      }
      days[date].totalTokens += stats.totalTokens;
      days[date].inputTokens += stats.inputTokens;
      days[date].outputTokens += stats.outputTokens;
      days[date].cacheReadTokens += stats.cacheReadTokens;
      days[date].cacheWriteTokens += stats.cacheWriteTokens;
      days[date].turns += stats.turns;
      days[date].sessions.push({
        sessionId: session.id,
        sessionTitle: session.title,
        createdAt: session.createdAt,
        totalTokens: stats.totalTokens,
        inputTokens: stats.inputTokens,
        outputTokens: stats.outputTokens,
        cacheReadTokens: stats.cacheReadTokens,
        turns: stats.turns
      });
    }
  }
  for (const day of Object.values(days)) {
    if (day.sessions) {
      day.sessions.sort((a, b) => b.totalTokens - a.totalTokens);
    }
  }
  const positiveValues = Object.values(days).map((d) => d.totalTokens).filter((t) => t > 0).sort((a, b) => a - b);
  let q1 = 5e6;
  let q2 = 25e6;
  let q3 = 75e6;
  if (positiveValues.length >= 4) {
    q1 = positiveValues[Math.floor(positiveValues.length * 0.25)];
    q2 = positiveValues[Math.floor(positiveValues.length * 0.5)];
    q3 = positiveValues[Math.floor(positiveValues.length * 0.75)];
  }
  for (const day of Object.values(days)) {
    if (day.totalTokens === 0) day.level = 0;
    else if (day.totalTokens <= q1) day.level = 1;
    else if (day.totalTokens <= q2) day.level = 2;
    else if (day.totalTokens <= q3) day.level = 3;
    else day.level = 4;
  }
  let totalTokens = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCacheReadTokens = 0;
  let totalTurns = 0;
  let peakDay = null;
  for (const [date, stats] of Object.entries(days)) {
    totalTokens += stats.totalTokens;
    totalInputTokens += stats.inputTokens;
    totalOutputTokens += stats.outputTokens;
    totalCacheReadTokens += stats.cacheReadTokens;
    totalTurns += stats.turns;
    if (!peakDay || stats.totalTokens > peakDay.tokens) {
      peakDay = { date, tokens: stats.totalTokens, turns: stats.turns };
    }
  }
  const activeDays = Object.values(days).filter((d) => d.totalTokens > 0).length;
  const dailyAverage = activeDays > 0 ? Math.round(totalTokens / activeDays) : 0;
  const now = /* @__PURE__ */ new Date();
  const formatDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  let currentStreak = 0;
  let cursor = new Date(now);
  const todayKey = formatDate(cursor);
  cursor.setDate(cursor.getDate() - 1);
  const yesterdayKey = formatDate(cursor);
  let streakDate = (days[todayKey]?.totalTokens ?? 0) > 0 ? new Date(now) : (days[yesterdayKey]?.totalTokens ?? 0) > 0 ? new Date(cursor) : null;
  if (streakDate) {
    while (true) {
      const key = formatDate(streakDate);
      if ((days[key]?.totalTokens ?? 0) > 0) {
        currentStreak++;
        streakDate.setDate(streakDate.getDate() - 1);
      } else {
        break;
      }
    }
  }
  const sortedDates = Object.keys(days).filter((k) => days[k].totalTokens > 0).sort();
  let longestStreak = 0;
  let tempStreak = 0;
  let prevDate = null;
  for (const dateStr of sortedDates) {
    const cur = /* @__PURE__ */ new Date(dateStr + "T00:00:00");
    if (!prevDate) {
      tempStreak = 1;
    } else {
      const diffDays = Math.round((cur.getTime() - prevDate.getTime()) / (1e3 * 60 * 60 * 24));
      if (diffDays === 1) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    }
    if (tempStreak > longestStreak) longestStreak = tempStreak;
    prevDate = cur;
  }
  const endDate = formatDate(now);
  const start = new Date(now);
  start.setDate(start.getDate() - 364);
  const startDate = formatDate(start);
  return {
    summary: {
      totalTokens,
      totalInputTokens,
      totalOutputTokens,
      totalCacheReadTokens,
      totalTurns,
      activeDays,
      currentStreak,
      longestStreak: Math.max(longestStreak, currentStreak),
      peakDay,
      dailyAverage
    },
    days,
    sessions: parsedSessions,
    startDate,
    endDate
  };
}
export {
  aggregateTokens
};
//# sourceMappingURL=aggregator.js.map
