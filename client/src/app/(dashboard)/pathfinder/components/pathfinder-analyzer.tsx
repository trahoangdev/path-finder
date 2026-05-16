"use client";

import * as React from "react";
import { AnalyzeForm } from "./analyze-form";
import { AnalysisResults } from "./analysis-results";
import { pathfinderApi, PathFinderApiError } from "@/lib/pathfinder/api";
import type { AnalyzeRequest, AnalyzeResponse } from "@/lib/pathfinder/types";

type ViewState =
  | { kind: "idle" }
  | { kind: "loading"; payload: AnalyzeRequest; startedAt: number }
  | { kind: "ready"; payload: AnalyzeRequest; data: AnalyzeResponse }
  | { kind: "error"; payload: AnalyzeRequest; message: string };

export function PathFinderAnalyzer() {
  const [state, setState] = React.useState<ViewState>({ kind: "idle" });

  const handleSubmit = React.useCallback(async (payload: AnalyzeRequest) => {
    setState({ kind: "loading", payload, startedAt: Date.now() });
    try {
      const data = await pathfinderApi.analyze(payload);
      setState({ kind: "ready", payload, data });
    } catch (err) {
      const message =
        err instanceof PathFinderApiError
          ? `[${err.code}] ${err.message}`
          : (err as Error).message || "Unknown error";
      setState({ kind: "error", payload, message });
    }
  }, []);

  const handleReset = React.useCallback(() => {
    setState({ kind: "idle" });
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <AnalyzeForm
        loading={state.kind === "loading"}
        onSubmit={handleSubmit}
        onReset={handleReset}
      />
      <AnalysisResults state={state} />
    </div>
  );
}
