/**
 * Client-side benchmark runner for the /api/analyze pipeline.
 *
 * Runs the orchestrator N times against the same payload, captures
 * client-side wall-clock latency AND the server-reported per-stage timings
 * (`timings_ms`), then computes p50/p95/p99/min/max/avg both globally and
 * per phase. The result powers the /pathfinder/perf dashboard.
 *
 * No server changes required — this lives entirely in the browser, so
 * judges see real network + serialization cost, not just internal stopwatch
 * numbers.
 */

import {
  pathfinderApi,
  PathFinderApiError,
} from "./api";
import type { AnalyzeRequest, AnalyzeResponse } from "./types";

export type BenchmarkPhase =
  | "extract"
  | "embed"
  | "gap"
  | "paths"
  | "proof"
  | "similar"
  | "courses"
  | "salary";

export const BENCHMARK_PHASES: BenchmarkPhase[] = [
  "extract",
  "embed",
  "gap",
  "paths",
  "proof",
  "similar",
  "courses",
  "salary",
];

export interface BenchmarkRunRecord {
  index: number;
  /** True wall-clock latency from the browser, including network + serdes. */
  client_total_ms: number;
  /** Server-reported total (timings_ms.total). */
  server_total_ms: number;
  /** Server-reported per-phase breakdown. */
  phases: Record<BenchmarkPhase, number>;
  /** True if the request succeeded. Failed runs still record `client_total_ms`. */
  ok: boolean;
  /** Error message when `ok === false`. */
  error?: string;
}

export interface PercentileStats {
  count: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
}

export interface BenchmarkSummary {
  /** Wall-clock latency observed in the browser. */
  client: PercentileStats;
  /** Server-reported `timings_ms.total`. */
  server: PercentileStats;
  /** Per-phase server-reported timings. */
  phases: Record<BenchmarkPhase, PercentileStats>;
  /** Implied browser overhead (client - server) percentiles. */
  network_overhead: PercentileStats;
}

export interface BenchmarkResult {
  runs: BenchmarkRunRecord[];
  summary: BenchmarkSummary;
  /** Successful run count — denominator for warm-cache narratives. */
  ok_count: number;
  /** Total wall-clock duration of the whole benchmark (sum of client_total_ms). */
  wall_time_ms: number;
}

export interface BenchmarkOptions {
  payload: AnalyzeRequest;
  runs: number;
  /** Cooling-down between requests, ms. Defaults to 250 to reduce burst load. */
  cooldown_ms?: number;
  /** Discard the first N runs as warm-up before computing stats. Default 0. */
  warmup_runs?: number;
  onProgress?: (record: BenchmarkRunRecord, completedCount: number) => void;
  signal?: AbortSignal;
}

/**
 * Compute min/max/avg/p50/p95/p99 over a numeric array.
 * Uses linear interpolation on sorted samples. Empty input → all zeros.
 */
export function computePercentiles(samples: number[]): PercentileStats {
  if (samples.length === 0) {
    return { count: 0, min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 };
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const at = (q: number): number => {
    if (sorted.length === 1) return sorted[0]!;
    const idx = q * (sorted.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo]!;
    const frac = idx - lo;
    return sorted[lo]! * (1 - frac) + sorted[hi]! * frac;
  };
  const sum = sorted.reduce((s, n) => s + n, 0);
  return {
    count: sorted.length,
    min: sorted[0]!,
    max: sorted[sorted.length - 1]!,
    avg: sum / sorted.length,
    p50: at(0.5),
    p95: at(0.95),
    p99: at(0.99),
  };
}

const EMPTY_PHASES: Record<BenchmarkPhase, number> = Object.fromEntries(
  BENCHMARK_PHASES.map((p) => [p, 0]),
) as Record<BenchmarkPhase, number>;

function timingsFromResponse(res: AnalyzeResponse): {
  total: number;
  phases: Record<BenchmarkPhase, number>;
} {
  const t = res.timings_ms;
  return {
    total: t.total,
    phases: {
      extract: t.extract,
      embed: t.embed,
      gap: t.gap,
      paths: t.paths,
      proof: t.proof,
      similar: t.similar,
      courses: t.courses,
      salary: t.salary,
    },
  };
}

async function delay(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    if (signal) {
      const onAbort = () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      };
      if (signal.aborted) onAbort();
      else signal.addEventListener("abort", onAbort, { once: true });
    }
  });
}

/**
 * Execute a benchmark.
 *
 * Important: runs are sequential, not parallel. We want to characterise
 * single-request latency under realistic conditions, not throughput.
 */
export async function runBenchmark(
  options: BenchmarkOptions,
): Promise<BenchmarkResult> {
  const {
    payload,
    runs,
    cooldown_ms = 250,
    warmup_runs = 0,
    onProgress,
    signal,
  } = options;

  if (runs <= 0) throw new Error("runs must be > 0");

  const records: BenchmarkRunRecord[] = [];
  const wallStart = performance.now();

  for (let i = 0; i < runs; i++) {
    if (signal?.aborted) break;

    const t0 = performance.now();
    let record: BenchmarkRunRecord;
    try {
      const res = await pathfinderApi.analyze(payload);
      const elapsed = performance.now() - t0;
      const { total, phases } = timingsFromResponse(res);
      record = {
        index: i,
        client_total_ms: Math.round(elapsed),
        server_total_ms: total,
        phases,
        ok: true,
      };
    } catch (err) {
      const elapsed = performance.now() - t0;
      const message =
        err instanceof PathFinderApiError
          ? err.message
          : (err as Error).message ?? "Unknown error";
      record = {
        index: i,
        client_total_ms: Math.round(elapsed),
        server_total_ms: 0,
        phases: { ...EMPTY_PHASES },
        ok: false,
        error: message,
      };
    }

    records.push(record);
    onProgress?.(record, records.length);

    if (i < runs - 1 && cooldown_ms > 0) {
      try {
        await delay(cooldown_ms, signal);
      } catch {
        break;
      }
    }
  }

  const wallTime = performance.now() - wallStart;
  const sample = records.slice(warmup_runs).filter((r) => r.ok);

  const client = computePercentiles(sample.map((r) => r.client_total_ms));
  const server = computePercentiles(sample.map((r) => r.server_total_ms));
  const phasesStats = Object.fromEntries(
    BENCHMARK_PHASES.map((p) => [
      p,
      computePercentiles(sample.map((r) => r.phases[p])),
    ]),
  ) as Record<BenchmarkPhase, PercentileStats>;
  const network = computePercentiles(
    sample.map((r) => Math.max(0, r.client_total_ms - r.server_total_ms)),
  );

  return {
    runs: records,
    ok_count: records.filter((r) => r.ok).length,
    wall_time_ms: Math.round(wallTime),
    summary: {
      client,
      server,
      phases: phasesStats,
      network_overhead: network,
    },
  };
}
