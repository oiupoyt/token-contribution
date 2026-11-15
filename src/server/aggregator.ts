import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import zlib from "node:zlib";
import { execFileSync, spawn } from "node:child_process";
import type { DayStats, HeatmapResponse, ModelUsage, ProviderUsage, SessionSummary, Summary, TokenCounts } from "../shared/types.ts";

export * from "../shared/types.ts";

const zero = (): TokenCounts => ({
  totalTokens: 0,
  inputTokens: 0,
  outputTokens: 0,
  reasoningTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  turns: 0,
});

function addInto(into: TokenCounts, from: TokenCounts) {
  into.totalTokens += from.totalTokens;
  into.inputTokens += from.inputTokens;
  into.outputTokens += from.outputTokens;
  into.reasoningTokens += from.reasoningTokens;
  into.cacheReadTokens += from.cacheReadTokens;
  into.cacheWriteTokens += from.cacheWriteTokens;
  into.turns += from.turns;
}

const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// ---------------------------------------------------------------- decoding

const ZSTD_MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd]);

/**
 * Decodes an append-only DSH session file: many zstd frames, one per write.
 *
 * Node's zstd decoder stops after the first frame, which would silently drop
 * almost every record, so frames are decoded one at a time. Frame boundaries
 * come from `zstdFrameLength`; a trailing frame that is still being written
 * stops the read, and the returned offset is where the next read resumes.
 *
 * Each frame is handed to `onFrame` and then released: DSH writes whole lines
 * per frame, so holding the whole decoded file is never necessary.
 */
export function decodeZstdFrames(buf: Buffer, from: number, onFrame: (data: Buffer) => void): number {
  let off = from;
  // Bytes of a line that a frame left unfinished; joined with the next frame.
  let carry: Buffer | undefined;
  while (off < buf.length) {
    const len = zstdFrameLength(buf, off);
    if (len <= 0) break; // partial trailing frame: resume here next time
    let data = zlib.zstdDecompressSync(buf.subarray(off, off + len));
    off += len;
    if (carry) data = Buffer.concat([carry, data]);
    const last = data.lastIndexOf(10);
    if (last === data.length - 1) {
      carry = undefined;
      onFrame(data);
    } else {
      carry = data.subarray(last + 1);
      if (last >= 0) onFrame(data.subarray(0, last + 1));
    }
  }
  if (carry) onFrame(carry);
  return off;
}

/**
 * Streams a whole zstd file through the `zstd` CLI, passing chunks of whole
 * lines to `onChunk`. Measured on 205 MB of sessions: four of these in
 * parallel decode everything in ~2 s at ~100 MB peak, against ~6 s and
 * ~2.5 GB for in-process frame-by-frame decoding.
 */
function streamZstd(file: string, onChunk: (data: Buffer) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("zstd", ["-dcq", file], { stdio: ["ignore", "pipe", "pipe"] });
    let carry: Buffer | undefined;
    let stderr = "";
    proc.stdout.on("data", (chunk: Buffer) => {
      const data = carry ? Buffer.concat([carry, chunk]) : chunk;
      const last = data.lastIndexOf(10);
      if (last === -1) {
        carry = data;
        return;
      }
      carry = last === data.length - 1 ? undefined : data.subarray(last + 1);
      onChunk(data.subarray(0, last + 1));
    });
    proc.stderr.on("data", (c: Buffer) => (stderr += c.toString()));
    proc.on("error", reject);
    proc.on("close", (code) => {
      // A truncated trailing frame (file mid-write) makes zstd exit non-zero
      // after emitting every complete frame; the complete lines still count.
      if (carry && carry[0] === 0x7b) onChunk(carry);
      if (code === 0 || /truncated|unexpected end|premature/i.test(stderr)) resolve();
      else reject(new Error(stderr.trim() || `zstd exited ${code}`));
    });
  });
}

let hasZstdCli: boolean | undefined;
function zstdCliAvailable(): boolean {
  if (hasZstdCli === undefined) {
    try {
      execFileSync("zstd", ["--version"], { stdio: "ignore" });
      hasZstdCli = true;
    } catch {
      hasZstdCli = false;
    }
  }
  return hasZstdCli;
}

/**
 * Reads a session file from byte `from`, passing decoded chunks of whole lines
 * to `onChunk`; resolves to the offset a later read resumes from.
 *
 * A full read streams through the zstd CLI. A resumed read (only the frames
 * appended since last time, usually a few KB) decodes in-process, because the
 * CLI cannot start mid-file.
 */
export async function readSession(file: string, from: number, onChunk: (data: Buffer) => void): Promise<number> {
  if (!file.endsWith(".zstd")) {
    const buf = fs.readFileSync(file);
    // Plain JSONL: resume at the last complete line.
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

/**
 * Byte length of the zstd frame starting at `at`, or -1 if the buffer ends
 * before the frame does (a frame still being written).
 *
 * Walks the frame structure (header, block headers, checksum) instead of
 * trying to decode: Node's decoder returns the bytes it could decode from a
 * truncated frame without throwing, so a decode attempt cannot tell a
 * partial frame from a complete one.
 */
export function zstdFrameLength(buf: Buffer, at: number): number {
  if (at + 6 > buf.length || buf.readUInt32LE(at) !== 0xfd2fb528) return -1;
  const fhd = buf[at + 4];
  const fcsFlag = fhd >> 6;
  const singleSegment = (fhd >> 5) & 1;
  const hasChecksum = (fhd >> 2) & 1;
  const dictIdFlag = fhd & 3;
  const fcsSize = fcsFlag === 0 ? singleSegment : [1, 2, 4, 8][fcsFlag];
  let p = at + 5 + (singleSegment ? 0 : 1) + [0, 1, 2, 4][dictIdFlag] + fcsSize;
  for (;;) {
    if (p + 3 > buf.length) return -1;
    const header = buf[p] | (buf[p + 1] << 8) | (buf[p + 2] << 16);
    const last = header & 1;
    const type = (header >> 1) & 3;
    const size = header >>> 3;
    // Raw and compressed blocks carry `size` bytes; an RLE block carries one.
    p += 3 + (type === 1 ? 1 : size);
    if (p > buf.length) return -1;
    if (last) break;
  }
  if (hasChecksum) p += 4;
  return p > buf.length ? -1 : p - at;
}

/** Where the complete frames end: the offset a resumed read starts from. */
function endOfCompleteFrames(file: string, size: number): number {
  const buf = fs.readFileSync(file);
  let at = 0;
  while (at < size) {
    const len = zstdFrameLength(buf, at);
    if (len <= 0) return at;
    at += len;
  }
  return at;
}

// ---------------------------------------------------------------- parsing

const b = (s: string) => Buffer.from(s, "utf8");
const ASSISTANT = b('{"type":"assistant/message"');
const SESSION = b('{"type":"session"');
const SESSION_CHILD = b('{"type":"session/');
const TITLE = b('{"type":"session/title"');
const DESCRIPTOR = b('{"type":"subagent/descriptor"');
const USAGE = b('"usage":{');
const SOURCE = b('"source":{');

const startsAt = (buf: Buffer, at: number, prefix: Buffer) =>
  buf.length - at >= prefix.length && buf.compare(prefix, 0, prefix.length, at, at + prefix.length) === 0;

/**
 * Folds the records in a decoded session buffer into `into`.
 *
 * Works on bytes, not a decoded string: session files hold hundreds of MB of
 * message content and tool output that is never needed, and turning all of it
 * into UTF-16 costs more than the decode itself. Only the small slices that
 * matter (usage, time, source, header, title) are converted.
 */
export function parseInto(into: SessionSummary, buf: Buffer) {
  let start = 0;
  while (start < buf.length) {
    let end = buf.indexOf(10, start);
    if (end === -1) end = buf.length;
    const lineStart = start;
    start = end + 1;

    if (startsAt(buf, lineStart, ASSISTANT)) {
      const usageAt = buf.indexOf(USAGE, lineStart);
      if (usageAt === -1 || usageAt > end) continue;
      const usageEnd = buf.indexOf(0x7d, usageAt); // }
      if (usageEnd === -1 || usageEnd > end) continue;
      let usage: any;
      try {
        usage = JSON.parse(buf.toString("utf8", usageAt + 8, usageEnd + 1));
      } catch {
        continue;
      }
      // `time` is a top-level key within the first few fields (after `seq`).
      const head = buf.toString("utf8", lineStart, Math.min(end, lineStart + 80));
      let time = Number(/^\{"type":"assistant\/message"(?:,"seq":\d+)?,"time":(\d+)[,}]/.exec(head)?.[1]) || 0;
      if (!time) {
        try {
          const obj = JSON.parse(buf.toString("utf8", lineStart, end));
          const t = new Date(obj.time ?? obj.data?.time).getTime();
          time = Number.isFinite(t) ? t : 0;
        } catch {
          time = 0;
        }
      }
      if (!time) continue;
      // DSH writes `message.source` before `usage`; look there first.
      const sourceAt = buf.indexOf(SOURCE, lineStart);
      const scope =
        sourceAt !== -1 && sourceAt < end
          ? buf.toString("utf8", sourceAt, Math.min(end, sourceAt + 400))
          : buf.toString("utf8", lineStart, Math.min(end, usageAt));
      const provider = /"provider":"([^"]*)"/.exec(scope)?.[1] ?? "unknown";
      const model = /"model":"([^"]*)"/.exec(scope)?.[1] ?? "unknown";
      const input = Number(usage.inputTokens) || 0;
      const output = Number(usage.outputTokens) || 0;
      const cacheRead = Number(usage.cacheReadTokens) || 0;
      const row: TokenCounts = {
        totalTokens: input + output + cacheRead,
        inputTokens: input,
        outputTokens: output,
        reasoningTokens: Number(usage.reasoningTokens) || 0,
        cacheReadTokens: cacheRead,
        cacheWriteTokens: Number(usage.cacheWriteTokens) || 0,
        turns: 1,
      };
      addInto((into.days[dateKey(new Date(time))] ??= zero()), row);
      addInto((into.models[model] ??= { ...zero(), provider }), row);
      addInto(into, row);
      continue;
    }

    // Only the session header and the first title record are read; every
    // other record is skipped without being converted.
    const isHeader = startsAt(buf, lineStart, SESSION) && !startsAt(buf, lineStart, SESSION_CHILD);
    const isTitle = !into.title && (startsAt(buf, lineStart, TITLE) || startsAt(buf, lineStart, DESCRIPTOR));
    if (!isHeader && !isTitle) continue;
    let obj: any;
    try {
      obj = JSON.parse(buf.toString("utf8", lineStart, end));
    } catch {
      continue; // malformed line: header keeps the directory id, a later title may follow
    }
    if (isHeader) {
      if (obj.id) into.id = obj.id;
      if (obj.createdAt) into.createdAt = obj.createdAt;
    } else {
      into.title = obj.data?.title || obj.data?.label || "";
    }
  }
}

/**
 * One session file per directory: DSH keeps a migrated copy (v3 beside v4)
 * holding the same records, so only the highest version is read.
 */
function findSessionFiles(root: string): string[] {
  const best = new Map<string, { file: string; version: number }>();
  const walk = (dir: string) => {
    let entries: fs.Dirent[];
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
  return [...best.values()].map((b) => b.file);
}

// ---------------------------------------------------------------- aggregation

/** Files decoded at once on a cold start. */
const CONCURRENCY = Math.max(1, Math.min(4, os.cpus().length - 1));

/** Bump when the cached session shape or parsing rules change. */
const CACHE_VERSION = 2;

interface CacheEntry {
  size: number;
  mtimeMs: number;
  /** Byte offset the next read resumes from (files are append-only). */
  end: number;
  session: SessionSummary;
}

export interface Aggregator {
  aggregate(root?: string): Promise<HeatmapResponse>;
  flush(): Promise<void>;
  stats(): { parsed: number; appended: number; cached: number };
}

export interface AggregatorOptions {
  /** Persist parsed sessions here so a restarted host does not re-read them. */
  cacheFile?: string;
}

/** One unit of parsing work: a whole file, or the bytes appended since `from`. */
export interface ParseJob {
  id: number;
  file: string;
  from: number;
  base: SessionSummary | null;
  birthMs: number;
}

/** Reads and parses one file. Pure: safe to run in a worker thread. */
export async function parseFile(job: ParseJob): Promise<{ session: SessionSummary; end: number }> {
  const session: SessionSummary = job.base
    ? structuredClone(job.base)
    : { id: path.basename(path.dirname(job.file)).replace(/^session-/, ""), title: "", createdAt: job.birthMs, ...zero(), days: {}, models: {} };
  const end = await readSession(job.file, job.from, (data) => parseInto(session, data));
  return { session, end };
}

export function createAggregator(options: AggregatorOptions = {}): Aggregator {
  const cache = loadCache(options.cacheFile);
  let parsed = 0;
  let appended = 0;
  let dirty = false;
  let writeTimer: ReturnType<typeof setTimeout> | undefined;

  const persist = () => {
    if (!options.cacheFile || !dirty) return;
    dirty = false;
    try {
      fs.mkdirSync(path.dirname(options.cacheFile), { recursive: true });
      const tmp = `${options.cacheFile}.${process.pid}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify({ version: CACHE_VERSION, files: Object.fromEntries(cache) }));
      fs.renameSync(tmp, options.cacheFile);
    } catch (error) {
      console.warn("[token-contribution] could not write the cache:", (error as Error).message);
    }
  };
  const schedulePersist = () => {
    dirty = true;
    if (!options.cacheFile || writeTimer !== undefined) return;
    writeTimer = setTimeout(() => {
      writeTimer = undefined;
      persist();
    }, 3000);
    writeTimer.unref?.();
  };

  let nextId = 0;
  // Decoding happens in zstd child processes, so the host's event loop only
  // scans bytes; a few files run at once to use more than one core.
  const run = (job: ParseJob) => parseFile(job);

  const load = async (file: string): Promise<SessionSummary | null> => {
    let stat: fs.Stats;
    try {
      stat = fs.statSync(file);
    } catch {
      cache.delete(file);
      return null;
    }
    const hit = cache.get(file);
    if (hit && hit.size === stat.size && hit.mtimeMs === stat.mtimeMs) return hit.session;
    // Session files only ever grow. When this one did, decode just the new
    // frames and fold them into the cached totals.
    const grew = hit !== undefined && stat.size > hit.size && hit.end > 0 && hit.end <= stat.size;
    try {
      const { session, end } = await run({
        id: nextId++,
        file,
        from: grew ? hit!.end : 0,
        base: grew ? hit!.session : null,
        birthMs: stat.birthtimeMs || stat.mtimeMs,
      });
      if (grew) appended++;
      else parsed++;
      cache.set(file, { size: stat.size, mtimeMs: stat.mtimeMs, end, session });
      schedulePersist();
      return session;
    } catch (error) {
      console.warn(`[token-contribution] could not read ${file}:`, (error as Error).message);
      return null;
    }
  };

  // Concurrent requests (the page and the in-session meter) share one pass.
  let inFlight: Promise<HeatmapResponse> | undefined;

  return {
    aggregate(root = path.join(os.homedir(), ".dsh", "sessions")) {
      inFlight ??= (async () => {
        try {
          const files = findSessionFiles(root);
          const live = new Set(files);
          for (const key of cache.keys()) if (!live.has(key)) cache.delete(key);
          const loaded: (SessionSummary | null)[] = new Array(files.length).fill(null);
          let next = 0;
          await Promise.all(
            Array.from({ length: Math.min(CONCURRENCY, files.length) }, async () => {
              while (next < files.length) {
                const i = next++;
                loaded[i] = await load(files[i]);
              }
            }),
          );
          const sessions = loaded.filter((s): s is SessionSummary => s !== null);
          return summarize(sessions.map((s) => ({ ...s, title: s.title || `Session ${s.id.slice(0, 8)}` })));
        } finally {
          inFlight = undefined;
        }
      })();
      return inFlight;
    },
    async flush() {
      if (writeTimer !== undefined) {
        clearTimeout(writeTimer);
        writeTimer = undefined;
      }
      persist();
    },
    stats: () => ({ parsed, appended, cached: cache.size }),
  };
}

function loadCache(file: string | undefined): Map<string, CacheEntry> {
  const cache = new Map<string, CacheEntry>();
  if (!file || !fs.existsSync(file)) return cache;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    if (parsed?.version !== CACHE_VERSION) return cache;
    for (const [k, v] of Object.entries<CacheEntry>(parsed.files ?? {})) cache.set(k, v);
  } catch (error) {
    console.warn("[token-contribution] cache unreadable, starting empty:", (error as Error).message);
  }
  return cache;
}

function summarize(sessions: SessionSummary[]): HeatmapResponse {
  sessions.sort((a, b) => b.createdAt - a.createdAt);

  const days: Record<string, DayStats> = {};
  const models = new Map<string, TokenCounts & { provider: string }>();
  const providers = new Map<string, TokenCounts>();
  const total = zero();

  for (const s of sessions) {
    for (const [date, d] of Object.entries(s.days)) {
      const day = (days[date] ??= { ...zero(), level: 0, sessions: [] });
      addInto(day, d);
      day.sessions.push({ sessionId: s.id, sessionTitle: s.title, createdAt: s.createdAt, ...d });
    }
    for (const [model, m] of Object.entries(s.models)) {
      addInto(models.get(model) ?? models.set(model, { ...zero(), provider: m.provider }).get(model)!, m);
      addInto(providers.get(m.provider) ?? providers.set(m.provider, zero()).get(m.provider)!, m);
    }
    addInto(total, s);
  }
  for (const day of Object.values(days)) day.sessions.sort((a, b) => b.totalTokens - a.totalTokens);

  // Intensity levels from the quartiles of active days.
  const positive = Object.values(days).map((d) => d.totalTokens).filter((t) => t > 0).sort((a, b) => a - b);
  let [q1, q2, q3] = [5_000_000, 25_000_000, 75_000_000];
  if (positive.length >= 4) {
    q1 = positive[Math.floor(positive.length * 0.25)];
    q2 = positive[Math.floor(positive.length * 0.5)];
    q3 = positive[Math.floor(positive.length * 0.75)];
  }
  let peakDay: Summary["peakDay"] = null;
  for (const [date, d] of Object.entries(days)) {
    d.level = d.totalTokens === 0 ? 0 : d.totalTokens <= q1 ? 1 : d.totalTokens <= q2 ? 2 : d.totalTokens <= q3 ? 3 : 4;
    if (!peakDay || d.totalTokens > peakDay.tokens) peakDay = { date, tokens: d.totalTokens, turns: d.turns };
  }

  const pct = (t: number) => (total.totalTokens > 0 ? Math.round((t / total.totalTokens) * 1000) / 10 : 0);
  const modelList: ModelUsage[] = [...models]
    .map(([model, m]) => ({ model, ...m, percentage: pct(m.totalTokens) }))
    .sort((a, b) => b.totalTokens - a.totalTokens);
  const providerList: ProviderUsage[] = [...providers]
    .map(([provider, p]) => ({ provider, ...p, percentage: pct(p.totalTokens) }))
    .sort((a, b) => b.totalTokens - a.totalTokens);

  const active = Object.keys(days).filter((k) => days[k].totalTokens > 0).sort();
  const now = new Date();
  const has = (d: Date) => (days[dateKey(d)]?.totalTokens ?? 0) > 0;

  // Current streak: counted back from today, or from yesterday if today is empty.
  let currentStreak = 0;
  const cursor = new Date(now);
  if (!has(cursor)) cursor.setDate(cursor.getDate() - 1);
  while (has(cursor)) {
    currentStreak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  let longestStreak = 0;
  let run = 0;
  let prev: number | null = null;
  for (const k of active) {
    const t = new Date(`${k}T00:00:00`).getTime();
    run = prev !== null && Math.round((t - prev) / 86_400_000) === 1 ? run + 1 : 1;
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
      dailyAverage: active.length > 0 ? Math.round(total.totalTokens / active.length) : 0,
    },
    days,
    sessions,
    models: modelList,
    providers: providerList,
    startDate: dateKey(start),
    endDate: dateKey(now),
  };
}

/** Process-wide aggregator, so the cache survives across requests. */
let shared: Aggregator | undefined;
export function aggregateTokens(root?: string): Promise<HeatmapResponse> {
  shared ??= createAggregator({
    cacheFile: path.join(process.env.DSH_HOME ?? path.join(os.homedir(), ".dsh"), "cache", "token-contribution", "sessions.json"),
  });
  return shared.aggregate(root);
}
