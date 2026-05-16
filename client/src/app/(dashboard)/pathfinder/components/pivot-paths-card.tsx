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
import type { PivotPath } from "@/lib/pathfinder/types";
import { DataSourceBadges } from "./honest-mode";

interface PivotPathsCardProps {
  paths: PivotPath[];
}

const FLAVOR_META: Record<
  PivotPath["flavor"],
  { label: string; icon: typeof Rabbit; tagline: string }
> = {
  fast: {
    label: "Fast",
    icon: Rabbit,
    tagline: "Shortest #skills, fastest landing",
  },
  balanced: {
    label: "Balanced",
    icon: Scale,
    tagline: "Best months ↔ salary lift trade-off",
  },
  comprehensive: {
    label: "Comprehensive",
    icon: Telescope,
    tagline: "Deepest coverage, highest confidence",
  },
};

const CONFIDENCE_STYLES = {
  high: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  medium: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  low: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};

export function PivotPathsCard({ paths }: PivotPathsCardProps) {
  const ordered = (["fast", "balanced", "comprehensive"] as const).map(
    (flavor) => paths.find((p) => p.flavor === flavor),
  );
  const defaultTab =
    ordered.find((p) => p && p.full_path.length > 0)?.flavor ?? "balanced";

  return (
    <Card>
      <CardHeader>
        <CardDescription>Pivot paths</CardDescription>
        <CardTitle className="flex items-center gap-2 text-base">
          <Map className="size-4 text-primary" />
          Three routes from your stack to the target
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Computed by MongoDB&apos;s{" "}
          <code className="rounded bg-muted px-1 text-xs">$graphLookup</code>{" "}
          over the pre-computed <em>skill_transitions</em> graph.
        </p>
        <DataSourceBadges
          className="pt-1"
          sources={["skill_transitions", "synthetic_vn_cohort"]}
        />
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={defaultTab} className="gap-4">
          <TabsList className="w-full sm:w-fit">
            {(["fast", "balanced", "comprehensive"] as const).map((flavor) => {
              const meta = FLAVOR_META[flavor];
              const Icon = meta.icon;
              return (
                <TabsTrigger key={flavor} value={flavor} className="gap-2">
                  <Icon className="size-3.5" />
                  {meta.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {(["fast", "balanced", "comprehensive"] as const).map((flavor) => {
            const path = paths.find((p) => p.flavor === flavor);
            const meta = FLAVOR_META[flavor];
            return (
              <TabsContent key={flavor} value={flavor} className="mt-0">
                <p className="mb-3 text-xs text-muted-foreground">
                  {meta.tagline}
                </p>
                {!path || path.full_path.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No path found for this flavor — graph is sparse for this
                    direction.
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
  return (
    <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-4">
      <FooterStat label="Steps" value={String(path.path_length)} />
      <FooterStat
        label="Total time"
        value={`${Math.round(path.total_months)} mo`}
      />
      <FooterStat
        label="Salary lift"
        value={`+${Math.round(path.total_lift_pct)}%`}
        accent
      />
      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Confidence
        </span>
        <Badge
          variant="outline"
          className={`w-fit ${CONFIDENCE_STYLES[path.min_confidence_in_path]}`}
        >
          {path.min_confidence_in_path}
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
