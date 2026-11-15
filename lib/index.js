// src/server/aggregator.ts
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import zlib from "node:zlib";
import { execFileSync, spawn } from "node:child_process";

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
function serializeResponse(r) {
  const days = {};
  const sessions = r.sessions.map(({ recent, dayModels, ...rest }) => rest);
  for (const [date, d] of Object.entries(r.days)) {
    days[date] = { ...d, sessions: d.sessions.map(({ sessionTitle, createdAt, ...rest }) => rest) };
  }
  return JSON.stringify({ ...r, sessions, days }, (_k, v) => v === 0 ? void 0 : v);
}

// src/server/aggregator.ts
var zero = () => ({
  totalTokens: 0,
  inputTokens: 0,
  outputTokens: 0,
  reasoningTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  turns: 0
});
function addInto(into, from) {
  into.totalTokens += from.totalTokens;
  into.inputTokens += from.inputTokens;
  into.outputTokens += from.outputTokens;
  into.reasoningTokens += from.reasoningTokens;
  into.cacheReadTokens += from.cacheReadTokens;
  into.cacheWriteTokens += from.cacheWriteTokens;
  into.turns += from.turns;
}
var dateKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
var ZSTD_MAGIC = Buffer.from([40, 181, 47, 253]);
function decodeZstdFrames(buf, from, onFrame) {
  let off = from;
  let carry;
  while (off < buf.length) {
    const len = zstdFrameLength(buf, off);
    if (len <= 0) break;
    let data = zlib.zstdDecompressSync(buf.subarray(off, off + len));
    off += len;
    if (carry) data = Buffer.concat([carry, data]);
    const last = data.lastIndexOf(10);
    if (last === data.length - 1) {
      carry = void 0;
      onFrame(data);
    } else {
      carry = data.subarray(last + 1);
      if (last >= 0) onFrame(data.subarray(0, last + 1));
    }
  }
  if (carry) onFrame(carry);
  return off;
}
function streamZstd(file, onChunk) {
  return new Promise((resolve, reject) => {
    const proc = spawn("zstd", ["-dcq", file], { stdio: ["ignore", "pipe", "pipe"] });
    let carry;
    let stderr = "";
    proc.stdout.on("data", (chunk) => {
      const data = carry ? Buffer.concat([carry, chunk]) : chunk;
      const last = data.lastIndexOf(10);
      if (last === -1) {
        carry = data;
        return;
      }
      carry = last === data.length - 1 ? void 0 : data.subarray(last + 1);
      onChunk(data.subarray(0, last + 1));
    });
    proc.stderr.on("data", (c) => stderr += c.toString());
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (carry && carry[0] === 123) onChunk(carry);
      if (code === 0 || /truncated|unexpected end|premature/i.test(stderr)) resolve();
      else reject(new Error(stderr.trim() || `zstd exited ${code}`));
    });
  });
}
var hasZstdCli;
function zstdCliAvailable() {
  if (hasZstdCli === void 0) {
    try {
      execFileSync("zstd", ["--version"], { stdio: "ignore" });
      hasZstdCli = true;
    } catch {
      hasZstdCli = false;
    }
  }
  return hasZstdCli;
}
async function readSession(file, from, onChunk) {
  if (!file.endsWith(".zstd")) {
    const buf = fs.readFileSync(file);
    const last = buf.lastIndexOf(10);
    const end = last === -1 ? from : Math.max(from, last + 1);
    onChunk(buf.subarray(from, end));
    return end;
  }
  if (from === 0 && zstdCliAvailable()) {
    const size = fs.statSync(file).size;
    await streamZstd(file, onChunk);
    return endOfCompleteFrames(file, size);
  }
  return decodeZstdFrames(fs.readFileSync(file), from, onChunk);
}
function zstdFrameLength(buf, at) {
  if (at + 6 > buf.length || buf.readUInt32LE(at) !== 4247762216) return -1;
  const fhd = buf[at + 4];
  const fcsFlag = fhd >> 6;
  const singleSegment = fhd >> 5 & 1;
  const hasChecksum = fhd >> 2 & 1;
  const dictIdFlag = fhd & 3;
  const fcsSize = fcsFlag === 0 ? singleSegment : [1, 2, 4, 8][fcsFlag];
  let p = at + 5 + (singleSegment ? 0 : 1) + [0, 1, 2, 4][dictIdFlag] + fcsSize;
  for (; ; ) {
    if (p + 3 > buf.length) return -1;
    const header = buf[p] | buf[p + 1] << 8 | buf[p + 2] << 16;
    const last = header & 1;
    const type = header >> 1 & 3;
    const size = header >>> 3;
    p += 3 + (type === 1 ? 1 : size);
    if (p > buf.length) return -1;
    if (last) break;
  }
  if (hasChecksum) p += 4;
  return p > buf.length ? -1 : p - at;
}
function endOfCompleteFrames(file, size) {
  const buf = fs.readFileSync(file);
  let at = 0;
  while (at < size) {
    const len = zstdFrameLength(buf, at);
    if (len <= 0) return at;
    at += len;
  }
  return at;
}
var b = (s) => Buffer.from(s, "utf8");
var ASSISTANT = b('{"type":"assistant/message"');
var SESSION = b('{"type":"session"');
var SESSION_CHILD = b('{"type":"session/');
var TITLE = b('{"type":"session/title"');
var DESCRIPTOR = b('{"type":"subagent/descriptor"');
var USAGE = b('"usage":{');
var SOURCE = b('"source":{');
var startsAt = (buf, at, prefix) => buf.length - at >= prefix.length && buf.compare(prefix, 0, prefix.length, at, at + prefix.length) === 0;
function parseInto(into, buf) {
  let start = 0;
  while (start < buf.length) {
    let end = buf.indexOf(10, start);
    if (end === -1) end = buf.length;
    const lineStart = start;
    start = end + 1;
    if (startsAt(buf, lineStart, ASSISTANT)) {
      const usageAt = buf.indexOf(USAGE, lineStart);
      if (usageAt === -1 || usageAt > end) continue;
      const usageEnd = buf.indexOf(125, usageAt);
      if (usageEnd === -1 || usageEnd > end) continue;
      let usage;
      try {
        usage = JSON.parse(buf.toString("utf8", usageAt + 8, usageEnd + 1));
      } catch {
        continue;
      }
      const head = buf.toString("utf8", lineStart, Math.min(end, lineStart + 80));
      let time = Number(/^\{"type":"assistant\/message"(?:,"seq":\d+)?,"time":(\d+)[,}]/.exec(head)?.[1]) || 0;
      if (!time) {
        try {
          const obj2 = JSON.parse(buf.toString("utf8", lineStart, end));
          const t = new Date(obj2.time ?? obj2.data?.time).getTime();
          time = Number.isFinite(t) ? t : 0;
        } catch {
          time = 0;
        }
      }
      if (!time) continue;
      const sourceAt = buf.indexOf(SOURCE, lineStart);
      const scope = sourceAt !== -1 && sourceAt < end ? buf.toString("utf8", sourceAt, Math.min(end, sourceAt + 400)) : buf.toString("utf8", lineStart, Math.min(end, usageAt));
      const provider = /"provider":"([^"]*)"/.exec(scope)?.[1] ?? "unknown";
      const model = /"model":"([^"]*)"/.exec(scope)?.[1] ?? "unknown";
      const input = Number(usage.inputTokens) || 0;
      const output = Number(usage.outputTokens) || 0;
      const cacheRead = Number(usage.cacheReadTokens) || 0;
      const row = {
        totalTokens: input + output + cacheRead,
        inputTokens: input,
        outputTokens: output,
        reasoningTokens: Number(usage.reasoningTokens) || 0,
        cacheReadTokens: cacheRead,
        cacheWriteTokens: Number(usage.cacheWriteTokens) || 0,
        turns: 1
      };
      const day = dateKey(new Date(time));
      addInto(into.days[day] ??= zero(), row);
      addInto(into.models[model] ??= { ...zero(), provider }, row);
      addInto(((into.dayModels ??= {})[day] ??= {})[model] ??= { ...zero(), provider }, row);
      addInto(into, row);
      const hour = String(time - time % 36e5);
      const bucket = (into.recent ??= {})[hour] ??= {};
      addInto(bucket[model] ??= { ...zero(), provider }, row);
      continue;
    }
    const isHeader = startsAt(buf, lineStart, SESSION) && !startsAt(buf, lineStart, SESSION_CHILD);
    const isTitle = !into.title && (startsAt(buf, lineStart, TITLE) || startsAt(buf, lineStart, DESCRIPTOR));
    if (!isHeader && !isTitle) continue;
    let obj;
    try {
      obj = JSON.parse(buf.toString("utf8", lineStart, end));
    } catch {
      continue;
    }
    if (isHeader) {
      if (obj.id) into.id = obj.id;
      if (obj.createdAt) into.createdAt = obj.createdAt;
    } else {
      into.title = obj.data?.title || obj.data?.label || "";
    }
  }
}
function findSessionFiles(root) {
  const best = /* @__PURE__ */ new Map();
  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith(".jsonl.zstd") || e.name.endsWith(".jsonl")) {
        const version = Number(e.name.match(/\.v(\d+)\.jsonl/)?.[1] ?? 0);
        const current = best.get(dir);
        if (!current || version > current.version) best.set(dir, { file: full, version });
      }
    }
  };
  walk(root);
  return [...best.values()].map((b2) => b2.file);
}
var CONCURRENCY = Math.max(1, Math.min(4, os.cpus().length - 1));
var CACHE_VERSION = 3;
var RECENT_MS = 2 * 864e5;
async function parseFile(job) {
  const session = job.base ? structuredClone(job.base) : { id: path.basename(path.dirname(job.file)).replace(/^session-/, ""), title: "", createdAt: job.birthMs, ...zero(), days: {}, models: {} };
  const end = await readSession(job.file, job.from, (data) => parseInto(session, data));
  return { session, end };
}
function createAggregator(options = {}) {
  const cache = loadCache(options.cacheFile);
  let parsed = 0;
  let appended = 0;
  let dirty = false;
  let writeTimer;
  const persist = () => {
    if (!options.cacheFile || !dirty) return;
    dirty = false;
    try {
      fs.mkdirSync(path.dirname(options.cacheFile), { recursive: true });
      const tmp = `${options.cacheFile}.${process.pid}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify({ version: CACHE_VERSION, files: Object.fromEntries(cache) }));
      fs.renameSync(tmp, options.cacheFile);
    } catch (error) {
      console.warn("[token-contribution] could not write the cache:", error.message);
    }
  };
  const schedulePersist = () => {
    dirty = true;
    if (!options.cacheFile || writeTimer !== void 0) return;
    writeTimer = setTimeout(() => {
      writeTimer = void 0;
      persist();
    }, 3e3);
    writeTimer.unref?.();
  };
  let nextId = 0;
  const run = (job) => parseFile(job);
  const load = async (file) => {
    let stat;
    try {
      stat = fs.statSync(file);
    } catch {
      cache.delete(file);
      return null;
    }
    const hit = cache.get(file);
    if (hit && hit.size === stat.size && hit.mtimeMs === stat.mtimeMs) return hit.session;
    const grew = hit !== void 0 && stat.size > hit.size && hit.end > 0 && hit.end <= stat.size;
    try {
      const { session, end } = await run({
        id: nextId++,
        file,
        from: grew ? hit.end : 0,
        base: grew ? hit.session : null,
        birthMs: stat.birthtimeMs || stat.mtimeMs
      });
      if (grew) appended++;
      else parsed++;
      pruneRecent(session, Date.now());
      cache.set(file, { size: stat.size, mtimeMs: stat.mtimeMs, end, session });
      schedulePersist();
      return session;
    } catch (error) {
      console.warn(`[token-contribution] could not read ${file}:`, error.message);
      return null;
    }
  };
  let inFlight;
  return {
    async aggregate(root = path.join(os.homedir(), ".dsh", "sessions"), query = {}) {
      inFlight ??= (async () => {
        try {
          const files = findSessionFiles(root);
          const live = new Set(files);
          for (const key of cache.keys()) if (!live.has(key)) cache.delete(key);
          const loaded = new Array(files.length).fill(null);
          let next = 0;
          await Promise.all(
            Array.from({ length: Math.min(CONCURRENCY, files.length) }, async () => {
              while (next < files.length) {
                const i = next++;
                loaded[i] = await load(files[i]);
              }
            })
          );
          return loaded.filter((s) => s !== null);
        } finally {
          inFlight = void 0;
        }
      })();
      const sessions = await inFlight;
      const range = RANGES.find((r) => r.id === query.range)?.id ?? "all";
      const cut = sessions.map((s) => restrictToRange(s, range, query.now ?? Date.now())).filter((s) => s !== null).map((s) => ({ ...s, title: s.title || `Session ${s.id.slice(0, 8)}` }));
      return { ...summarize(cut), range };
    },
    async flush() {
      if (writeTimer !== void 0) {
        clearTimeout(writeTimer);
        writeTimer = void 0;
      }
      persist();
    },
    stats: () => ({ parsed, appended, cached: cache.size })
  };
}
function loadCache(file) {
  const cache = /* @__PURE__ */ new Map();
  if (!file || !fs.existsSync(file)) return cache;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    if (parsed?.version !== CACHE_VERSION) return cache;
    for (const [k, v] of Object.entries(parsed.files ?? {})) cache.set(k, v);
  } catch (error) {
    console.warn("[token-contribution] cache unreadable, starting empty:", error.message);
  }
  return cache;
}
function pruneRecent(s, now) {
  if (!s.recent) return;
  const oldest = now - RECENT_MS;
  for (const hour of Object.keys(s.recent)) if (Number(hour) + 36e5 < oldest) delete s.recent[hour];
}
function restrictToRange(s, range, now) {
  const spec = RANGES.find((r) => r.id === range);
  if (spec.ms === 0) return s;
  const out = { ...s, ...zero(), days: {}, models: {} };
  if (spec.ms < 864e5) {
    const from = now - spec.ms;
    for (const [hour, models] of Object.entries(s.recent ?? {})) {
      const t = Number(hour);
      if (t + 36e5 <= from || t > now) continue;
      for (const [model, m] of Object.entries(models)) {
        addInto(out.models[model] ??= { ...zero(), provider: m.provider }, m);
        addInto(out.days[dateKey(new Date(t))] ??= zero(), m);
        addInto(out, m);
      }
    }
  } else {
    const days = Math.round(spec.ms / 864e5);
    const first = new Date(now);
    first.setHours(0, 0, 0, 0);
    first.setDate(first.getDate() - (days - 1));
    const fromKey = dateKey(first);
    for (const [day, d] of Object.entries(s.days)) {
      if (day < fromKey) continue;
      addInto(out.days[day] = zero(), d);
      addInto(out, d);
      for (const [model, m] of Object.entries(s.dayModels?.[day] ?? {})) {
        addInto(out.models[model] ??= { ...zero(), provider: m.provider }, m);
      }
    }
  }
  return out.turns > 0 ? out : null;
}
function summarize(sessions) {
  sessions.sort((a, b2) => b2.createdAt - a.createdAt);
  const days = {};
  const models = /* @__PURE__ */ new Map();
  const providers = /* @__PURE__ */ new Map();
  const total = zero();
  for (const s of sessions) {
    for (const [date, d] of Object.entries(s.days)) {
      const day = days[date] ??= { ...zero(), level: 0, sessions: [] };
      addInto(day, d);
      day.sessions.push({ sessionId: s.id, sessionTitle: s.title, createdAt: s.createdAt, ...d });
    }
    for (const [model, m] of Object.entries(s.models)) {
      addInto(models.get(model) ?? models.set(model, { ...zero(), provider: m.provider }).get(model), m);
      addInto(providers.get(m.provider) ?? providers.set(m.provider, zero()).get(m.provider), m);
    }
    addInto(total, s);
  }
  for (const day of Object.values(days)) day.sessions.sort((a, b2) => b2.totalTokens - a.totalTokens);
  const positive = Object.values(days).map((d) => d.totalTokens).filter((t) => t > 0).sort((a, b2) => a - b2);
  let [q1, q2, q3] = [5e6, 25e6, 75e6];
  if (positive.length >= 4) {
    q1 = positive[Math.floor(positive.length * 0.25)];
    q2 = positive[Math.floor(positive.length * 0.5)];
    q3 = positive[Math.floor(positive.length * 0.75)];
  }
  let peakDay = null;
  for (const [date, d] of Object.entries(days)) {
    d.level = d.totalTokens === 0 ? 0 : d.totalTokens <= q1 ? 1 : d.totalTokens <= q2 ? 2 : d.totalTokens <= q3 ? 3 : 4;
    if (!peakDay || d.totalTokens > peakDay.tokens) peakDay = { date, tokens: d.totalTokens, turns: d.turns };
  }
  const pct = (t) => total.totalTokens > 0 ? Math.round(t / total.totalTokens * 1e3) / 10 : 0;
  const modelList = [...models].map(([model, m]) => ({ model, ...m, percentage: pct(m.totalTokens) })).sort((a, b2) => b2.totalTokens - a.totalTokens);
  const providerList = [...providers].map(([provider, p]) => ({ provider, ...p, percentage: pct(p.totalTokens) })).sort((a, b2) => b2.totalTokens - a.totalTokens);
  const active = Object.keys(days).filter((k) => days[k].totalTokens > 0).sort();
  const now = /* @__PURE__ */ new Date();
  const has = (d) => (days[dateKey(d)]?.totalTokens ?? 0) > 0;
  let currentStreak = 0;
  const cursor = new Date(now);
  if (!has(cursor)) cursor.setDate(cursor.getDate() - 1);
  while (has(cursor)) {
    currentStreak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  let longestStreak = 0;
  let run = 0;
  let prev = null;
  for (const k of active) {
    const t = (/* @__PURE__ */ new Date(`${k}T00:00:00`)).getTime();
    run = prev !== null && Math.round((t - prev) / 864e5) === 1 ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
    prev = t;
  }
  const start = new Date(now);
  start.setDate(start.getDate() - 364);
  return {
    summary: {
      ...total,
      activeDays: active.length,
      currentStreak,
      longestStreak: Math.max(longestStreak, currentStreak),
      peakDay,
      dailyAverage: active.length > 0 ? Math.round(total.totalTokens / active.length) : 0
    },
    days,
    sessions,
    models: modelList,
    providers: providerList,
    startDate: dateKey(start),
    endDate: dateKey(now)
  };
}
var shared;
function aggregateTokens(root, query) {
  shared ??= createAggregator({
    cacheFile: path.join(process.env.DSH_HOME ?? path.join(os.homedir(), ".dsh"), "cache", "token-contribution", "sessions.json")
  });
  return shared.aggregate(root, query);
}

// src/server/index.ts
var name = "token-contribution";
var inject = ["webServer"];
var PATHS = /* @__PURE__ */ new Set(["/api/token-contribution", "/api/token-contribution/stats", "/api/dsh-token-heatmap/stats"]);
function apply(ctx) {
  ctx.effect(
    () => ctx.webServer.register({
      kind: "prefix",
      path: "/api/token-contribution",
      handler: async (req, res) => {
        const url = new URL(req.url, "http://localhost");
        const pathname = url.pathname.replace(/\/+$/, "");
        if (req.method !== "GET" || !PATHS.has(pathname)) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Not found" }));
          return;
        }
        try {
          const data = await aggregateTokens(void 0, { range: url.searchParams.get("range") ?? void 0 });
          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-cache" });
          res.end(serializeResponse(data));
        } catch (err) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: err?.message || "Failed to aggregate token stats" }));
        }
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
