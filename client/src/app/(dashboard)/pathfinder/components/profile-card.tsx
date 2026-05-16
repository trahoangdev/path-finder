"use client";

import { Briefcase, Clock, TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ExtractedProfile, UserSkill } from "@/lib/pathfinder/types";

interface ProfileCardProps {
  profile: ExtractedProfile;
  targetRole: string;
}

const LEVEL_STYLES: Record<UserSkill["level"], string> = {
  beginner: "bg-muted text-muted-foreground",
  intermediate:
    "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  advanced:
    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
};

export function ProfileCard({ profile, targetRole }: ProfileCardProps) {
  const skills = [...profile.skills].sort((a, b) => b.years - a.years);

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>Candidate profile</CardDescription>
        <CardTitle className="text-xl @[280px]/card:text-2xl">
          {profile.inferred_role ?? "Unknown role"}
          <span className="text-muted-foreground"> → </span>
          <span className="text-primary">{targetRole}</span>
        </CardTitle>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Briefcase className="size-3.5" />
            {profile.inferred_role ?? "—"}
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" />
            {profile.inferred_years ?? "?"} yrs experience
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span className="inline-flex items-center gap-1">
            <TrendingUp className="size-3.5" />
            {skills.length} skills extracted
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1.5">
          {skills.map((skill) => (
            <Badge
              key={skill.name}
              variant="outline"
              className={`gap-1 ${LEVEL_STYLES[skill.level]}`}
              title={`${skill.level} · ${skill.years} yrs`}
            >
              <span className="font-medium">{skill.name}</span>
              <span className="text-[10px] uppercase tracking-wider opacity-70">
                {skill.level}
              </span>
            </Badge>
          ))}
          {skills.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No skills extracted — try a longer CV.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
