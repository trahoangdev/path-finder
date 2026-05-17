"use client";

import { Timer } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTranslations } from "@/contexts/locale-context";
import type { AnalyzeResponse } from "@/lib/pathfinder/types";

interface TimingsCardProps {
  timings: AnalyzeResponse["timings_ms"];
}

const STAGE_KEYS = [
  "extract",
  "embed",
  "gap",
  "paths",
  "proof",
  "similar",
  "courses",
  "salary",
] as const satisfies ReadonlyArray<keyof AnalyzeResponse["timings_ms"]>;

export function TimingsCard({ timings }: TimingsCardProps) {
  const t = useTranslations();
  const max = STAGE_KEYS.reduce(
    (m, key) => Math.max(m, timings[key] ?? 0),
    1,
  );

  return (
    <Card>
      <CardHeader>
        <CardDescription>{t("pathfinder.timings.description")}</CardDescription>
        <CardTitle className="flex items-center gap-2 text-base">
          <Timer className="size-4 text-primary" />
          {t("pathfinder.timings.title", {
            total: timings.total.toLocaleString(),
          })}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("pathfinder.timings.subtitle")}
        </p>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2">
          {STAGE_KEYS.map((key) => {
            const value = timings[key] ?? 0;
            const width = Math.max(2, Math.round((value / max) * 100));
            return (
              <li key={key} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="capitalize">
                    {t(`pathfinder.timings.${key}`)}
                  </span>
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
