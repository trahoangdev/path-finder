"use client";

import { AlertTriangle, Sparkles, Compass } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "@/contexts/locale-context";
import type { AnalyzeRequest, AnalyzeResponse } from "@/lib/pathfinder/types";
import { ProfileCard } from "./profile-card";
import { GapAnalysisCard } from "./gap-analysis-card";
import { PivotPathsCard } from "./pivot-paths-card";
import { TrajectoryGraphCard } from "./trajectory-graph-card";
import { ProofDrawerCard } from "./proof-drawer-card";
import { SimilarDevsCard } from "./similar-devs-card";
import { CoursesCard } from "./courses-card";
import { SalaryBandCard } from "./salary-band-card";
import { TimingsCard } from "./timings-card";
import { HonestModeProvider } from "./honest-mode";
// import { HonestModeControl } from "./honest-mode-control";

type ViewState =
  | { kind: "idle" }
  | { kind: "loading"; payload: AnalyzeRequest; startedAt: number }
  | { kind: "ready"; payload: AnalyzeRequest; data: AnalyzeResponse }
  | { kind: "error"; payload: AnalyzeRequest; message: string };

interface AnalysisResultsProps {
  state: ViewState;
}

export function AnalysisResults({ state }: AnalysisResultsProps) {
  if (state.kind === "idle") return <EmptyState />;
  if (state.kind === "loading") return <LoadingState />;
  if (state.kind === "error") return <ErrorState message={state.message} />;

  const { data, payload } = state;
  return (
    <HonestModeProvider>
      <div className="flex flex-col gap-4">
        <ProfileCard profile={data.profile} targetRole={payload.target_role} />
        {/* <HonestModeControl /> */}
        <GapAnalysisCard
          skills={data.gap_analysis.missing_skills}
          targetRole={payload.target_role}
        />
        <PivotPathsCard paths={data.pivot_paths.paths} />
        <TrajectoryGraphCard
          paths={data.pivot_paths.paths}
          similar={data.similar_devs.groups}
          targetRole={payload.target_role}
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <ProofDrawerCard data={data.proof_drawer} />
          <SimilarDevsCard groups={data.similar_devs.groups} />
        </div>
        <SalaryBandCard
          data={data.salary_band}
          pivotLift={data.pivot_salary_lift ?? []}
        />
        <CoursesCard groups={data.courses_by_skill ?? []} />
        <TimingsCard timings={data.timings_ms} />
      </div>
    </HonestModeProvider>
  );
}

function EmptyState() {
  const t = useTranslations();
  return (
    <Card className="border-dashed bg-muted/30">
      <CardHeader>
        <CardDescription>{t("pathfinder.analysis.howItWorks")}</CardDescription>
        <CardTitle className="flex items-center gap-2 text-base">
          <Compass className="size-4 text-primary" />
          {t("pathfinder.analysis.runToSee")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
          <Step
            n={1}
            title={t("pathfinder.analysis.step1Title")}
            body={t("pathfinder.analysis.step1Body")}
          />
          <Step
            n={2}
            title={t("pathfinder.analysis.step2Title")}
            body={t("pathfinder.analysis.step2Body")}
          />
          <Step
            n={3}
            title={t("pathfinder.analysis.step3Title")}
            body={t("pathfinder.analysis.step3Body")}
          />
          <Step
            n={4}
            title={t("pathfinder.analysis.step4Title")}
            body={t("pathfinder.analysis.step4Body")}
          />
        </ol>
      </CardContent>
    </Card>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  const t = useTranslations();
  return (
    <li className="flex flex-col gap-1 rounded-lg border bg-card p-3">
      <span className="text-xs font-mono text-primary">
        {t("common.step", { n })}
      </span>
      <span className="text-sm font-medium text-foreground">{title}</span>
      <span className="text-xs">{body}</span>
    </li>
  );
}

function LoadingState() {
  const t = useTranslations();
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardDescription>{t("pathfinder.analysis.runningPipeline")}</CardDescription>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 animate-pulse text-primary" />
            {t("pathfinder.analysis.embedding")}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {t("pathfinder.analysis.loadingHint")}
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-20 rounded-full" />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-6 w-2/3" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-2/3" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  const t = useTranslations();
  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <CardHeader>
        <CardDescription className="text-destructive">
          {t("pathfinder.analysis.pipelineFailed")}
        </CardDescription>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="size-4 text-destructive" />
          {message}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {t("pathfinder.analysis.errorHint")}
        </p>
      </CardHeader>
    </Card>
  );
}
