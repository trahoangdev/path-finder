"use client";

import * as React from "react";
import { AlertTriangle, Database, Layers, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "@/contexts/locale-context";

/**
 * Honest Mode primitives — implements F7 from the PRD:
 *   - F7.1  Compute confidence per recommendation
 *   - F7.2  Warning badge when N < 30 → red "Low confidence" pill
 *   - F7.3  Hide recommendations when N < 10 → caller-side placeholder
 *   - F7.4  Data source label per card
 *
 * v2 (Live Toggle): the thresholds are now driven by a React context so the
 * judge / user can interactively dial them in via `<HonestModeControl />`.
 * The defaults below match the original PRD numbers, preserving behavior for
 * any consumer that renders outside the provider tree.
 */

export interface HonestThresholdsValue {
  /** Below this N, cards are fully hidden behind an insufficient-data notice. */
  hide: number;
  /** N within [hide, warn) shows an amber warning badge. */
  warn: number;
  /** N ≥ trustworthy hides any warning entirely. */
  trustworthy: number;
}

/** PRD-aligned default thresholds. */
export const DEFAULT_HONEST_THRESHOLDS: HonestThresholdsValue = {
  hide: 10,
  warn: 30,
  trustworthy: 100,
};

/**
 * @deprecated Prefer `useHonestThresholds()` so the live toggle can override
 * these. Kept as an export for legacy / static consumers; values will always
 * reflect the PRD defaults.
 */
export const HONEST_THRESHOLDS = DEFAULT_HONEST_THRESHOLDS;

export type HonestModePreset = "permissive" | "default" | "strict";

export const HONEST_PRESETS: Record<HonestModePreset, HonestThresholdsValue> = {
  // "Off-ish" — show everything except completely empty buckets. Useful to
  // demonstrate what a naive recommender would surface.
  permissive: { hide: 1, warn: 5, trustworthy: 30 },
  // PRD-aligned production defaults.
  default: { hide: 10, warn: 30, trustworthy: 100 },
  // Research-grade gate — most demo cohorts will trip this and visibly hide.
  strict: { hide: 50, warn: 100, trustworthy: 300 },
};

interface HonestModeContextValue {
  thresholds: HonestThresholdsValue;
  setThresholds: (next: HonestThresholdsValue) => void;
  preset: HonestModePreset | "custom";
  setPreset: (preset: HonestModePreset) => void;
  /** Cards register their sample size so the control panel can show live counts. */
  registerSampleSize: (id: string, n: number) => void;
  unregisterSampleSize: (id: string) => void;
  /** Aggregate counts derived from registered samples + current thresholds. */
  stats: {
    total: number;
    hidden: number;
    lowConfidence: number;
    trustworthy: number;
  };
}

const HonestModeContext = React.createContext<HonestModeContextValue | null>(
  null,
);

export interface HonestModeProviderProps {
  children: React.ReactNode;
  initialPreset?: HonestModePreset;
}

export function HonestModeProvider({
  children,
  initialPreset = "default",
}: HonestModeProviderProps) {
  const [thresholds, setThresholdsState] = React.useState<HonestThresholdsValue>(
    HONEST_PRESETS[initialPreset],
  );
  const [preset, setPresetState] = React.useState<HonestModePreset | "custom">(
    initialPreset,
  );
  // Mirror registered sample sizes in a ref to avoid render-loop churn, but
  // keep a counter state so consumers re-render when a card mounts/unmounts.
  const samplesRef = React.useRef<Map<string, number>>(new Map());
  const [samplesVersion, setSamplesVersion] = React.useState(0);

  const setThresholds = React.useCallback((next: HonestThresholdsValue) => {
    setThresholdsState(next);
    setPresetState("custom");
  }, []);

  const setPreset = React.useCallback((nextPreset: HonestModePreset) => {
    setThresholdsState(HONEST_PRESETS[nextPreset]);
    setPresetState(nextPreset);
  }, []);

  const registerSampleSize = React.useCallback((id: string, n: number) => {
    const prev = samplesRef.current.get(id);
    if (prev === n) return;
    samplesRef.current.set(id, n);
    setSamplesVersion((v) => v + 1);
  }, []);

  const unregisterSampleSize = React.useCallback((id: string) => {
    if (!samplesRef.current.has(id)) return;
    samplesRef.current.delete(id);
    setSamplesVersion((v) => v + 1);
  }, []);

  const stats = React.useMemo(() => {
    let hidden = 0;
    let lowConfidence = 0;
    let trustworthy = 0;
    for (const n of samplesRef.current.values()) {
      if (n < thresholds.hide) hidden += 1;
      else if (n < thresholds.warn) lowConfidence += 1;
      else trustworthy += 1;
    }
    return {
      total: samplesRef.current.size,
      hidden,
      lowConfidence,
      trustworthy,
    };
    // samplesVersion is the dirty bit for the ref-backed map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thresholds, samplesVersion]);

  const value = React.useMemo<HonestModeContextValue>(
    () => ({
      thresholds,
      setThresholds,
      preset,
      setPreset,
      registerSampleSize,
      unregisterSampleSize,
      stats,
    }),
    [
      thresholds,
      setThresholds,
      preset,
      setPreset,
      registerSampleSize,
      unregisterSampleSize,
      stats,
    ],
  );

  return (
    <HonestModeContext.Provider value={value}>
      {children}
    </HonestModeContext.Provider>
  );
}

/**
 * Read the current Honest Mode thresholds. Falls back to the PRD defaults
 * when used outside a provider so existing storybook / test rigs keep working.
 */
export function useHonestThresholds(): HonestThresholdsValue {
  const ctx = React.useContext(HonestModeContext);
  return ctx?.thresholds ?? DEFAULT_HONEST_THRESHOLDS;
}

/** Full context — for the control panel itself. */
export function useHonestMode(): HonestModeContextValue {
  const ctx = React.useContext(HonestModeContext);
  if (!ctx) {
    throw new Error("useHonestMode must be used within a HonestModeProvider");
  }
  return ctx;
}

/**
 * Register this card's effective sample size with the provider so the
 * control panel can live-count "X hidden / Y low-confidence / Z trustworthy".
 * No-op outside a provider.
 */
export function useRegisterSampleSize(id: string, n: number): void {
  const ctx = React.useContext(HonestModeContext);
  React.useEffect(() => {
    if (!ctx) return;
    ctx.registerSampleSize(id, n);
    return () => ctx.unregisterSampleSize(id);
    // ctx.registerSampleSize / unregisterSampleSize are stable refs.
  }, [ctx, id, n]);
}

export interface HonestModeBadgeProps {
  /** Effective sample size that produced this card's numbers. */
  n: number;
  /** Optional override for the noun displayed in copy (defaults to "data points"). */
  unit?: string;
}

export function HonestModeBadge({ n, unit = "data points" }: HonestModeBadgeProps) {
  const t = useTranslations();
  const thresholds = useHonestThresholds();
  const count = n.toLocaleString();
  const title = `${count} ${unit}`;

  if (n >= thresholds.warn) {
    return (
      <Badge
        variant="outline"
        title={title}
        className="gap-1 border-emerald-400/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      >
        <ShieldCheck className="size-3" />
        {t("honest.trustworthy", { n: count })}
      </Badge>
    );
  }
  if (n >= thresholds.hide) {
    return (
      <Badge
        variant="outline"
        title={title}
        className="gap-1 border-amber-400/60 bg-amber-500/10 text-amber-700 dark:text-amber-300"
      >
        <AlertTriangle className="size-3" />
        {t("honest.lowConfidence", { n: count })}
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      title={title}
      className="gap-1 border-rose-400/60 bg-rose-500/10 text-rose-700 dark:text-rose-300"
    >
      <AlertTriangle className="size-3" />
      {t("honest.insufficientData", { n: count })}
    </Badge>
  );
}

export interface DataSourceBadgesProps {
  sources: string[];
  className?: string;
}

export function DataSourceBadges({ sources, className }: DataSourceBadgesProps) {
  const t = useTranslations();
  if (sources.length === 0) return null;
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className ?? ""}`}>
      <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Database className="size-3" /> {t("honest.sources")}
      </span>
      {sources.map((s) => (
        <Badge
          key={s}
          variant="secondary"
          className="font-mono text-[10px] tracking-tight"
        >
          {s}
        </Badge>
      ))}
    </div>
  );
}

export interface AggregationPipelineBadgesProps {
  /** MongoDB aggregation stage names (without the leading $). */
  stages: readonly string[];
  className?: string;
}

/**
 * Visual “evidence” that a card is backed by MongoDB Aggregation Pipeline stages
 * ($facet, $group, $lookup, …) — not only Vector Search.
 */
export function AggregationPipelineBadges({
  stages,
  className,
}: AggregationPipelineBadgesProps) {
  const t = useTranslations();
  if (stages.length === 0) return null;
  return (
    <div
      className={`flex flex-wrap items-center gap-1.5 ${className ?? ""}`}
      title={t("pathfinder.aggregation.title")}
    >
      <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Layers className="size-3" />
        {t("pathfinder.aggregation.label")}
      </span>
      {stages.map((stage) => (
        <Badge
          key={stage}
          variant="outline"
          className="border-sky-500/35 bg-sky-500/10 font-mono text-[10px] text-sky-900 dark:text-sky-100"
        >
          ${stage}
        </Badge>
      ))}
    </div>
  );
}

interface InsufficientDataPlaceholderProps {
  n: number;
  title?: string;
  description?: string;
}

/**
 * Drop-in card body when N < thresholds.hide. PRD F7.3 says:
 *   "Hide recommendations when N < 10 — Replace with 'Not enough data' message"
 */
export function InsufficientDataPlaceholder({
  n,
  title,
  description,
}: InsufficientDataPlaceholderProps) {
  const t = useTranslations();
  const resolvedTitle = title ?? t("honest.notEnoughTitle");
  const resolvedDescription =
    description ?? t("honest.notEnoughDescription");

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed bg-muted/30 p-4 text-sm">
      <div className="flex items-center gap-2 font-medium">
        <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
        {resolvedTitle}
      </div>
      <p className="text-muted-foreground">
        {resolvedDescription} {t("honest.currentN", { n })}
      </p>
    </div>
  );
}
