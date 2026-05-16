"use client";

import { GraduationCap, ScrollText, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useTranslations } from "@/contexts/locale-context";
import type { ProofDrawerResponse } from "@/lib/pathfinder/types";
import {
  DataSourceBadges,
  HONEST_THRESHOLDS,
  HonestModeBadge,
  InsufficientDataPlaceholder,
} from "./honest-mode";

interface ProofDrawerCardProps {
  data: ProofDrawerResponse;
}

export function ProofDrawerCard({ data }: ProofDrawerCardProps) {
  const t = useTranslations();
  const examples = data.example_profiles.slice(0, 4);
  // Honest Mode (F7.3): when N < 10, refuse to render speculative stats.
  const hide = data.sample_size < HONEST_THRESHOLDS.hide;

  return (
    <Card>
      <CardHeader>
        <CardDescription>{t("pathfinder.proof.description")}</CardDescription>
        <CardTitle className="flex items-center gap-2 text-base">
          <ScrollText className="size-4 text-primary" />
          {t("pathfinder.proof.title")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("pathfinder.proof.subtitle")}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {hide ? (
          <InsufficientDataPlaceholder
            n={data.sample_size}
            description={t("pathfinder.proof.insufficientDescription")}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label={t("pathfinder.proof.sampleSize")}
              value={data.sample_size.toLocaleString()}
              hint={t("pathfinder.proof.sampleHint")}
            />
            <Stat
              label={t("pathfinder.proof.conversionRate")}
              value={`${(data.conversion_rate * 100).toFixed(1)}%`}
              accent
              hint={t("pathfinder.proof.conversionHint")}
            />
            <Stat
              label={t("pathfinder.proof.medianLift")}
              value={`+${Math.round(data.salary_stats.median_lift_pct)}%`}
              accent
              hint={t("pathfinder.proof.spreadHint", {
                min: Math.round(data.salary_stats.min_lift_pct),
                max: Math.round(data.salary_stats.max_lift_pct),
              })}
            />
            <Stat
              label={t("pathfinder.proof.avgDuration")}
              value={`${Math.round(data.salary_stats.avg_months)} mo`}
              hint={t("pathfinder.proof.durationHint")}
            />
          </div>
        )}

        <Separator />

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <HonestModeBadge n={data.sample_size} unit="pivoters" />
          <DataSourceBadges sources={data.data_sources} />
        </div>

        {!hide ? (
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Users className="size-4 text-muted-foreground" />
              {t("pathfinder.proof.samplePivoters")}
            </div>
            <ul className="grid gap-2 sm:grid-cols-2">
              {examples.length === 0 ? (
                <li className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                  {t("pathfinder.proof.noExamples")}
                </li>
              ) : (
                examples.map((ex) => (
                  <li
                    key={ex.anon_id}
                    className="rounded-lg border bg-muted/30 p-3 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        {ex.anon_id}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {ex.source}
                      </Badge>
                    </div>
                    <p className="mt-1 font-medium">
                      {ex.starting_role ?? t("common.unknown")}{" "}
                      <span className="text-muted-foreground">→</span>{" "}
                      <span className="text-primary">{ex.current_role}</span>
                    </p>
                    <p className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <GraduationCap className="size-3" />
                        {ex.ed_level ?? "—"}
                      </span>
                      <span>·</span>
                      <span>
                        {t("pathfinder.proof.yrsTotal", {
                          years: ex.total_years_exp,
                        })}
                      </span>
                    </p>
                  </li>
                ))
              )}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
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
