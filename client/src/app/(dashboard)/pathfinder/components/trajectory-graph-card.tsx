"use client";

import * as React from "react";
import { GitBranch, Rabbit, Scale, Telescope } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PivotPath, SimilarDevsGroup } from "@/lib/pathfinder/types";

interface TrajectoryGraphCardProps {
  paths: PivotPath[];
  similar: SimilarDevsGroup[];
  targetRole: string;
}

type FlavorKey = "fast" | "balanced" | "comprehensive";

interface FlavorMeta {
  label: string;
  icon: typeof Rabbit;
  /** Main accent color — used for edges, the filled target node, and arrows. */
  color: string;
  /** Subtle wash for the lane stripe (very translucent). */
  laneWash: string;
  /** Translucent fill for the lane label pill. */
  pillBg: string;
  /** Tinted fill for the middle skill nodes (still translucent over the canvas). */
  nodeBg: string;
  /** Solid border color matching the flavor for middle nodes & lane pill. */
  border: string;
}

const FLAVOR_CONFIG: Record<FlavorKey, FlavorMeta> = {
  fast: {
    label: "Fast",
    icon: Rabbit,
    color: "#f97316",
    laneWash: "rgba(249, 115, 22, 0.06)",
    pillBg: "rgba(249, 115, 22, 0.22)",
    nodeBg: "rgba(249, 115, 22, 0.16)",
    border: "rgba(249, 115, 22, 0.70)",
  },
  balanced: {
    label: "Balanced",
    icon: Scale,
    color: "#10b981",
    laneWash: "rgba(16, 185, 129, 0.06)",
    pillBg: "rgba(16, 185, 129, 0.22)",
    nodeBg: "rgba(16, 185, 129, 0.16)",
    border: "rgba(16, 185, 129, 0.70)",
  },
  comprehensive: {
    label: "Comprehensive",
    icon: Telescope,
    color: "#a78bfa",
    laneWash: "rgba(167, 139, 250, 0.06)",
    pillBg: "rgba(167, 139, 250, 0.22)",
    nodeBg: "rgba(167, 139, 250, 0.16)",
    border: "rgba(167, 139, 250, 0.70)",
  },
};

const FLAVOR_ORDER: FlavorKey[] = ["fast", "balanced", "comprehensive"];

// Layout constants for the SVG canvas.
const LANE_HEIGHT = 110;
const NODE_HEIGHT = 48;
const HORIZONTAL_PADDING = 28;
const COLUMN_MIN = 152;
// Wider gap so each arrow has room for a stacked "Nmo / +N%" edge label
// without overlapping into the adjacent nodes.
const COLUMN_GAP = 72;
const LANE_LABEL_WIDTH = 168;
// Edge labels are rendered in a fixed-width zone centered above the arrow —
// wider than COLUMN_GAP so 3-digit percentages fit cleanly.
const EDGE_LABEL_WIDTH = 84;

interface ResolvedNode {
  label: string;
  isStart: boolean;
  isTarget: boolean;
}

function pathToNodes(path: PivotPath): ResolvedNode[] {
  if (path.full_path.length === 0) return [];
  const nodes: ResolvedNode[] = [
    { label: path.full_path[0].from_skill, isStart: true, isTarget: false },
  ];
  for (let i = 0; i < path.full_path.length; i += 1) {
    const edge = path.full_path[i];
    const isLast = i === path.full_path.length - 1;
    nodes.push({ label: edge.to_skill, isStart: false, isTarget: isLast });
  }
  return nodes;
}

export function TrajectoryGraphCard({
  paths,
  similar,
  targetRole,
}: TrajectoryGraphCardProps) {
  const orderedPaths = FLAVOR_ORDER
    .map((flavor) => paths.find((p) => p.flavor === flavor))
    .filter((p): p is PivotPath => Boolean(p && p.full_path.length > 0));

  const maxColumns = orderedPaths.reduce(
    (max, p) => Math.max(max, pathToNodes(p).length),
    0,
  );

  const topSimilar = [...similar]
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const canvasWidth =
    LANE_LABEL_WIDTH + HORIZONTAL_PADDING + maxColumns * COLUMN_MIN +
    Math.max(maxColumns - 1, 0) * COLUMN_GAP + HORIZONTAL_PADDING;
  const canvasHeight = LANE_HEIGHT * Math.max(orderedPaths.length, 1) + 24;

  if (orderedPaths.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardDescription>Trajectory graph</CardDescription>
          <CardTitle className="flex items-center gap-2 text-base">
            <GitBranch className="size-4 text-primary" />
            Visualize pivot routes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            No reachable paths in the skill-transitions graph yet — try a more
            populated source skill or seed more trajectories via the ETL.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardDescription>Trajectory graph</CardDescription>
        <CardTitle className="flex items-center gap-2 text-base">
          <GitBranch className="size-4 text-primary" />
          Three routes laid out side-by-side
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Each lane is a separate{" "}
          <code className="rounded bg-muted px-1 text-xs">$graphLookup</code>{" "}
          discovery. Edge labels show average months and salary lift sourced
          from real-cohort transitions.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Legend />

        <div className="overflow-x-auto rounded-lg border bg-linear-to-br from-muted/60 to-background p-3 dark:from-slate-900/60 dark:to-slate-950/80">
          <svg
            width={canvasWidth}
            height={canvasHeight}
            viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
            role="img"
            aria-label="Pivot trajectory graph"
            className="text-foreground"
          >
            <defs>
              {FLAVOR_ORDER.map((flavor) => (
                <marker
                  key={flavor}
                  id={`arrow-${flavor}`}
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path
                    d="M 0 0 L 10 5 L 0 10 z"
                    fill={FLAVOR_CONFIG[flavor].color}
                  />
                </marker>
              ))}
            </defs>

            {orderedPaths.map((path, laneIdx) => (
              <Lane
                key={path.flavor}
                path={path}
                laneIdx={laneIdx}
                maxColumns={maxColumns}
              />
            ))}
          </svg>
        </div>

        {topSimilar.length > 0 && (
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              Where people with your stack land →{" "}
              <span className="font-mono text-foreground">{targetRole}</span>{" "}
              and beyond
            </div>
            <ul className="flex flex-wrap gap-2">
              {topSimilar.map((g) => (
                <li
                  key={g.role}
                  className="flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs"
                >
                  <span className="font-medium text-foreground">{g.role}</span>
                  <span className="font-mono text-muted-foreground">
                    {g.count.toLocaleString()} devs
                  </span>
                  {g.avg_salary_usd ? (
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">
                      ${Math.round(g.avg_salary_usd / 1000)}k
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs">
      {FLAVOR_ORDER.map((flavor) => {
        const meta = FLAVOR_CONFIG[flavor];
        const Icon = meta.icon;
        return (
          <Badge
            key={flavor}
            variant="outline"
            className="gap-1.5 font-semibold"
            style={{
              backgroundColor: meta.pillBg,
              color: meta.color,
              borderColor: meta.border,
            }}
          >
            <Icon className="size-3" />
            {meta.label}
          </Badge>
        );
      })}
      <span className="text-muted-foreground">
        Edge label · <span className="font-mono text-foreground">months</span> ·{" "}
        <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-300">
          +% lift
        </span>
      </span>
    </div>
  );
}

interface LaneProps {
  path: PivotPath;
  laneIdx: number;
  maxColumns: number;
}

function Lane({ path, laneIdx, maxColumns: _maxColumns }: LaneProps) {
  const nodes = pathToNodes(path);
  const meta = FLAVOR_CONFIG[path.flavor];
  const laneY = laneIdx * LANE_HEIGHT;
  const centerY = laneY + LANE_HEIGHT / 2;

  return (
    <g>
      {/* Lane wash + 1 px divider below for separation between lanes */}
      <rect
        x={0}
        y={laneY}
        width="100%"
        height={LANE_HEIGHT}
        fill={meta.laneWash}
      />
      <line
        x1={0}
        y1={laneY + LANE_HEIGHT - 0.5}
        x2="100%"
        y2={laneY + LANE_HEIGHT - 0.5}
        stroke="currentColor"
        strokeOpacity={0.08}
        strokeWidth={1}
      />

      {/* Lane label on the far left — two rows with comfortable spacing.
          Outer foreignObject height matches LANE_HEIGHT - 16 so the pill never
          gets vertically clipped at any LANE_HEIGHT setting. */}
      <foreignObject
        x={6}
        y={laneY + 12}
        width={LANE_LABEL_WIDTH - 16}
        height={LANE_HEIGHT - 24}
      >
        <div
          className="flex h-full flex-col justify-center gap-1 rounded-md border px-3 py-2 text-xs font-semibold shadow-sm"
          style={{
            backgroundColor: meta.pillBg,
            color: meta.color,
            borderColor: meta.border,
          }}
        >
          <span className="flex items-center gap-1.5 text-[13px]">
            {React.createElement(meta.icon, { className: "size-4" })}
            <span>{meta.label}</span>
          </span>
          <div className="flex items-center gap-2 font-mono text-[11px] font-medium opacity-95">
            <span>{Math.round(path.total_months)}mo</span>
            <span className="opacity-50">·</span>
            <span className="text-emerald-700 dark:text-emerald-300">
              +{Math.round(path.total_lift_pct)}%
            </span>
          </div>
        </div>
      </foreignObject>

      {/* Nodes + edges */}
      {nodes.map((node, idx) => {
        const x =
          LANE_LABEL_WIDTH + HORIZONTAL_PADDING + idx * (COLUMN_MIN + COLUMN_GAP);
        const nodeWidth = COLUMN_MIN;
        const nodeX = x;
        const nodeY = centerY - NODE_HEIGHT / 2;

        const prevX =
          idx > 0
            ? LANE_LABEL_WIDTH + HORIZONTAL_PADDING +
              (idx - 1) * (COLUMN_MIN + COLUMN_GAP) +
              nodeWidth
            : null;
        const edgeData = idx > 0 ? path.full_path[idx - 1] : null;

        return (
          <g key={`${path.flavor}-${idx}`}>
            {prevX !== null && edgeData ? (
              <>
                <line
                  x1={prevX}
                  y1={centerY}
                  x2={nodeX}
                  y2={centerY}
                  stroke={meta.color}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  markerEnd={`url(#arrow-${path.flavor})`}
                />
                {/*
                  Edge-label zone — centered above the arrow midpoint.
                  EDGE_LABEL_WIDTH > COLUMN_GAP so 3-digit percentages like
                  "+101%" don't get clipped or overlap the adjacent node.
                */}
                <foreignObject
                  x={(prevX + nodeX) / 2 - EDGE_LABEL_WIDTH / 2}
                  y={centerY - 40}
                  width={EDGE_LABEL_WIDTH}
                  height={32}
                >
                  <div className="flex items-center justify-center gap-1 text-[11px] leading-none">
                    {edgeData.months ? (
                      <span className="rounded-sm border border-border/70 bg-background px-1.5 py-0.5 font-mono font-semibold text-foreground shadow-sm">
                        {Math.round(edgeData.months)}mo
                      </span>
                    ) : null}
                    {edgeData.lift ? (
                      <span className="rounded-sm border border-emerald-400/50 bg-background px-1.5 py-0.5 font-mono font-semibold text-emerald-700 shadow-sm dark:text-emerald-300">
                        +{Math.round(edgeData.lift)}%
                      </span>
                    ) : null}
                  </div>
                </foreignObject>
              </>
            ) : null}

            <foreignObject
              x={nodeX}
              y={nodeY}
              width={nodeWidth}
              height={NODE_HEIGHT}
            >
              <div
                className="flex h-full items-center justify-center rounded-md border px-2 text-center text-[12px] font-semibold leading-tight shadow-sm transition-shadow hover:shadow-md"
                style={
                  node.isTarget
                    ? {
                        backgroundColor: meta.color,
                        borderColor: meta.color,
                        color: "#ffffff",
                      }
                    : node.isStart
                      ? {
                          backgroundColor: "rgba(148, 163, 184, 0.18)",
                          borderColor: "rgba(148, 163, 184, 0.55)",
                          color: "var(--foreground)",
                        }
                      : {
                          backgroundColor: meta.nodeBg,
                          borderColor: meta.border,
                          color: "var(--foreground)",
                        }
                }
                title={node.label}
              >
                <span className="line-clamp-2">{node.label}</span>
              </div>
            </foreignObject>
          </g>
        );
      })}
    </g>
  );
}
