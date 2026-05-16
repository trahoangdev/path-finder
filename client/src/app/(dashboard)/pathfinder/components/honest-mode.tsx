"use client";

import { AlertTriangle, Database, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * Honest Mode primitives — implements F7 from the PRD:
 *   - F7.1  Compute confidence per recommendation
 *   - F7.2  Warning badge when N < 30 → red "Low confidence" pill
 *   - F7.3  Hide recommendations when N < 10 → caller-side placeholder
 *   - F7.4  Data source label per card
 *
 * Every analytical card on the dashboard imports these helpers so the
 * "show evidence, not opinion" UX rule from §12 of the PRD is enforced
 * consistently across the dashboard.
 */

export const HONEST_THRESHOLDS = {
  /** Below this N, the card is fully hidden behind an insufficient-data notice. */
  hide: 10,
  /** N within [hide, warn) shows a yellow / red warning badge. */
  warn: 30,
  /** N ≥ trustworthy hides the warning entirely. */
  trustworthy: 100,
} as const;

export interface HonestModeBadgeProps {
  /** Effective sample size that produced this card's numbers. */
  n: number;
  /** Optional override for the noun displayed in copy (defaults to "data points"). */
  unit?: string;
}

export function HonestModeBadge({ n, unit = "data points" }: HonestModeBadgeProps) {
  if (n >= HONEST_THRESHOLDS.warn) {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-emerald-400/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      >
        <ShieldCheck className="size-3" />
        Trustworthy · N={n.toLocaleString()}
      </Badge>
    );
  }
  if (n >= HONEST_THRESHOLDS.hide) {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-amber-400/60 bg-amber-500/10 text-amber-700 dark:text-amber-300"
      >
        <AlertTriangle className="size-3" />
        Low confidence · N={n.toLocaleString()}
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="gap-1 border-rose-400/60 bg-rose-500/10 text-rose-700 dark:text-rose-300"
    >
      <AlertTriangle className="size-3" />
      Insufficient data · N={n.toLocaleString()}
    </Badge>
  );
}

export interface DataSourceBadgesProps {
  sources: string[];
  className?: string;
}

export function DataSourceBadges({ sources, className }: DataSourceBadgesProps) {
  if (sources.length === 0) return null;
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className ?? ""}`}>
      <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Database className="size-3" /> sources
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

interface InsufficientDataPlaceholderProps {
  n: number;
  title?: string;
  description?: string;
}

/**
 * Drop-in card body when N < HONEST_THRESHOLDS.hide. PRD F7.3 says:
 *   "Hide recommendations when N < 10 — Replace with 'Not enough data' message"
 */
export function InsufficientDataPlaceholder({
  n,
  title = "Not enough data to recommend",
  description = "We won't guess. Seed more entries via the ETL (or pick a more populated target) and re-run the analysis.",
}: InsufficientDataPlaceholderProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed bg-muted/30 p-4 text-sm">
      <div className="flex items-center gap-2 font-medium">
        <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
        {title}
      </div>
      <p className="text-muted-foreground">
        {description} (Current N={n}.)
      </p>
    </div>
  );
}
