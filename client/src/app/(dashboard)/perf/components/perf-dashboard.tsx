"use client";

import * as React from "react";
import {
  Activity,
  AlertTriangle,
  Database,
  Gauge,
  Network,
  Play,
  Square,
  Timer,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTranslations } from "@/contexts/locale-context";
import {
  BENCHMARK_PHASES,
  runBenchmark,
  type BenchmarkPhase,
  type BenchmarkResult,
  type BenchmarkRunRecord,
  type PercentileStats,
} from "@/lib/pathfinder/benchmark";
import { DEMO_PERSONAS, type DemoPersona } from "../../pathfinder/sample-cv";

const RUN_PRESETS = [3, 5, 10, 20] as const;

type Phase = "idle" | "running" | "done" | "error";

export function PerfDashboard() {
  const t = useTranslations();
  const [persona, setPersona] = React.useState<DemoPersona>(DEMO_PERSONAS[0]!);
  const [runCount, setRunCount] = React.useState<number>(5);
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [progressRecords, setProgressRecords] = React.useState<
    BenchmarkRunRecord[]
  >([]);
  const [result, setResult] = React.useState<BenchmarkResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  const start = React.useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setPhase("running");
    setProgressRecords([]);
    setResult(null);
    setError(null);
    try {
      const res = await runBenchmark({
        payload: {
          cv_text: persona.cv_text,
          target_role: persona.target_role,
        },
        runs: runCount,
        cooldown_ms: 250,
        signal: ctrl.signal,
        onProgress: (record) => {
          setProgressRecords((prev) => [...prev, record]);
        },
      });
      setResult(res);
      setPhase("done");
    } catch (err) {
      if (ctrl.signal.aborted) {
        setPhase("idle");
      } else {
        setError((err as Error).message ?? "Unknown error");
        setPhase("error");
      }
    }
  }, [persona, runCount]);

  const stop = React.useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setPhase("idle");
  }, []);

  const completed = progressRecords.length;
  const progressPct =
    phase === "running" && runCount > 0
      ? Math.min(100, (completed / runCount) * 100)
      : phase === "done"
        ? 100
        : 0;

  return (
    <div className="flex flex-col gap-4">
      <RunCard
        persona={persona}
        onPersonaChange={setPersona}
        runCount={runCount}
        onRunCountChange={setRunCount}
        phase={phase}
        completed={completed}
        progressPct={progressPct}
        onStart={start}
        onStop={stop}
        error={error}
      />

      {phase === "running" || phase === "done" ? (
        <LiveStreamCard records={progressRecords} totalRuns={runCount} />
      ) : null}

      {result && phase === "done" ? <SummaryCards result={result} /> : null}
      {result && phase === "done" ? <PhaseBreakdownCard result={result} /> : null}
      {result && phase === "done" ? <RawRunsTable result={result} /> : null}

      {phase === "idle" && !result ? <EmptyHint /> : null}
      {!result && phase !== "running" ? <ContextHint /> : null}
    </div>
  );
}

// ─── Run card ──────────────────────────────────────────────────────────────

interface RunCardProps {
  persona: DemoPersona;
  onPersonaChange: (p: DemoPersona) => void;
  runCount: number;
  onRunCountChange: (n: number) => void;
  phase: Phase;
  completed: number;
  progressPct: number;
  onStart: () => void;
  onStop: () => void;
  error: string | null;
}

function RunCard({
  persona,
  onPersonaChange,
  runCount,
  onRunCountChange,
  phase,
  completed,
  progressPct,
  onStart,
  onStop,
  error,
}: RunCardProps) {
  const t = useTranslations();
  const running = phase === "running";

  return (
    <Card>
      <CardHeader>
        <CardDescription className="flex items-center gap-2">
          <Activity className="size-3.5" />
          {t("perf.run.description")}
        </CardDescription>
        <CardTitle className="text-base">{t("perf.run.title")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("perf.run.subtitle")}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("perf.run.persona")}
            </span>
            <div className="flex flex-wrap gap-2">
              {DEMO_PERSONAS.map((p) => (
                <Button
                  key={p.id}
                  size="sm"
                  variant={p.id === persona.id ? "default" : "outline"}
                  onClick={() => onPersonaChange(p)}
                  disabled={running}
                  className="gap-1"
                  title={p.pivot}
                >
                  {p.name}
                  <span className="text-[10px] text-muted-foreground">
                    · {p.pivot}
                  </span>
                </Button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("perf.run.runs")}
            </span>
            <div className="flex flex-wrap gap-2">
              {RUN_PRESETS.map((n) => (
                <Button
                  key={n}
                  size="sm"
                  variant={n === runCount ? "default" : "outline"}
                  onClick={() => onRunCountChange(n)}
                  disabled={running}
                  className="font-mono"
                >
                  {n}×
                </Button>
              ))}
            </div>
          </div>
        </div>

        <Separator />

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-muted-foreground">
              {running
                ? t("perf.run.progress", { done: completed, total: runCount })
                : phase === "done"
                  ? t("perf.run.done")
                  : t("perf.run.idle")}
            </span>
            <div className="flex gap-2">
              {running ? (
                <Button size="sm" variant="outline" onClick={onStop}>
                  <Square className="size-3.5" />
                  {t("perf.run.stop")}
                </Button>
              ) : (
                <Button size="sm" onClick={onStart}>
                  <Play className="size-3.5" />
                  {t("perf.run.start", { runs: runCount })}
                </Button>
              )}
            </div>
          </div>
          <Progress value={progressPct} className="h-1.5" />
        </div>

        {error ? (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertTriangle className="size-4" />
            <p className="text-xs">{error}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ─── Live stream card ──────────────────────────────────────────────────────

interface LiveStreamProps {
  records: BenchmarkRunRecord[];
  totalRuns: number;
}

function LiveStreamCard({ records, totalRuns }: LiveStreamProps) {
  const t = useTranslations();
  const recent = records.slice(-12);
  const max = records.reduce((m, r) => Math.max(m, r.client_total_ms), 1);

  return (
    <Card>
      <CardHeader>
        <CardDescription>{t("perf.live.description")}</CardDescription>
        <CardTitle className="text-base">{t("perf.live.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {t("perf.live.waiting")}
          </p>
        ) : (
          <div className="flex items-end gap-1 overflow-x-auto pb-1">
            {recent.map((r) => {
              const heightPct = Math.max(8, (r.client_total_ms / max) * 100);
              return (
                <div
                  key={r.index}
                  className="flex flex-col items-center gap-1"
                  title={`Run #${r.index + 1}: ${r.client_total_ms}ms client / ${r.server_total_ms}ms server`}
                >
                  <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                    {r.client_total_ms}
                  </span>
                  <div
                    className={`w-6 rounded-t ${
                      r.ok ? "bg-primary/70" : "bg-destructive/70"
                    }`}
                    style={{ height: `${heightPct}px`, minHeight: "8px" }}
                  />
                  <span className="text-[10px] font-mono text-muted-foreground">
                    #{r.index + 1}
                  </span>
                </div>
              );
            })}
            {records.length < totalRuns ? (
              <div className="flex flex-col items-center gap-1 self-end pb-3">
                <span className="text-[10px] text-muted-foreground">
                  +{totalRuns - records.length}
                </span>
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Summary cards ─────────────────────────────────────────────────────────

function SummaryCards({ result }: { result: BenchmarkResult }) {
  const t = useTranslations();
  const failed = result.runs.length - result.ok_count;
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <StatBlock
        title={t("perf.summary.client")}
        subtitle={t("perf.summary.clientHint")}
        icon={<Network className="size-4" />}
        stats={result.summary.client}
        accent
      />
      <StatBlock
        title={t("perf.summary.server")}
        subtitle={t("perf.summary.serverHint")}
        icon={<Database className="size-4" />}
        stats={result.summary.server}
      />
      <StatBlock
        title={t("perf.summary.network")}
        subtitle={t("perf.summary.networkHint")}
        icon={<Timer className="size-4" />}
        stats={result.summary.network_overhead}
      />
      {failed > 0 ? (
        <Card className="border-destructive/40 bg-destructive/5 lg:col-span-3">
          <CardContent className="flex items-center gap-3 py-3 text-sm text-destructive">
            <AlertTriangle className="size-4" />
            <span>
              {t("perf.summary.failedRuns", { failed, total: result.runs.length })}
            </span>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

interface StatBlockProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  stats: PercentileStats;
  accent?: boolean;
}

function StatBlock({ title, subtitle, icon, stats, accent }: StatBlockProps) {
  const t = useTranslations();
  return (
    <Card className={accent ? "border-primary/30 bg-primary/5" : undefined}>
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-1.5">
          {icon}
          {title}
        </CardDescription>
        <CardTitle className="font-mono text-2xl tabular-nums">
          {Math.round(stats.p95)} <span className="text-sm text-muted-foreground">ms p95</span>
        </CardTitle>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Pct label="p50" v={stats.p50} />
          <Pct label="p99" v={stats.p99} />
          <Pct label={t("perf.summary.avg")} v={stats.avg} />
          <Pct label="min" v={stats.min} />
          <Pct label="max" v={stats.max} />
          <Pct label="n" v={stats.count} unit="" />
        </div>
      </CardContent>
    </Card>
  );
}

function Pct({ label, v, unit = "ms" }: { label: string; v: number; unit?: string }) {
  return (
    <div className="rounded-md border bg-background p-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="font-mono text-sm tabular-nums">
        {Math.round(v).toLocaleString()}
        {unit ? <span className="ml-0.5 text-[10px] text-muted-foreground">{unit}</span> : null}
      </p>
    </div>
  );
}

// ─── Phase breakdown card ──────────────────────────────────────────────────

function PhaseBreakdownCard({ result }: { result: BenchmarkResult }) {
  const t = useTranslations();
  // Sort phases by p95 descending so the slow ones are easy to spot.
  const sortedPhases = [...BENCHMARK_PHASES].sort(
    (a, b) => result.summary.phases[b].p95 - result.summary.phases[a].p95,
  );
  const max = Math.max(
    1,
    ...sortedPhases.map((p) => result.summary.phases[p].p95),
  );

  return (
    <Card>
      <CardHeader>
        <CardDescription className="flex items-center gap-1.5">
          <Gauge className="size-3.5" />
          {t("perf.phases.description")}
        </CardDescription>
        <CardTitle className="text-base">{t("perf.phases.title")}</CardTitle>
        <p className="text-xs text-muted-foreground">
          {t("perf.phases.subtitle")}
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          {sortedPhases.map((p) => {
            const stat = result.summary.phases[p];
            const pct = Math.max(2, Math.round((stat.p95 / max) * 100));
            return (
              <div key={p} className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-mono">{phaseLabel(p, t)}</span>
                  <span className="font-mono tabular-nums text-muted-foreground">
                    p50 {Math.round(stat.p50)} · p95 {Math.round(stat.p95)} · p99{" "}
                    {Math.round(stat.p99)} ms
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary/70"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function phaseLabel(p: BenchmarkPhase, t: (key: string) => string): string {
  return t(`pathfinder.timings.${p}`);
}

// ─── Raw runs table ────────────────────────────────────────────────────────

function RawRunsTable({ result }: { result: BenchmarkResult }) {
  const t = useTranslations();
  return (
    <Card>
      <CardHeader>
        <CardDescription>{t("perf.raw.description")}</CardDescription>
        <CardTitle className="text-base">{t("perf.raw.title")}</CardTitle>
        <p className="text-xs text-muted-foreground">
          {t("perf.raw.subtitle", {
            wall: Math.round(result.wall_time_ms / 100) / 10,
          })}
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead className="text-right">
                  {t("perf.raw.client")}
                </TableHead>
                <TableHead className="text-right">
                  {t("perf.raw.server")}
                </TableHead>
                <TableHead className="text-right">extract</TableHead>
                <TableHead className="text-right">embed</TableHead>
                <TableHead className="text-right">gap</TableHead>
                <TableHead className="text-right">paths</TableHead>
                <TableHead className="text-right">proof</TableHead>
                <TableHead className="text-right">similar</TableHead>
                <TableHead className="text-right">courses</TableHead>
                <TableHead className="text-right">salary</TableHead>
                <TableHead>{t("perf.raw.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.runs.map((r) => (
                <TableRow key={r.index}>
                  <TableCell className="font-mono">{r.index + 1}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {r.client_total_ms}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {r.server_total_ms}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {r.phases.extract}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {r.phases.embed}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {r.phases.gap}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {r.phases.paths}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {r.phases.proof}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {r.phases.similar}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {r.phases.courses}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {r.phases.salary}
                  </TableCell>
                  <TableCell>
                    {r.ok ? (
                      <Badge
                        variant="outline"
                        className="border-emerald-400/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      >
                        ok
                      </Badge>
                    ) : (
                      <Badge variant="destructive" title={r.error}>
                        fail
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyHint() {
  const t = useTranslations();
  return (
    <Card className="border-dashed bg-muted/30">
      <CardContent className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
        <Activity className="size-4 text-primary" />
        <span>{t("perf.empty")}</span>
      </CardContent>
    </Card>
  );
}

function ContextHint() {
  const t = useTranslations();
  return (
    <p className="text-[11px] text-muted-foreground">
      {t("perf.contextHint")}
    </p>
  );
}
