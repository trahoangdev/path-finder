"use client";

import { Timer } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AnalyzeResponse } from "@/lib/pathfinder/types";

interface TimingsCardProps {
  timings: AnalyzeResponse["timings_ms"];
}

const STAGES: Array<{ key: keyof AnalyzeResponse["timings_ms"]; label: string }> = [
  { key: "extract", label: "extract skills" },
  { key: "embed", label: "embed" },
  { key: "gap", label: "gap analysis" },
  { key: "paths", label: "pivot paths" },
  { key: "proof", label: "proof drawer" },
  { key: "similar", label: "similar devs" },
  { key: "courses", label: "course matching" },
  { key: "salary", label: "salary band" },
];

export function TimingsCard({ timings }: TimingsCardProps) {
  const max = STAGES.reduce(
    (m, stage) => Math.max(m, timings[stage.key] ?? 0),
    1,
  );

  return (
    <Card>
      <CardHeader>
        <CardDescription>Pipeline timings</CardDescription>
        <CardTitle className="flex items-center gap-2 text-base">
          <Timer className="size-4 text-primary" />
          Total {timings.total.toLocaleString()} ms server-side
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Per-stage latency. Gap, paths, proof and similar devs run in
          parallel.
        </p>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2">
          {STAGES.map((stage) => {
            const value = timings[stage.key] ?? 0;
            const width = Math.max(2, Math.round((value / max) * 100));
            return (
              <li key={stage.key} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="capitalize">{stage.label}</span>
                  <span className="font-mono tabular-nums text-muted-foreground">
                    {value} ms
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary/70"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
