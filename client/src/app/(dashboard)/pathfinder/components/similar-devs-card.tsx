"use client";

import { UserCircle2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { SimilarDevsGroup } from "@/lib/pathfinder/types";

interface SimilarDevsCardProps {
  groups: SimilarDevsGroup[];
}

function formatSalary(usd: number | null): string {
  if (usd == null) return "—";
  if (usd >= 1000) return `$${(usd / 1000).toFixed(1)}k`;
  return `$${Math.round(usd)}`;
}

export function SimilarDevsCard({ groups }: SimilarDevsCardProps) {
  const top = [...groups].sort((a, b) => b.count - a.count).slice(0, 8);
  const max = top.reduce((m, g) => Math.max(m, g.count), 1);

  return (
    <Card>
      <CardHeader>
        <CardDescription>Similar developers</CardDescription>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserCircle2 className="size-4 text-primary" />
          What roles do people with your stack actually end up in?
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Cosine search over career-trajectory embeddings, grouped by current
          role.
        </p>
      </CardHeader>
      <CardContent>
        {top.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No similar developers found in this slice of the data.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {top.map((group) => {
              const width = Math.max(4, Math.round((group.count / max) * 100));
              return (
                <li key={group.role} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium">{group.role}</span>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
                      <span>{group.count.toLocaleString()} devs</span>
                      <span className="font-medium text-foreground">
                        {formatSalary(group.avg_salary_usd)}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary/70 transition-all"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
