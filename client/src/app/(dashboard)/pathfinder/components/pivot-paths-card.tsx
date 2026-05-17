"use client";

import * as React from "react";
import { ArrowRight, Map, Rabbit, Scale, Telescope } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "@/contexts/locale-context";
import type { PivotPath } from "@/lib/pathfinder/types";
import {
  AggregationPipelineBadges,
  DataSourceBadges,
} from "./honest-mode";

/** Stages in `server/src/services/aggregations/pivot-path.ts` (+ optional $graphLookup). */
const PIVOT_AGG_STAGES = [
  "match",
  "project",
  "sort",
  "limit",
  "graphLookup",
] as const;

interface PivotPathsCardProps {
  paths: PivotPath[];
}

const FLAVOR_ICONS: Record<PivotPath["flavor"], typeof Rabbit> = {
  fast: Rabbit,
  balanced: Scale,
  comprehensive: Telescope,
};

const FLAVOR_KEYS = ["fast", "balanced", "comprehensive"] as const;

const CONFIDENCE_STYLES = {
  high: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  medium: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  low: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};

export function PivotPathsCard({ paths }: PivotPathsCardProps) {
  const t = useTranslations();
  const ordered = FLAVOR_KEYS.map(
    (flavor) => paths.find((p) => p.flavor === flavor),
  );
  const defaultTab =
    ordered.find((p) => p && p.full_path.length > 0)?.flavor ?? "balanced";

  return (
    <Card>
      <CardHeader>
        <CardDescription>{t("pathfinder.pivot.description")}</CardDescription>
        <CardTitle className="flex items-center gap-2 text-base">
          <Map className="size-4 text-primary" />
          {t("pathfinder.pivot.title")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("pathfinder.pivot.subtitle")}
        </p>
        <AggregationPipelineBadges
          className="pt-1"
          stages={PIVOT_AGG_STAGES}
        />
        <DataSourceBadges
          className="pt-1"
          sources={["skill_transitions", "synthetic_vn_cohort"]}
        />
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={defaultTab} className="gap-4">
          <TabsList className="w-full sm:w-fit">
            {FLAVOR_KEYS.map((flavor) => {
              const Icon = FLAVOR_ICONS[flavor];
              return (
                <TabsTrigger key={flavor} value={flavor} className="gap-2">
                  <Icon className="size-3.5" />
                  {t(`pivotFlavor.${flavor}`)}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {FLAVOR_KEYS.map((flavor) => {
            const path = paths.find((p) => p.flavor === flavor);
            return (
              <TabsContent key={flavor} value={flavor} className="mt-0">
                <p className="mb-3 text-xs text-muted-foreground">
                  {t(`pivotFlavor.${flavor}Tagline`)}
                </p>
                {!path || path.full_path.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    {t("pathfinder.pivot.noPath")}
                  </p>
                ) : (
                  <div className="flex flex-col gap-4">
                    <PathRibbon path={path} />
                    <PathFooter path={path} />
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}

function PathRibbon({ path }: { path: PivotPath }) {
  const nodes = React.useMemo(() => {
    if (path.full_path.length === 0) return [];
    const result = [path.full_path[0].from_skill];
    for (const edge of path.full_path) result.push(edge.to_skill);
    return result;
  }, [path]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {nodes.map((node, idx) => {
        const edge = idx > 0 ? path.full_path[idx - 1] : null;
        return (
          <React.Fragment key={`${node}-${idx}`}>
            {idx > 0 ? (
              <div className="flex flex-col items-center text-[10px] text-muted-foreground">
                <ArrowRight className="size-4" />
                <div className="flex gap-2 tabular-nums">
                  {edge?.months ? <span>{Math.round(edge.months)}mo</span> : null}
                  {edge?.lift ? (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      +{Math.round(edge.lift)}%
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}
            <span
              className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
                idx === 0
                  ? "bg-muted text-muted-foreground"
                  : idx === nodes.length - 1
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-card"
              }`}
            >
              {node}
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
}

function PathFooter({ path }: { path: PivotPath }) {
  const t = useTranslations();
  return (
    <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-4">
      <FooterStat
        label={t("pathfinder.pivot.steps")}
        value={String(path.path_length)}
      />
      <FooterStat
        label={t("pathfinder.pivot.totalTime")}
        value={`${Math.round(path.total_months)} mo`}
      />
      <FooterStat
        label={t("pathfinder.pivot.salaryLift")}
        value={`+${Math.round(path.total_lift_pct)}%`}
        accent
      />
      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {t("pathfinder.pivot.confidence")}
        </span>
        <Badge
          variant="outline"
          className={`w-fit ${CONFIDENCE_STYLES[path.min_confidence_in_path]}`}
        >
          {t(`confidence.${path.min_confidence_in_path}`)}
        </Badge>
      </div>
    </div>
  );
}

function FooterStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span
        className={`text-base font-semibold tabular-nums ${
          accent ? "text-emerald-600 dark:text-emerald-400" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}
