// Response shape and wire codec, shared by the host and browser halves.
// Browser-safe: no Node imports.

/** Token counts carried by every level of the breakdown. */
export interface TokenCounts {
  /** input + output + cache read: the headline number, unchanged from 0.1. */
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  turns: number;
}

export interface DaySession extends TokenCounts {
  sessionId: string;
  sessionTitle: string;
  createdAt: number;
}

export interface DayStats extends TokenCounts {
  level: number; // 0..4
  sessions: DaySession[];
}

export interface Breakdown extends TokenCounts {
  percentage: number;
}
export interface ModelUsage extends Breakdown {
  model: string;
  provider: string;
}
export interface ProviderUsage extends Breakdown {
  provider: string;
}

export interface SessionSummary extends TokenCounts {
  id: string;
  title: string;
  createdAt: number;
  days: Record<string, TokenCounts>;
  models: Record<string, TokenCounts & { provider: string }>;
  /**
   * Usage per day and model, so a date range can be cut exactly per model.
   * Server-side only; never sent.
   */
  dayModels?: Record<string, Record<string, TokenCounts & { provider: string }>>;
  /**
   * Usage per clock hour (key: epoch ms of the hour start) and model, kept
   * for the most recent days only, for the sub-day ranges. Server-side only.
   */
  recent?: Record<string, Record<string, TokenCounts & { provider: string }>>;
}

/** Time ranges the view offers; `all` is the whole history. */
export const RANGES = [
  { id: "1h", label: "Last hour", ms: 3_600_000 },
  { id: "24h", label: "Last 24 hours", ms: 86_400_000 },
  { id: "7d", label: "Last 7 days", ms: 7 * 86_400_000 },
  { id: "30d", label: "Last 30 days", ms: 30 * 86_400_000 },
  { id: "90d", label: "Last 90 days", ms: 90 * 86_400_000 },
  { id: "365d", label: "Last year", ms: 365 * 86_400_000 },
  { id: "all", label: "All time", ms: 0 },
] as const;
export type RangeId = (typeof RANGES)[number]["id"];

export interface Summary extends TokenCounts {
  activeDays: number;
  currentStreak: number;
  longestStreak: number;
  peakDay: { date: string; tokens: number; turns: number } | null;
  dailyAverage: number;
}

export interface HeatmapResponse {
  summary: Summary;
  days: Record<string, DayStats>;
  sessions: SessionSummary[];
  models: ModelUsage[];
  providers: ProviderUsage[];
  startDate: string;
  endDate: string;
  /** The range this response covers. */
  range: RangeId;
}

/**
 * Serializes a response for the wire. Lossless, and about a fifth smaller:
 * zero counters are omitted (the client defaults them), and each day's session
 * rows carry only the session id, since title and start time are already in
 * `sessions`. `expandResponse` restores the full shape.
 */
export function serializeResponse(r: HeatmapResponse): string {
  const days: Record<string, unknown> = {};
  const sessions = r.sessions.map(({ recent, dayModels, ...rest }) => rest);
  for (const [date, d] of Object.entries(r.days)) {
    days[date] = { ...d, sessions: d.sessions.map(({ sessionTitle, createdAt, ...rest }) => rest) };
  }
  return JSON.stringify({ ...r, sessions, days }, (_k, v) => (v === 0 ? undefined : v));
}

const COUNT_KEYS: (keyof TokenCounts)[] = [
  "totalTokens", "inputTokens", "outputTokens", "reasoningTokens", "cacheReadTokens", "cacheWriteTokens", "turns",
];
const fill = <T extends object>(o: T): T => {
  for (const k of COUNT_KEYS) if ((o as any)[k] === undefined) (o as any)[k] = 0;
  return o;
};

/** Inverse of `serializeResponse`; shared with the browser half. */
export function expandResponse(raw: any): HeatmapResponse {
  const sessions: SessionSummary[] = (raw.sessions ?? []).map((s: any) => {
    fill(s);
    s.createdAt ??= 0;
    for (const d of Object.values<any>(s.days ?? {})) fill(d);
    for (const m of Object.values<any>(s.models ?? {})) fill(m);
    return s;
  });
  const byId = new Map(sessions.map((s) => [s.id, s]));
  for (const d of Object.values<any>(raw.days ?? {})) {
    fill(d);
    d.level ??= 0;
    d.sessions = (d.sessions ?? []).map((row: any) => {
      const s = byId.get(row.sessionId);
      return fill({ ...row, sessionTitle: s?.title ?? row.sessionId, createdAt: s?.createdAt ?? 0 });
    });
  }
  for (const m of raw.models ?? []) fill(m), (m.percentage ??= 0);
  for (const p of raw.providers ?? []) fill(p), (p.percentage ??= 0);
  fill(raw.summary);
  raw.summary.activeDays ??= 0;
  raw.summary.currentStreak ??= 0;
  raw.summary.longestStreak ??= 0;
  raw.summary.dailyAverage ??= 0;
  raw.summary.peakDay ??= null;
  if (raw.summary.peakDay) raw.summary.peakDay.tokens ??= 0, (raw.summary.peakDay.turns ??= 0);
  raw.sessions = sessions;
  raw.providers ??= [];
  raw.models ??= [];
  raw.range ??= "all";
  return raw as HeatmapResponse;
}
