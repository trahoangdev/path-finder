"use client";

import { UserCircle2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTranslations } from "@/contexts/locale-context";
import type { SimilarDevsGroup } from "@/lib/pathfinder/types";
import {
  AggregationPipelineBadges,
  DataSourceBadges,
  HonestModeBadge,
  InsufficientDataPlaceholder,
  useHonestThresholds,
  useRegisterSampleSize,
} from "./honest-mode";

/** Current seed uses the aggregation fallback in `server/src/services/vector-search/similar-devs.ts`. */
const SIMILAR_AGG_STAGES = [
  "match",
  "addFields",
  "reduce",
  "setIntersection",
  "group",
  "project",
  "sort",
  "limit",
] as const;

interface SimilarDevsCardProps {
  groups: SimilarDevsGroup[];
}

function formatSalary(usd: number | null): string {
  if (usd == null) return "—";
  if (usd >= 1000) return `$${(usd / 1000).toFixed(1)}k`;
  return `$${Math.round(usd)}`;
}

export function SimilarDevsCard({ groups }: SimilarDevsCardProps) {
  const t = useTranslations();
  const top = [...groups].sort((a, b) => b.count - a.count).slice(0, 8);
  const max = top.reduce((m, g) => Math.max(m, g.count), 1);
  const totalN = groups.reduce((sum, g) => sum + g.count, 0);
  const thresholds = useHonestThresholds();
  const hide = totalN < thresholds.hide;
  useRegisterSampleSize("similar-devs", totalN);

  return (
    <Card>
      <CardHeader>
        <CardDescription>{t("pathfinder.similar.description")}</CardDescription>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserCircle2 className="size-4 text-primary" />
          {t("pathfinder.similar.title")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("pathfinder.similar.subtitle")}
        </p>
        <AggregationPipelineBadges
          className="pt-1"
          stages={SIMILAR_AGG_STAGES}
        />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <HonestModeBadge n={totalN} unit={t("pathfinder.similar.unit")} />
          <DataSourceBadges sources={["synthetic_vn_cohort", "skill_overlap_fallback"]} />
        </div>

        {hide ? (
          <InsufficientDataPlaceholder
            n={totalN}
            title={t("pathfinder.similar.insufficientTitle")}
            description={t("pathfinder.similar.insufficientDescription")}
          />
        ) : top.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("pathfinder.similar.none")}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {top.map((group) => {
              const width = Math.max(4, Math.round((group.count / max) * 100));
              return (
                <li key={group.role} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium">{group.role}</span>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
                      <span>
                        {t("pathfinder.similar.devCount", {
                          count: group.count.toLocaleString(),
                        })}
                      </span>
                      <span className="font-medium text-foreground">
                        {formatSalary(group.avg_salary_usd)}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary/70 transition-all"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
