"use client";

import * as React from "react";
import {
  Banknote,
  Briefcase,
  Building2,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type {
  PivotSalaryLift,
  SalaryBandReport,
} from "@/lib/pathfinder/types";
import { useTranslations } from "@/contexts/locale-context";
import {
  AggregationPipelineBadges,
  DataSourceBadges,
  HonestModeBadge,
} from "./honest-mode";

/** Top-level stages in `server/src/services/aggregations/salary-band.ts`. */
const SALARY_AGG_STAGES = [
  "match",
  "facet",
  "group",
  "unwind",
  "sort",
  "limit",
] as const;

interface SalaryBandCardProps {
  data: SalaryBandReport;
  pivotLift: PivotSalaryLift[];
}

const LEVEL_ORDER = ["intern", "junior", "mid", "senior", "lead", "manager"];

export function SalaryBandCard({ data, pivotLift }: SalaryBandCardProps) {
  const t = useTranslations();

  if (data.total_matches === 0) {
    return (
      <Card>
        <CardHeader>
          <CardDescription>{t("pathfinder.salary.description")}</CardDescription>
          <CardTitle className="flex items-center gap-2 text-base">
            <Banknote className="size-4 text-primary" />
            {t("pathfinder.salary.marketFor", { role: data.target_role })}
          </CardTitle>
          <AggregationPipelineBadges
            className="pt-1"
            stages={SALARY_AGG_STAGES}
          />
        </CardHeader>
        <CardContent>
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            {t("pathfinder.salary.empty")}
          </p>
        </CardContent>
      </Card>
    );
  }

  const sortedLevels = [...data.by_level].sort(
    (a, b) =>
      LEVEL_ORDER.indexOf(a.level.toLowerCase()) -
      LEVEL_ORDER.indexOf(b.level.toLowerCase()),
  );
  const widest = sortedLevels.reduce(
    (m, l) => Math.max(m, l.max_vnd),
    0,
  ) || 1;

  return (
    <Card>
      <CardHeader>
        <CardDescription>{t("pathfinder.salary.description")}</CardDescription>
        <CardTitle className="flex items-center gap-2 text-base">
          <Banknote className="size-4 text-primary" />
          {t("pathfinder.salary.title", { role: data.target_role })}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("pathfinder.salary.subtitle")}
        </p>
        <AggregationPipelineBadges
          className="pt-1"
          stages={SALARY_AGG_STAGES}
        />
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        {/* ─── Honesty header ─────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <HonestModeBadge n={data.total_matches} unit={t("pathfinder.salary.unit")} />
          <DataSourceBadges
            sources={[data.source, "career_trajectories"]}
          />
        </div>

        {/* ─── Topline numbers ─────────────────────────────────────────── */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label={t("pathfinder.salary.matchingJds")}
            value={data.total_matches.toLocaleString()}
            hint={`source · ${data.source}`}
          />
          {data.overall ? (
            <>
              <Stat
                label={t("pathfinder.salary.medianRange")}
                value={`${fmtVnd(data.overall.median_min_vnd)}–${fmtVnd(
                  data.overall.median_max_vnd,
                )}`}
                hint={t("pathfinder.salary.vndHint")}
                accent
              />
              <Stat
                label={t("pathfinder.salary.floorCap")}
                value={`${fmtVnd(data.overall.min_vnd)}–${fmtVnd(
                  data.overall.max_vnd,
                )}`}
                hint={t("pathfinder.salary.rangeHint")}
              />
            </>
          ) : null}
          {pivotLift[0] ? (
            <Stat
              label={t("pathfinder.salary.expectedLift")}
              value={`+${Math.round(pivotLift[0].median_lift_pct * 100) / 100}%`}
              accent
              hint={`avg ${Math.round(pivotLift[0].avg_months)}mo · ${pivotLift[0].sample_size} pivoters`}
            />
          ) : null}
        </div>

        {/* ─── Per-level bar chart ─────────────────────────────────────── */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Briefcase className="size-4 text-muted-foreground" />
            {t("pathfinder.salary.byLevel")}
          </div>
          <ul className="flex flex-col gap-2">
            {sortedLevels.map((row) => (
              <li
                key={row.level}
                className="grid grid-cols-[88px_1fr_auto] items-center gap-3 rounded-md border bg-muted/30 p-2 text-sm"
              >
                <Badge variant="outline" className="justify-center capitalize">
                  {row.level} · {row.count}
                </Badge>
                <BandBar
                  min={row.median_min_vnd}
                  max={row.median_max_vnd}
                  ceiling={widest}
                />
                <span className="font-mono text-xs text-foreground">
                  {fmtVnd(row.median_min_vnd)}–{fmtVnd(row.median_max_vnd)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <Separator />

        <div className="grid gap-4 md:grid-cols-2">
          {/* ─── Top companies ─────────────────────────────────────────── */}
          <section>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Building2 className="size-4 text-muted-foreground" />
              {t("pathfinder.salary.topCompanies")}
            </div>
            <ul className="flex flex-col gap-1.5 text-sm">
              {data.top_companies.length === 0 ? (
                <li className="text-xs text-muted-foreground">
                  {t("pathfinder.salary.noListings")}
                </li>
              ) : (
                data.top_companies.map((c) => (
                  <li
                    key={c.company}
                    className="flex items-center justify-between gap-2 rounded-md border bg-card px-2 py-1.5"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{c.company}</span>
                      <span className="text-xs text-muted-foreground">
                        {c.top_title}
                      </span>
                    </div>
                    <Badge variant="secondary" className="font-mono text-[11px]">
                      {c.count} open
                    </Badge>
                  </li>
                ))
              )}
            </ul>
          </section>

          {/* ─── Top required skills ──────────────────────────────────── */}
          <section>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Sparkles className="size-4 text-muted-foreground" />
              {t("pathfinder.salary.topSkills")}
            </div>
            <ul className="flex flex-wrap gap-1.5">
              {data.top_required_skills.length === 0 ? (
                <li className="text-xs text-muted-foreground">
                  {t("pathfinder.salary.noSkills")}
                </li>
              ) : (
                data.top_required_skills.map((s) => (
                  <li key={s.skill}>
                    <Badge
                      variant="outline"
                      className="font-mono text-[11px] font-medium"
                    >
                      {s.skill}
                      <span className="ml-1 text-muted-foreground">
                        · {s.count}
                      </span>
                    </Badge>
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>

        {/* ─── Pivot lift table (UC-5) ──────────────────────────────────── */}
        {pivotLift.length > 0 ? (
          <>
            <Separator />
            <section>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <TrendingUp className="size-4 text-muted-foreground" />
                {t("pathfinder.salary.pivotLift")}
                <Badge variant="outline" className="ml-auto font-mono text-[10px]">
                  $group · $unwind on career_trajectories
                </Badge>
              </div>
              <ul className="flex flex-col divide-y rounded-md border bg-muted/20 text-sm">
                {pivotLift.slice(0, 5).map((row) => (
                  <li
                    key={row.to_role}
                    className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-3 py-2"
                  >
                    <span className="font-medium">{row.to_role}</span>
                    <span className="font-mono text-xs text-emerald-700 dark:text-emerald-300">
                      +{Math.round(row.median_lift_pct * 100) / 100}% lift
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      n={row.sample_size} · {Math.round(row.avg_months)}mo
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

interface BandBarProps {
  min: number;
  max: number;
  ceiling: number;
}

function BandBar({ min, max, ceiling }: BandBarProps) {
  const lo = Math.max(0, Math.min(100, (min / ceiling) * 100));
  const hi = Math.max(0, Math.min(100, (max / ceiling) * 100));
  const width = Math.max(2, hi - lo);
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="absolute top-0 h-full rounded-full bg-linear-to-r from-primary/60 to-primary"
        style={{ left: `${lo}%`, width: `${width}%` }}
      />
    </div>
  );
}

function fmtVnd(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "—";
  // Values come from the ETL in VND-millions ("triệu"). We render them as
  // integers (or one decimal if needed) followed by a "tr" suffix that is
  // immediately recognizable to Vietnamese readers.
  return value >= 100
    ? `${Math.round(value)}tr`
    : `${(Math.round(value * 10) / 10).toFixed(value < 10 ? 1 : 0)}tr`;
}

function Stat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={`text-xl font-semibold tabular-nums ${
          accent ? "text-emerald-600 dark:text-emerald-400" : ""
        }`}
      >
        {value}
      </p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
