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
import type { AnalyzeRequest, AnalyzeResponse } from "@/lib/pathfinder/types";
import { ProfileCard } from "./profile-card";
import { GapAnalysisCard } from "./gap-analysis-card";
import { PivotPathsCard } from "./pivot-paths-card";
import { ProofDrawerCard } from "./proof-drawer-card";
import { SimilarDevsCard } from "./similar-devs-card";
import { TimingsCard } from "./timings-card";

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
    <div className="flex flex-col gap-4">
      <ProfileCard profile={data.profile} targetRole={payload.target_role} />
      <GapAnalysisCard skills={data.gap_analysis.missing_skills} />
      <PivotPathsCard paths={data.pivot_paths.paths} />
      <div className="grid gap-4 lg:grid-cols-2">
        <ProofDrawerCard data={data.proof_drawer} />
        <SimilarDevsCard groups={data.similar_devs.groups} />
      </div>
      <TimingsCard timings={data.timings_ms} />
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="border-dashed bg-muted/30">
      <CardHeader>
        <CardDescription>How it works</CardDescription>
        <CardTitle className="flex items-center gap-2 text-base">
          <Compass className="size-4 text-primary" />
          Run an analysis to see results
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
          <Step
            n={1}
            title="Paste a CV"
            body="Long-form text works best — summary, experience, skills."
          />
          <Step
            n={2}
            title="Pick a target role"
            body="e.g. AI Engineer, Cloud Engineer, Engineering Manager."
          />
          <Step
            n={3}
            title="One orchestrated call"
            body="Gemini extracts skills, MongoDB Atlas runs Vector Search + $graphLookup + $facet in parallel."
          />
          <Step
            n={4}
            title="Read the plan"
            body="Profile, gap, three pivot routes, proof of past pivoters, and peer cluster."
          />
        </ol>
      </CardContent>
    </Card>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="flex flex-col gap-1 rounded-lg border bg-card p-3">
      <span className="text-xs font-mono text-primary">Step {n}</span>
      <span className="text-sm font-medium text-foreground">{title}</span>
      <span className="text-xs">{body}</span>
    </li>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardDescription>Running pipeline</CardDescription>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 animate-pulse text-primary" />
            Embedding CV + querying MongoDB Atlas…
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            First call may take 5–15s while Gemini embeds the CV. Subsequent
            calls reuse Mongo&apos;s warmed Atlas Vector Search cache.
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
  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <CardHeader>
        <CardDescription className="text-destructive">
          Pipeline failed
        </CardDescription>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="size-4 text-destructive" />
          {message}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Common causes: server not running on{" "}
          <code className="rounded bg-muted px-1">localhost:4000</code>, Atlas
          connection down, or Gemini free-tier quota exhausted. Inspect the
          server console for details.
        </p>
      </CardHeader>
    </Card>
  );
}
