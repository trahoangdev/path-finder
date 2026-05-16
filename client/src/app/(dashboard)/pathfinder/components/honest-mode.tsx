"use client";

import { AlertTriangle, Database, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "@/contexts/locale-context";

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
  const t = useTranslations();
  const count = n.toLocaleString();

  if (n >= HONEST_THRESHOLDS.warn) {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-emerald-400/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      >
        <ShieldCheck className="size-3" />
        {t("honest.trustworthy", { n: count })}
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
        {t("honest.lowConfidence", { n: count })}
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
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
