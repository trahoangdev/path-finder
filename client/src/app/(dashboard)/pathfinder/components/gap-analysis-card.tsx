"use client";

import { Target } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useTranslations } from "@/contexts/locale-context";
import type { MissingSkill } from "@/lib/pathfinder/types";
import { AggregationPipelineBadges } from "./honest-mode";

const GAP_AGG_STAGES = [
  "match",
  "lookup",
  "sort",
  "limit",
  "vectorSearch",
  "addFields",
  "project",
] as const;

interface GapAnalysisCardProps {
  skills: MissingSkill[];
}

function pct(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function GapAnalysisCard({ skills }: GapAnalysisCardProps) {
  const t = useTranslations();
  const top = skills.slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <CardDescription>{t("pathfinder.gap.description")}</CardDescription>
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="size-4 text-primary" />
          {t("pathfinder.gap.title")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("pathfinder.gap.subtitle")}
        </p>
        <AggregationPipelineBadges
          stages={GAP_AGG_STAGES}
          className="pt-1"
        />
        <p className="text-xs text-muted-foreground">{t("pathfinder.aggregation.gapHint")}</p>
      </CardHeader>
      <CardContent>
        {top.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("pathfinder.gap.noGap")}
          </p>
        ) : (
          <div className="flex flex-col">
            {top.map((skill, idx) => (
              <div key={skill.name}>
                <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-muted-foreground tabular-nums">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <span className="truncate font-medium">{skill.name}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {skill.category}
                      </Badge>
                    </div>
                    <p className="line-clamp-1 text-xs text-muted-foreground">
                      {skill.description}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                    <Stat
                      label={t("pathfinder.gap.similarity")}
                      value={pct(skill.similarity)}
                    />
                    <DemandBar value={skill.vn_demand_score} />
                    {skill.transition?.avg_months ? (
                      <Stat
                        label={t("pathfinder.gap.pivotMonths")}
                        value={`${Math.round(skill.transition.avg_months)} mo`}
                      />
                    ) : null}
                    {skill.transition?.avg_salary_lift_pct ? (
                      <Stat
                        label={t("pathfinder.gap.salaryLift")}
                        value={`+${Math.round(
                          skill.transition.avg_salary_lift_pct,
                        )}%`}
                        accent
                      />
                    ) : null}
                  </div>
                </div>
                {idx < top.length - 1 ? <Separator /> : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex min-w-[64px] flex-col">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span
        className={`text-sm font-semibold tabular-nums ${
          accent ? "text-emerald-600 dark:text-emerald-400" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

/** `skills.vn_demand_score` is stored 0..1 (see server schema); show as 0..100 in UI. */
function demandPercent(raw: number): number {
  if (!Number.isFinite(raw)) return 0;
  if (raw > 1) return Math.max(0, Math.min(100, Math.round(raw)));
  return Math.max(0, Math.min(100, Math.round(raw * 100)));
}

function DemandBar({ value }: { value: number }) {
  const t = useTranslations();
  const v = demandPercent(value);
  return (
    <div className="flex min-w-[120px] flex-col">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {t("pathfinder.gap.vnDemand", { score: v })}
      </span>
      <Progress value={v} className="h-1.5 w-[120px]" />
    </div>
  );
}
