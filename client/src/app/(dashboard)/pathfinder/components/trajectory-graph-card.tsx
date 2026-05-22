"use client";

import * as React from "react";
import {
  GitBranch,
  Info,
  Rabbit,
  Scale,
  Telescope,
  type LucideIcon,
} from "lucide-react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  Position,
  Handle,
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
  type NodeTypes,
  type EdgeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "@/contexts/locale-context";
import type { PivotPath, SimilarDevsGroup } from "@/lib/pathfinder/types";
import { DataSourceBadges } from "./honest-mode";

interface TrajectoryGraphCardProps {
  paths: PivotPath[];
  similar: SimilarDevsGroup[];
  targetRole: string;
}

type FlavorKey = "fast" | "balanced" | "comprehensive";

interface FlavorMeta {
  icon: LucideIcon;
  /** Solid accent color used for edges, target node fill, and lane label text. */
  color: string;
  /** Very translucent wash for the lane backdrop. */
  laneWash: string;
  /** Translucent fill for the lane label pill. */
  pillBg: string;
  /** Tinted fill for the middle skill nodes. */
  nodeBg: string;
  /** Solid border color matching the flavor for middle nodes & lane pill. */
  border: string;
}

const FLAVOR_CONFIG: Record<FlavorKey, FlavorMeta> = {
  fast: {
    icon: Rabbit,
    color: "#f97316",
    laneWash: "rgba(249, 115, 22, 0.06)",
    pillBg: "rgba(249, 115, 22, 0.22)",
    nodeBg: "rgba(249, 115, 22, 0.16)",
    border: "rgba(249, 115, 22, 0.70)",
  },
  balanced: {
    icon: Scale,
    color: "#10b981",
    laneWash: "rgba(16, 185, 129, 0.06)",
    pillBg: "rgba(16, 185, 129, 0.22)",
    nodeBg: "rgba(16, 185, 129, 0.16)",
    border: "rgba(16, 185, 129, 0.70)",
  },
  comprehensive: {
    icon: Telescope,
    color: "#a78bfa",
    laneWash: "rgba(167, 139, 250, 0.06)",
    pillBg: "rgba(167, 139, 250, 0.22)",
    nodeBg: "rgba(167, 139, 250, 0.16)",
    border: "rgba(167, 139, 250, 0.70)",
  },
};

const FLAVOR_ORDER: FlavorKey[] = ["fast", "balanced", "comprehensive"];

// Layout constants. The graph is laid out left-to-right by depth, one lane
// per flavor stacked vertically.
const LANE_HEIGHT = 132;
const LANE_GAP = 8;
const NODE_WIDTH = 168;
const NODE_HEIGHT = 56;
const COLUMN_GAP = 92;
const LANE_LABEL_WIDTH = 188;
const PADDING_X = 24;
const PADDING_TOP = 12;

// ─── Node + edge data shapes ────────────────────────────────────────────────

type SkillNodeData = {
  label: string;
  isStart: boolean;
  isTarget: boolean;
  meta: FlavorMeta;
  flavor: FlavorKey;
};

type LaneNodeData = {
  meta: FlavorMeta;
  flavor: FlavorKey;
  path: PivotPath;
  laneWidth: number;
};

type EdgeData = {
  months?: number;
  lift?: number;
  color: string;
};

type SkillNodeType = Node<SkillNodeData, "skill">;
type LaneNodeType = Node<LaneNodeData, "lane">;
type LabeledEdgeType = Edge<EdgeData, "labeled">;

// ─── Helpers ────────────────────────────────────────────────────────────────

interface ResolvedSkill {
  label: string;
  isStart: boolean;
  isTarget: boolean;
}

function pathToSkillSequence(path: PivotPath): ResolvedSkill[] {
  if (path.full_path.length === 0) return [];
  const out: ResolvedSkill[] = [
    { label: path.full_path[0].from_skill, isStart: true, isTarget: false },
  ];
  for (let i = 0; i < path.full_path.length; i += 1) {
    const edge = path.full_path[i];
    const isLast = i === path.full_path.length - 1;
    out.push({ label: edge.to_skill, isStart: false, isTarget: isLast });
  }
  return out;
}

interface GraphBuild {
  nodes: Array<LaneNodeType | SkillNodeType>;
  edges: LabeledEdgeType[];
  width: number;
  height: number;
}

function buildGraph(orderedPaths: PivotPath[]): GraphBuild {
  if (orderedPaths.length === 0) {
    return { nodes: [], edges: [], width: 0, height: 0 };
  }
  const maxCols = orderedPaths.reduce(
    (max, p) => Math.max(max, pathToSkillSequence(p).length),
    0,
  );
  const totalWidth =
    LANE_LABEL_WIDTH +
    PADDING_X +
    maxCols * NODE_WIDTH +
    Math.max(maxCols - 1, 0) * COLUMN_GAP +
    PADDING_X;

  const nodes: Array<LaneNodeType | SkillNodeType> = [];
  const edges: LabeledEdgeType[] = [];

  orderedPaths.forEach((path, laneIdx) => {
    const meta = FLAVOR_CONFIG[path.flavor as FlavorKey];
    const laneY = PADDING_TOP + laneIdx * (LANE_HEIGHT + LANE_GAP);

    // ── Lane backdrop (rendered first so it sits behind everything) ──
    nodes.push({
      id: `lane-${path.flavor}`,
      type: "lane",
      position: { x: 0, y: laneY },
      data: {
        meta,
        flavor: path.flavor as FlavorKey,
        path,
        laneWidth: totalWidth,
      },
      draggable: false,
      selectable: false,
      focusable: false,
      zIndex: -1,
      style: { width: totalWidth, height: LANE_HEIGHT, pointerEvents: "none" },
    });

    // ── Skill nodes ──
    const skills = pathToSkillSequence(path);
    skills.forEach((sk, idx) => {
      const x =
        LANE_LABEL_WIDTH +
        PADDING_X +
        idx * (NODE_WIDTH + COLUMN_GAP);
      const y = laneY + (LANE_HEIGHT - NODE_HEIGHT) / 2;
      const nodeId = `${path.flavor}-${idx}`;

      nodes.push({
        id: nodeId,
        type: "skill",
        position: { x, y },
        data: {
          label: sk.label,
          isStart: sk.isStart,
          isTarget: sk.isTarget,
          meta,
          flavor: path.flavor as FlavorKey,
        },
        draggable: false,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        style: { width: NODE_WIDTH, height: NODE_HEIGHT },
      });

      if (idx > 0) {
        const edge = path.full_path[idx - 1];
        edges.push({
          id: `e-${path.flavor}-${idx}`,
          source: `${path.flavor}-${idx - 1}`,
          target: nodeId,
          type: "labeled",
          data: { months: edge.months, lift: edge.lift, color: meta.color },
          style: { stroke: meta.color, strokeWidth: 2.5 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: meta.color,
            width: 18,
            height: 18,
          },
        });
      }
    });
  });

  const totalHeight =
    PADDING_TOP * 2 + orderedPaths.length * (LANE_HEIGHT + LANE_GAP);
  return { nodes, edges, width: totalWidth, height: totalHeight };
}

// ─── Custom node + edge components ──────────────────────────────────────────

function LaneNode({ data }: NodeProps<LaneNodeType>) {
  const t = useTranslations();
  const { meta, path, laneWidth, flavor } = data;
  const Icon = meta.icon;
  return (
    <div
      className="relative h-full"
      style={{
        width: laneWidth,
        backgroundColor: meta.laneWash,
        borderBottom: "1px solid color-mix(in oklab, currentColor 8%, transparent)",
      }}
    >
      <div
        className="absolute left-2 top-1/2 -translate-y-1/2 flex h-[calc(100%-16px)] flex-col justify-center gap-1 rounded-md border px-3 py-2 text-xs font-semibold shadow-sm"
        style={{
          width: LANE_LABEL_WIDTH - 16,
          backgroundColor: meta.pillBg,
          color: meta.color,
          borderColor: meta.border,
        }}
      >
        <span className="flex items-center gap-1.5 text-[13px]">
          <Icon className="size-4" />
          <span>{t(`pivotFlavor.${flavor}`)} candidate</span>
        </span>
        <div className="flex items-center gap-2 font-mono text-[11px] font-medium opacity-95">
          <span>est. {Math.round(path.total_months)}mo</span>
          <span className="opacity-50">·</span>
          <span className="text-emerald-700 dark:text-emerald-300">
            est. +{Math.round(path.total_lift_pct)}%
          </span>
        </div>
      </div>
    </div>
  );
}

function SkillNode({ data }: NodeProps<SkillNodeType>) {
  const { label, isStart, isTarget, meta } = data;
  const style: React.CSSProperties = isTarget
    ? { backgroundColor: meta.color, borderColor: meta.color, color: "#ffffff" }
    : isStart
      ? {
          backgroundColor: "rgba(148, 163, 184, 0.18)",
          borderColor: "rgba(148, 163, 184, 0.55)",
          color: "var(--foreground)",
        }
      : {
          backgroundColor: meta.nodeBg,
          borderColor: meta.border,
          color: "var(--foreground)",
        };

  return (
    <div
      className="flex h-full w-full items-center justify-center rounded-md border px-2 text-center text-[12px] font-semibold leading-tight shadow-sm transition-shadow hover:shadow-md"
      style={style}
      title={label}
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={false}
        style={{ opacity: 0, width: 1, height: 1, border: "none" }}
      />
      <span className="line-clamp-2">{label}</span>
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={false}
        style={{ opacity: 0, width: 1, height: 1, border: "none" }}
      />
    </div>
  );
}

function LabeledEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  data,
}: EdgeProps<LabeledEdgeType>) {
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 12,
  });

  return (
    <>
      <BaseEdge id={id} path={path} style={style} markerEnd={markerEnd} />
      <EdgeLabelRenderer>
        <div
          className="pointer-events-none flex items-center gap-1 text-[11px] leading-none"
          style={{
            position: "absolute",
            transform: `translate(-50%, -100%) translate(${labelX}px, ${labelY}px)`,
          }}
        >
          {data?.months ? (
            <span className="rounded-sm border border-border/70 bg-background px-1.5 py-0.5 font-mono font-semibold text-foreground shadow-sm">
              ~{Math.round(data.months)}mo
            </span>
          ) : null}
          {data?.lift ? (
            <span className="rounded-sm border border-emerald-400/50 bg-background px-1.5 py-0.5 font-mono font-semibold text-emerald-700 shadow-sm dark:text-emerald-300">
              ~+{Math.round(data.lift)}%
            </span>
          ) : null}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

const NODE_TYPES: NodeTypes = {
  lane: LaneNode as unknown as NodeTypes[string],
  skill: SkillNode as unknown as NodeTypes[string],
};
const EDGE_TYPES: EdgeTypes = {
  labeled: LabeledEdge as unknown as EdgeTypes[string],
};

// ─── Card ───────────────────────────────────────────────────────────────────

export function TrajectoryGraphCard({
  paths,
  similar,
  targetRole,
}: TrajectoryGraphCardProps) {
  const t = useTranslations();
  const orderedPaths = React.useMemo(
    () =>
      FLAVOR_ORDER.map((flavor) => paths.find((p) => p.flavor === flavor)).filter(
        (p): p is PivotPath => Boolean(p && p.full_path.length > 0),
      ),
    [paths],
  );

  const { nodes, edges, height } = React.useMemo(
    () => buildGraph(orderedPaths),
    [orderedPaths],
  );

  const topSimilar = React.useMemo(
    () => [...similar].sort((a, b) => b.count - a.count).slice(0, 3),
    [similar],
  );

  if (orderedPaths.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardDescription>{t("pathfinder.trajectory.description")}</CardDescription>
          <CardTitle className="flex items-center gap-2 text-base">
            <GitBranch className="size-4 text-primary" />
            {t("pathfinder.trajectory.titleEmpty")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            {t("pathfinder.trajectory.empty")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardDescription>{t("pathfinder.trajectory.description")}</CardDescription>
        <CardTitle className="flex items-center gap-2 text-base">
          <GitBranch className="size-4 text-primary" />
          {t("pathfinder.trajectory.title")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("pathfinder.trajectory.subtitle")}
        </p>
        <DataSourceBadges
          className="pt-1"
          sources={["skill_transitions", "synthetic_vn_cohort", "not_real_user_data"]}
        />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <EvidenceNote />
        <Legend />

        <div
          className="trajectory-flow relative w-full overflow-hidden rounded-lg border bg-linear-to-br from-muted/60 to-background dark:from-slate-900/60 dark:to-slate-950/80"
          style={{ height: Math.max(height + 24, 320) }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={NODE_TYPES}
            edgeTypes={EDGE_TYPES}
            fitView
            fitViewOptions={{ padding: 0.15, maxZoom: 1 }}
            minZoom={0.4}
            maxZoom={1.5}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnScroll
            panOnScrollMode={"free" as never}
            zoomOnScroll={false}
            zoomOnPinch
            proOptions={{ hideAttribution: true }}
            colorMode="system"
          >
            <Background gap={24} size={1} className="opacity-50" />
            <Controls
              position="bottom-left"
              showInteractive={false}
              className="bg-background/80! border! text-foreground!"
            />
            {nodes.length > 12 ? (
              <MiniMap
                pannable
                zoomable
                position="bottom-right"
                className="border! bg-background/80!"
                nodeColor={(n) => {
                  const d = n.data as Partial<SkillNodeData | LaneNodeData>;
                  return d.meta?.color ?? "#94a3b8";
                }}
                nodeStrokeWidth={0}
              />
            ) : null}
          </ReactFlow>
        </div>

        {topSimilar.length > 0 && (
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              Similar synthetic cohorts also land near{" "}
              <span className="font-mono text-foreground">{targetRole}</span>{" "}
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
  const t = useTranslations();
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
            {t(`pivotFlavor.${flavor}`)}
          </Badge>
        );
      })}
      <span className="text-muted-foreground">
        Edge label · <span className="font-mono text-foreground">estimated months</span> ·{" "}
        <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-300">
          estimated +% lift
        </span>
      </span>
    </div>
  );
}

function EvidenceNote() {
  const t = useTranslations();
  return (
    <div className="flex items-start gap-2 rounded-md border border-amber-400/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
      <Info className="mt-0.5 size-3.5 shrink-0" />
      <p>{t("pathfinder.trajectory.evidenceNote")}</p>
    </div>
  );
}
