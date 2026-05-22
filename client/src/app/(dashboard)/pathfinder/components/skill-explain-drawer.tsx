"use client";

import * as React from "react";
import {
  AlertTriangle,
  Check,
  Code2,
  Copy,
  Database,
  GitBranch,
  Sparkles,
  Users,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DialogClose } from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "@/contexts/locale-context";
import { pathfinderApi, PathFinderApiError } from "@/lib/pathfinder/api";
import type {
  RoleDistributionRow,
  SampleTrajectory,
  SkillExplainResponse,
  SkillMetadata,
  SkillTransitionRow,
} from "@/lib/pathfinder/types";
import { AggregationPipelineBadges } from "./honest-mode";

interface SkillExplainDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skillName: string;
  targetRole: string;
}

type FetchState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; data: SkillExplainResponse }
  | { kind: "error"; message: string };

/**
 * Centered modal that explains why a missing skill was recommended.
 *
 * Layout: full-width on small screens, capped at ~960px on desktop, height
 * capped at 85vh with the body scrolling internally so the JSON pipeline
 * blocks remain readable without pushing the close action off-screen.
 */
export function SkillExplainDrawer({
  open,
  onOpenChange,
  skillName,
  targetRole,
}: SkillExplainDrawerProps) {
  const t = useTranslations();
  const [state, setState] = React.useState<FetchState>({ kind: "idle" });

  React.useEffect(() => {
    if (!open || !skillName || !targetRole) return;
    let cancelled = false;
    setState({ kind: "loading" });
    pathfinderApi
      .explainSkill({ skill_name: skillName, target_role: targetRole })
      .then((data) => {
        if (!cancelled) setState({ kind: "ready", data });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof PathFinderApiError
            ? err.message
            : (err as Error).message ?? "Unknown error";
        setState({ kind: "error", message });
      });
    return () => {
      cancelled = true;
    };
  }, [open, skillName, targetRole]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-4xl lg:max-w-5xl"
        showCloseButton
      >
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogDescription className="flex items-center gap-2 text-xs">
            <Sparkles className="size-3.5" />
            {t("pathfinder.skillExplain.subtitle", { role: targetRole })}
          </DialogDescription>
          <DialogTitle className="text-lg">
            {t("pathfinder.skillExplain.title", { skill: skillName })}
          </DialogTitle>
        </DialogHeader>
        <Separator />

        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-4 px-5 py-4">
            {state.kind === "loading" ? (
              <LoadingBody />
            ) : state.kind === "error" ? (
              <ErrorBody message={state.message} />
            ) : state.kind === "ready" ? (
              <Body data={state.data} />
            ) : null}
          </div>
        </ScrollArea>

        <Separator />
        <DialogFooter className="px-5 py-3">
          <DialogClose asChild>
            <Button variant="outline" size="sm">
              {t("common.close")}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Body ──────────────────────────────────────────────────────────────────

function Body({ data }: { data: SkillExplainResponse }) {
  const t = useTranslations();
  const hasEvidence =
    data.transition_evidence.direct != null ||
    data.transition_evidence.role_distribution.length > 0;
  const hasSamples = data.sample_trajectories.length > 0;

  return (
    <>
      <AggregationPipelineBadges stages={data.aggregation_stages} />

      <Tabs defaultValue="evidence" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="evidence">
            <GitBranch className="mr-1 size-3.5" />
            {t("pathfinder.skillExplain.tabs.evidence")}
          </TabsTrigger>
          <TabsTrigger value="metadata">
            <Database className="mr-1 size-3.5" />
            {t("pathfinder.skillExplain.tabs.metadata")}
          </TabsTrigger>
          <TabsTrigger value="pipeline">
            <Code2 className="mr-1 size-3.5" />
            {t("pathfinder.skillExplain.tabs.pipeline")}
          </TabsTrigger>
        </TabsList>

        {/* ── Evidence tab ─────────────────────────────────────────── */}
        <TabsContent value="evidence" className="flex flex-col gap-4 pt-4">
          {!hasEvidence ? (
            <EmptyHint
              text={t("pathfinder.skillExplain.noEvidence", {
                skill: data.skill_name,
                role: data.target_role,
              })}
            />
          ) : (
            <>
              {data.transition_evidence.direct ? (
                <DirectTransitionPanel row={data.transition_evidence.direct} />
              ) : null}
              {data.transition_evidence.role_distribution.length > 0 ? (
                <RoleDistributionPanel
                  rows={data.transition_evidence.role_distribution}
                />
              ) : null}
            </>
          )}

          <Separator />
          <div>
            <SectionTitle
              icon={<Users className="size-3.5" />}
              text={t("pathfinder.skillExplain.samplePivoters")}
            />
            {hasSamples ? (
              <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                {data.sample_trajectories.map((row) => (
                  <SampleRow key={row.anon_id} row={row} />
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                {t("pathfinder.skillExplain.noSamples")}
              </p>
            )}
          </div>
        </TabsContent>

        {/* ── Metadata tab ─────────────────────────────────────────── */}
        <TabsContent value="metadata" className="pt-4">
          <MetadataPanel metadata={data.metadata} />
        </TabsContent>

        {/* ── Pipeline tab ─────────────────────────────────────────── */}
        <TabsContent value="pipeline" className="flex flex-col gap-3 pt-4">
          <p className="text-xs text-muted-foreground">
            {t("pathfinder.skillExplain.pipelineHint")}
          </p>
          <div className="grid gap-3 lg:grid-cols-2">
            <PipelineBlock
              label="skill_transitions"
              sub={t("pathfinder.skillExplain.pipelineSubs.evidence")}
              value={data.pipelines.skill_transitions_pipeline}
            />
            <PipelineBlock
              label="skills"
              sub={t("pathfinder.skillExplain.pipelineSubs.metadata")}
              value={data.pipelines.skill_metadata_pipeline}
            />
            <PipelineBlock
              label="career_trajectories"
              sub={t("pathfinder.skillExplain.pipelineSubs.distribution")}
              value={data.pipelines.role_distribution_pipeline}
            />
            <PipelineBlock
              label="career_trajectories"
              sub={t("pathfinder.skillExplain.pipelineSubs.samples")}
              value={data.pipelines.sample_trajectories_pipeline}
            />
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}

// ─── Sub-panels ────────────────────────────────────────────────────────────

function DirectTransitionPanel({ row }: { row: SkillTransitionRow }) {
  const t = useTranslations();
  const lift =
    row.avg_salary_lift_pct != null ? Math.round(row.avg_salary_lift_pct) : null;
  const months =
    row.avg_months != null ? Math.round(row.avg_months) : null;
  return (
    <div className="rounded-lg border bg-card p-3">
      <SectionTitle
        icon={<GitBranch className="size-3.5" />}
        text={t("pathfinder.skillExplain.directEvidence")}
      />
      <p className="mt-1 text-xs text-muted-foreground">
        <code className="font-mono">skill_transitions</code>{" "}
        {t("pathfinder.skillExplain.directEvidenceDesc", {
          skill: row.from_skill,
          role: row.to_skill,
        })}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat
          label={t("pathfinder.skillExplain.frequency")}
          value={(row.frequency ?? 0).toLocaleString()}
        />
        <Stat
          label={t("pathfinder.skillExplain.avgMonths")}
          value={months != null ? `${months} mo` : "—"}
        />
        <Stat
          label={t("pathfinder.skillExplain.avgLift")}
          value={lift != null ? `+${lift}%` : "—"}
          accent
        />
        <Stat
          label={t("pathfinder.skillExplain.confidence")}
          value={row.confidence ?? "—"}
        />
      </div>
    </div>
  );
}

function RoleDistributionPanel({ rows }: { rows: RoleDistributionRow[] }) {
  const t = useTranslations();
  const max = rows.reduce((m, r) => Math.max(m, r.count), 1);
  return (
    <div className="rounded-lg border bg-card p-3">
      <SectionTitle
        icon={<Users className="size-3.5" />}
        text={t("pathfinder.skillExplain.distribution")}
      />
      <p className="mt-1 text-xs text-muted-foreground">
        {t("pathfinder.skillExplain.distributionHint")}
      </p>
      <ul className="mt-3 flex flex-col gap-1.5">
        {rows.map((row) => {
          const width = Math.max(4, Math.round((row.count / max) * 100));
          const lift =
            row.avg_salary_lift_pct != null
              ? Math.round(row.avg_salary_lift_pct)
              : null;
          return (
            <li key={row.role} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="truncate font-medium">{row.role}</span>
                <span className="font-mono tabular-nums text-muted-foreground">
                  {row.count}
                  {lift != null ? ` · +${lift}%` : ""}
                </span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary/70"
                  style={{ width: `${width}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SampleRow({ row }: { row: SampleTrajectory }) {
  const lift = row.matched_pivot?.salary_lift_pct;
  const months = row.matched_pivot?.months_to_pivot;
  return (
    <li className="rounded-lg border bg-muted/30 p-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-muted-foreground">{row.anon_id}</span>
        <Badge variant="outline" className="text-[10px]">
          {row.source}
        </Badge>
      </div>
      <p className="mt-1 text-sm">
        {row.matched_pivot?.from_role ?? row.starting_role ?? "—"}{" "}
        <span className="text-muted-foreground">→</span>{" "}
        <span className="text-primary">{row.current_role}</span>
      </p>
      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-muted-foreground">
        {months != null ? <span>{Math.round(months)} mo</span> : null}
        {lift != null ? (
          <span className="text-emerald-600 dark:text-emerald-400">
            +{Math.round(lift)}%
          </span>
        ) : null}
        <span>· {row.total_years_exp} yrs total</span>
      </p>
    </li>
  );
}

function MetadataPanel({ metadata }: { metadata: SkillMetadata | null }) {
  const t = useTranslations();
  if (!metadata) {
    return (
      <EmptyHint text={t("pathfinder.skillExplain.noMetadata")} />
    );
  }
  return (
    <div className="flex flex-col gap-3 text-sm">
      {metadata.description ? (
        <p className="leading-relaxed">{metadata.description}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {metadata.category ? (
          <Badge variant="secondary" className="font-mono text-[10px]">
            {metadata.category}
          </Badge>
        ) : null}
        {metadata.is_emerging ? (
          <Badge
            variant="outline"
            className="border-violet-400/40 bg-violet-500/10 text-[10px] text-violet-700 dark:text-violet-300"
          >
            {t("pathfinder.skillExplain.emerging")}
          </Badge>
        ) : null}
        {metadata.popularity_rank != null ? (
          <Badge variant="outline" className="font-mono text-[10px]">
            #{metadata.popularity_rank}
          </Badge>
        ) : null}
        {metadata.vn_demand_score != null ? (
          <Badge variant="outline" className="font-mono text-[10px]">
            VN demand · {Math.round(metadata.vn_demand_score * 100) / 100}
          </Badge>
        ) : null}
      </div>

      {metadata.prerequisites && metadata.prerequisites.length > 0 ? (
        <div>
          <SectionTitle
            icon={<GitBranch className="size-3.5" />}
            text={t("pathfinder.skillExplain.prerequisites")}
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {metadata.prerequisites.map((p) => (
              <Badge key={p} variant="outline" className="text-[10px]">
                {p}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      {metadata.related_skills && metadata.related_skills.length > 0 ? (
        <div>
          <SectionTitle
            icon={<Sparkles className="size-3.5" />}
            text={t("pathfinder.skillExplain.relatedSkills")}
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {metadata.related_skills.map((p) => (
              <Badge key={p} variant="outline" className="text-[10px]">
                {p}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PipelineBlock({
  label,
  sub,
  value,
}: {
  label: string;
  sub: string;
  value: unknown[];
}) {
  const t = useTranslations();
  const [copied, setCopied] = React.useState(false);
  const json = React.useMemo(() => JSON.stringify(value, null, 2), [value]);

  const onCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can be denied (insecure context, permissions). Silently
      // fail; the user can still select text manually.
    }
  }, [json]);

  return (
    <div className="flex h-full flex-col rounded-lg border bg-card">
      <div className="flex items-start justify-between gap-2 border-b px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs">
            db.<span className="text-primary">{label}</span>.aggregate(…)
          </p>
          <p className="text-[11px] leading-snug text-muted-foreground">{sub}</p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 shrink-0 gap-1 text-xs"
          onClick={onCopy}
        >
          {copied ? (
            <>
              <Check className="size-3.5" />
              {t("pathfinder.skillExplain.copied")}
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              {t("pathfinder.skillExplain.copy")}
            </>
          )}
        </Button>
      </div>
      <pre className="max-h-45 flex-1 overflow-auto px-3 py-2 font-mono text-[11px] leading-relaxed">
        <code>{json}</code>
      </pre>
    </div>
  );
}

// ─── Generic helpers ───────────────────────────────────────────────────────

function SectionTitle({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
      {icon}
      {text}
    </div>
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
    <div className="flex flex-col gap-0.5 rounded-md border bg-background p-2">
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

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
      <AlertTriangle className="mt-0.5 size-3.5 text-amber-600 dark:text-amber-400" />
      <p>{text}</p>
    </div>
  );
}

function LoadingBody() {
  const t = useTranslations();
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
      <Sparkles className="size-4 animate-pulse" />
      {t("pathfinder.skillExplain.loading")}
    </div>
  );
}

function ErrorBody({ message }: { message: string }) {
  const t = useTranslations();
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
      <div className="flex items-center gap-2 font-medium text-destructive">
        <AlertTriangle className="size-4" />
        {t("pathfinder.skillExplain.errorTitle")}
      </div>
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  );
}
