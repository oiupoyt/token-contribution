import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, utimesSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir, homedir } from "node:os";
import { execFileSync } from "node:child_process";
import { createAggregator, serializeResponse, expandResponse } from "../src/server/aggregator.ts";


// Session records as DSH writes them: one JSON object per line.
const rec = (o: object) => JSON.stringify(o) + "\n";
const msg = (time: string, usage: object, model = "m1", provider = "p1") =>
  rec({ type: "assistant/message", time, data: { usage, message: { source: { provider, model } } } });

/**
 * Writes a session as DSH does: an append-only file of many zstd frames, one
 * per write. Node's zstd decoder stops after the first frame, which is the
 * trap this fixture exists to catch.
 */
function writeSession(root: string, id: string, lines: string[], version = 4) {
  const dir = join(root, "--ws--", `session-${id}`);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `session.v${version}.jsonl.zstd`);
  for (const line of lines) appendFileSync(file, execFileSync("zstd", ["-q", "-c"], { input: line }));
  return file;
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "tc-"));
  writeSession(root, "a", [
    rec({ type: "session", id: "a", createdAt: Date.parse("2026-11-01T10:00:00") }),
    rec({ type: "session/title", data: { title: "First" } }),
    msg("2026-11-01T10:01:00", { inputTokens: 100, outputTokens: 10, cacheReadTokens: 1000, reasoningTokens: 5 }),
    msg("2026-11-01T10:02:00", { inputTokens: 200, outputTokens: 20, cacheReadTokens: 2000, cacheWriteTokens: 50 }, "m2", "p2"),
    // Compaction re-reports the summarizer call; it must not be counted.
    rec({ type: "compaction/summary", data: { usage: { inputTokens: 999999 } } }),
    msg("2026-11-02T09:00:00", { inputTokens: 300, outputTokens: 30 }),
  ]);
  // A v3 copy of the same session must not be double-counted.
  writeSession(root, "a", [msg("2026-11-01T10:01:00", { inputTokens: 100, outputTokens: 10 })], 3);
  writeSession(root, "b", [
    rec({ type: "session", id: "b", createdAt: Date.parse("2026-11-02T08:00:00") }),
    "{not json\n",
    msg("2026-11-02T08:30:00", { inputTokens: 1, outputTokens: 2, cacheReadTokens: 3, cacheWriteTokens: 4, reasoningTokens: 5 }, "m1", "p2"),
  ]);
  return root;
}

test("every zstd frame is decoded and each token type is summed", async () => {
  const agg = createAggregator();
  const r = await agg.aggregate(fixture());
  assert.equal(r.summary.inputTokens, 601);
  assert.equal(r.summary.outputTokens, 62);
  assert.equal(r.summary.cacheReadTokens, 3003);
  assert.equal(r.summary.cacheWriteTokens, 54);
  assert.equal(r.summary.reasoningTokens, 10);
  assert.equal(r.summary.turns, 4);
  // Total keeps the original definition (input + output + cache read) so the
  // headline number does not change meaning for existing users.
  assert.equal(r.summary.totalTokens, 601 + 62 + 3003);
});

test("per-day, per-session, per-model and per-provider breakdowns", async () => {
  const r = await createAggregator().aggregate(fixture());
  assert.equal(r.days["2026-11-01"].inputTokens, 300);
  assert.equal(r.days["2026-11-01"].cacheWriteTokens, 50);
  assert.equal(r.days["2026-11-02"].turns, 2);
  const a = r.sessions.find((s) => s.id === "a")!;
  assert.equal(a.title, "First");
  assert.equal(a.reasoningTokens, 5);
  assert.equal(r.models.find((m) => m.model === "m2")!.cacheWriteTokens, 50);
  const p2 = r.providers.find((p) => p.provider === "p2")!;
  assert.equal(p2.inputTokens, 201);
  assert.equal(p2.turns, 2);
});

test("a warm call does not re-read unchanged files; a changed file is re-read alone", async () => {
  const root = fixture();
  const agg = createAggregator();
  await agg.aggregate(root);
  assert.equal(agg.stats().parsed, 2);
  await agg.aggregate(root);
  assert.equal(agg.stats().parsed, 2, "unchanged files were parsed again");
  const file = join(root, "--ws--", "session-b", "session.v4.jsonl.zstd");
  appendFileSync(file, execFileSync("zstd", ["-q", "-c"], { input: msg("2026-11-02T08:40:00", { inputTokens: 7 }) }));
  const later = new Date(Date.now() + 5000);
  utimesSync(file, later, later);
  const r = await agg.aggregate(root);
  // Only the grown file was touched, and only its new bytes were read.
  assert.equal(agg.stats().parsed, 2);
  assert.equal(agg.stats().appended, 1);
  assert.equal(r.summary.inputTokens, 608);
});

test("parsed results persist on disk, so a fresh process does not re-read unchanged files", async () => {
  const root = fixture();
  const cacheFile = join(mkdtempSync(join(tmpdir(), "tc-cache-")), "cache.json");
  const first = createAggregator({ cacheFile });
  const a = await first.aggregate(root);
  await first.flush();
  const second = createAggregator({ cacheFile });
  const b = await second.aggregate(root);
  assert.equal(second.stats().parsed, 0, "a restarted aggregator re-parsed unchanged files");
  assert.deepEqual(b.summary, a.summary);
});

test("a file that only grew is read from its previous end, not from the start", async () => {
  const root = fixture();
  const agg = createAggregator();
  await agg.aggregate(root);
  const file = join(root, "--ws--", "session-a", "session.v4.jsonl.zstd");
  appendFileSync(file, execFileSync("zstd", ["-q", "-c"], { input: msg("2026-11-03T09:00:00", { inputTokens: 40, reasoningTokens: 2 }) }));
  const later = new Date(Date.now() + 5000);
  utimesSync(file, later, later);
  const r = await agg.aggregate(root);
  assert.equal(agg.stats().appended, 1, "the grown file was re-read from the beginning");
  assert.equal(r.summary.inputTokens, 641);
  assert.equal(r.summary.reasoningTokens, 12);
  assert.equal(r.days["2026-11-03"].inputTokens, 40);
  // The title and header seen in the first read are kept.
  assert.equal(r.sessions.find((s) => s.id === "a")!.title, "First");
});

test("multi-byte text around records does not shift byte offsets", async () => {
  const root = mkdtempSync(join(tmpdir(), "tc-"));
  writeSession(root, "u", [
    rec({ type: "session", id: "u", createdAt: Date.parse("2026-11-05T10:00:00") }),
    rec({ type: "session/title", data: { title: "中文标题 🎉" } }),
    rec({ type: "user/message", data: { text: "长".repeat(5000) } }),
    msg("2026-11-05T10:01:00", { inputTokens: 11, outputTokens: 1 }),
    rec({ type: "tool/result", data: { text: "😀".repeat(3000) } }),
    msg("2026-11-05T10:02:00", { inputTokens: 22, cacheWriteTokens: 3 }),
  ]);
  const r = await createAggregator().aggregate(root);
  assert.equal(r.summary.inputTokens, 33);
  assert.equal(r.summary.cacheWriteTokens, 3);
  assert.equal(r.sessions[0].title, "中文标题 🎉");
});

test("a partial trailing frame larger than 1 MB is not treated as complete", async () => {
  const root = fixture();
  const file = join(root, "--ws--", "session-b", "session.v4.jsonl.zstd");
  // A record whose compressed frame is several MB (incompressible payload).
  const { randomBytes } = await import("node:crypto");
  const big = rec({ type: "tool/result", data: { blob: randomBytes(3 << 20).toString("base64") } });
  const frame = execFileSync("zstd", ["-q", "-c"], { input: big, maxBuffer: 1 << 28 });
  assert.ok(frame.length > 1 << 20);
  appendFileSync(file, frame.subarray(0, frame.length - 100));
  const agg = createAggregator();
  await agg.aggregate(root);
  // Complete the frame and add a record after it; the resume must pick both up.
  appendFileSync(file, frame.subarray(frame.length - 100));
  appendFileSync(file, execFileSync("zstd", ["-q", "-c"], { input: msg("2026-11-02T09:30:00", { inputTokens: 5 }) }));
  const later = new Date(Date.now() + 5000);
  utimesSync(file, later, later);
  const r = await agg.aggregate(root);
  assert.equal(r.summary.inputTokens, 606, "the record after the large frame was lost");
});

test("a time range keeps only usage inside it, across every breakdown", async () => {
  const root = mkdtempSync(join(tmpdir(), "tc-"));
  const now = Date.parse("2026-11-15T12:00:00");
  const iso = (msAgo: number) => new Date(now - msAgo).toISOString();
  const H = 3_600_000;
  writeSession(root, "r", [
    rec({ type: "session", id: "r", createdAt: now - 40 * 24 * H }),
    msg(iso(30 * 60_000), { inputTokens: 1 }, "m1", "p1"), // 30 min ago
    msg(iso(5 * H), { inputTokens: 10 }, "m2", "p2"), // 5 h ago
    msg(iso(3 * 24 * H), { inputTokens: 100 }, "m1", "p1"), // 3 days ago
    msg(iso(20 * 24 * H), { inputTokens: 1000 }, "m3", "p3"), // 20 days ago
  ]);
  writeSession(root, "old", [
    rec({ type: "session", id: "old", createdAt: now - 60 * 24 * H }),
    msg(iso(60 * 24 * H), { inputTokens: 10000, outputTokens: 1 }, "m4", "p4"),
  ]);
  const agg = createAggregator();
  const at = (range: string) => agg.aggregate(root, { range, now });

  const hour = await at("1h");
  assert.equal(hour.summary.inputTokens, 1);
  assert.deepEqual(hour.models.map((m) => m.model), ["m1"]);
  assert.deepEqual(hour.providers.map((p) => p.provider), ["p1"]);
  assert.deepEqual(hour.sessions.map((s) => s.id), ["r"]);
  assert.equal(hour.sessions[0].inputTokens, 1, "session totals must follow the range");

  assert.equal((await at("24h")).summary.inputTokens, 11);
  assert.equal((await at("7d")).summary.inputTokens, 111);
  assert.equal((await at("30d")).summary.inputTokens, 1111);
  const all = await at("all");
  assert.equal(all.summary.inputTokens, 11111);
  assert.equal(all.sessions.length, 2);
  assert.equal(all.range, "all");

  // Day buckets stay exact: the 3-days-ago request lands on its own date.
  const week = await at("7d");
  const day = new Date(now - 3 * 24 * H);
  const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
  assert.equal(week.days[key].inputTokens, 100);
});

test("an unknown range is treated as all time", async () => {
  const r = await createAggregator().aggregate(fixture(), { range: "bogus" });
  assert.equal(r.summary.inputTokens, 601);
  assert.equal(r.range, "all");
});

test("a cache from another format version is ignored", async () => {
  const root = fixture();
  const cacheFile = join(mkdtempSync(join(tmpdir(), "tc-cache-")), "cache.json");
  writeFileSync(cacheFile, JSON.stringify({ version: -1, files: {} }));
  const agg = createAggregator({ cacheFile });
  const r = await agg.aggregate(root);
  assert.equal(r.summary.inputTokens, 601);
  assert.equal(agg.stats().parsed, 2);
});

test("a truncated trailing frame is skipped and the file is retried next time", async () => {
  const root = fixture();
  const file = join(root, "--ws--", "session-b", "session.v4.jsonl.zstd");
  const frame = execFileSync("zstd", ["-q", "-c"], { input: msg("2026-11-02T08:50:00", { inputTokens: 1000 }) });
  appendFileSync(file, frame.subarray(0, frame.length - 6));
  const agg = createAggregator();
  const r = await agg.aggregate(root);
  assert.equal(r.summary.inputTokens, 601, "partial frame must not be counted");
  assert.equal(r.summary.turns, 4);
});

// Equivalence with the 0.1 aggregator over a frozen copy of the real sessions.
const FROZEN = join(homedir(), ".cache/tc/sessions-frozen");
const TRUTH = join(homedir(), ".cache/tc/ground-truth.json");
test("matches the previous implementation on the real sessions", { skip: !existsSync(TRUTH) }, async () => {
  const truth = JSON.parse(readFileSync(TRUTH, "utf8"));
  const t0 = performance.now();
  const r = await createAggregator().aggregate(FROZEN);
  const ms = performance.now() - t0;
  assert.equal(r.summary.totalTokens, truth.summary.totalTokens);
  assert.equal(r.summary.inputTokens, truth.summary.totalInputTokens);
  assert.equal(r.summary.outputTokens, truth.summary.totalOutputTokens);
  assert.equal(r.summary.cacheReadTokens, truth.summary.totalCacheReadTokens);
  assert.equal(r.summary.turns, truth.summary.totalTurns);
  assert.equal(r.sessions.length, truth.sessions.length);
  for (const [day, d] of Object.entries<any>(truth.days)) {
    assert.equal(r.days[day]?.totalTokens, d.totalTokens, `day ${day}`);
    assert.equal(r.days[day]?.turns, d.turns, `day ${day} turns`);
  }
  // The first read ever decodes ~840 MB of session history (~2.6 s measured on
  // a Ryzen 5 3500U with a browser running). It happens once: the result is
  // persisted, and a restarted host reads that cache in milliseconds.
  assert.ok(ms < 4000, `first-ever aggregate took ${ms.toFixed(0)} ms`);
});

test("frame boundaries cover every real session file exactly", { skip: !existsSync(TRUTH) }, async () => {
  const { zstdFrameLength } = await import("../src/server/aggregator.ts");
  const { readdirSync } = await import("node:fs");
  let files = 0;
  const walk = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".jsonl.zstd")) {
        const buf = readFileSync(p);
        let at = 0;
        while (at < buf.length) {
          const len = zstdFrameLength(buf, at);
          assert.ok(len > 0, `${p}: no complete frame at ${at} of ${buf.length}`);
          at += len;
        }
        assert.equal(at, buf.length, p);
        files++;
      }
    }
  };
  walk(FROZEN);
  assert.ok(files > 300);
});

test("the response for the real sessions stays under 320 KB", { skip: !existsSync(TRUTH) }, async () => {
  const r = await createAggregator().aggregate(FROZEN);
  const wire = serializeResponse(r);
  const kb = wire.length / 1024;
  assert.ok(kb < 320, `response is ${kb.toFixed(0)} KB`);
  // Lossless for everything the client uses: the server-only per-day and
  // per-hour model buckets are the one thing deliberately left off the wire.
  const expected = JSON.parse(JSON.stringify({ ...r, sessions: r.sessions.map(({ recent, dayModels, ...s }) => s) }));
  assert.deepEqual(expandResponse(JSON.parse(wire)), expected);
});

test("parsing the real sessions keeps memory bounded", { skip: !existsSync(TRUTH) }, async () => {
  // Run in a fresh process so other tests' heaps do not count.
  const script = `
    const { createAggregator } = await import(${JSON.stringify(new URL("../src/server/aggregator.ts", import.meta.url).href)});
    let peak = 0;
    const timer = setInterval(() => { peak = Math.max(peak, process.memoryUsage().rss); }, 20);
    await createAggregator().aggregate(${JSON.stringify(FROZEN)});
    clearInterval(timer);
    peak = Math.max(peak, process.memoryUsage().rss);
    console.log(Math.round(peak / 1e6));`;
  const out = execFileSync(process.execPath, ["--experimental-strip-types", "--no-warnings", "--input-type=module", "-e", script]).toString().trim();
  const mb = Number(out.split("\n").pop());
  assert.ok(mb < 300, `peak RSS ${mb} MB`);
});

test("after a host restart the real sessions load from the persisted cache", { skip: !existsSync(TRUTH) }, async () => {
  const cacheFile = join(mkdtempSync(join(tmpdir(), "tc-cache-")), "cache.json");
  const first = createAggregator({ cacheFile });
  const a = await first.aggregate(FROZEN);
  await first.flush();
  const restarted = createAggregator({ cacheFile });
  const t0 = performance.now();
  const b = await restarted.aggregate(FROZEN);
  const ms = performance.now() - t0;
  assert.equal(b.summary.totalTokens, a.summary.totalTokens);
  assert.equal(restarted.stats().parsed, 0);
  assert.ok(ms < 300, `restart load took ${ms.toFixed(0)} ms`);
});

test("a warm call on the real sessions is fast", { skip: !existsSync(TRUTH) }, async () => {
  const agg = createAggregator();
  await agg.aggregate(FROZEN);
  const t0 = performance.now();
  await agg.aggregate(FROZEN);
  const ms = performance.now() - t0;
  assert.ok(ms < 150, `warm aggregate took ${ms.toFixed(0)} ms`);
});
