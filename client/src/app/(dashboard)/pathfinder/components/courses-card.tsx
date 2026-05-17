"use client";

import * as React from "react";
import {
  BookOpen,
  ChevronDown,
  Clock,
  ExternalLink,
  Leaf,
  Star,
  Tag,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useTranslations } from "@/contexts/locale-context";
import type { CoursePublic, CoursesForSkill } from "@/lib/pathfinder/types";
import { AggregationPipelineBadges } from "./honest-mode";

/** Stages in `server/src/services/vector-search/courses.ts`. */
const COURSES_AGG_STAGES = [
  "vectorSearch",
  "addFields",
  "sort",
  "limit",
  "project",
] as const;

interface CoursesCardProps {
  groups: CoursesForSkill[];
}

const PROVIDER_LABELS: Record<CoursePublic["provider"], string> = {
  coursera: "Coursera",
  udemy: "Udemy",
  "learn.mongodb.com": "MongoDB University",
  freecodecamp: "freeCodeCamp",
  youtube: "YouTube",
  other: "Other",
};

const LEVEL_STYLES: Record<CoursePublic["level"], string> = {
  beginner: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  intermediate: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  advanced: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};

export function CoursesCard({ groups }: CoursesCardProps) {
  const t = useTranslations();
  const nonEmpty = groups.filter((g) => g.courses.length > 0);

  return (
    <Card>
      <CardHeader>
        <CardDescription>{t("pathfinder.courses.description")}</CardDescription>
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="size-4 text-primary" />
          {t("pathfinder.courses.title")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("pathfinder.courses.subtitle")}
        </p>
        <AggregationPipelineBadges
          className="pt-1"
          stages={COURSES_AGG_STAGES}
        />
      </CardHeader>
      <CardContent>
        {groups.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            {t("pathfinder.courses.runFirst")}
          </p>
        ) : nonEmpty.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            {t("pathfinder.courses.sparse")}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {groups.map((group, idx) => (
              <SkillGroup
                key={group.skill}
                group={group}
                defaultOpen={idx === 0}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SkillGroup({
  group,
  defaultOpen,
}: {
  group: CoursesForSkill;
  defaultOpen: boolean;
}) {
  const t = useTranslations();
  const [open, setOpen] = React.useState(defaultOpen);
  const officialCount = group.courses.filter(
    (c) => c.is_mongodb_official,
  ).length;
  const freeCount = group.courses.filter((c) => c.price_usd === 0).length;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-lg border bg-card">
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 p-3 text-left">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Tag className="size-3.5 text-muted-foreground" />
            <span className="truncate font-medium">{group.skill}</span>
            <Badge variant="outline" className="text-[10px]">
              {t("pathfinder.courses.courseCount", {
                count: group.courses.length,
              })}
            </Badge>
            {officialCount > 0 ? (
              <Badge
                variant="outline"
                className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px]"
              >
                {t("pathfinder.courses.mongoOfficial", {
                  count: officialCount,
                })}
              </Badge>
            ) : null}
            {freeCount > 0 ? (
              <Badge variant="secondary" className="gap-1 text-[10px]">
                <Leaf className="size-3" />{" "}
                {t("pathfinder.courses.freeCount", { count: freeCount })}
              </Badge>
            ) : null}
          </div>
          <ChevronDown
            className={`size-4 shrink-0 text-muted-foreground transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="grid gap-2 p-3 pt-0 sm:grid-cols-2">
            {group.courses.length === 0 ? (
              <li className="col-span-full rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                {t("pathfinder.courses.noMatch")}
              </li>
            ) : (
              group.courses.map((c) => <CourseRow key={c.url} course={c} />)
            )}
          </ul>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function CourseRow({ course }: { course: CoursePublic }) {
  const t = useTranslations();
  return (
    <li className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <a
          href={course.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 line-clamp-2 font-medium hover:underline"
        >
          {course.title}
        </a>
        <a
          href={course.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground"
          aria-label={t("pathfinder.courses.openCourse")}
        >
          <ExternalLink className="size-3.5" />
        </a>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <Badge variant="outline" className="text-[10px]">
          {PROVIDER_LABELS[course.provider]}
        </Badge>
        <Badge
          variant="outline"
          className={`text-[10px] ${LEVEL_STYLES[course.level]}`}
        >
          {t(`skillLevel.${course.level}`)}
        </Badge>
        {course.is_mongodb_official && (
          <Badge
            variant="outline"
            className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px]"
          >
            {t("pathfinder.courses.mongoBadge")}
          </Badge>
        )}
        {course.price_usd === 0 ? (
          <Badge variant="secondary" className="gap-1 text-[10px]">
            <Leaf className="size-3" /> {t("pathfinder.courses.free")}
          </Badge>
        ) : (
          <span className="font-mono text-muted-foreground">
            ${course.price_usd.toFixed(0)}
          </span>
        )}
        {course.duration_hours ? (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Clock className="size-3" />
            {Math.round(course.duration_hours)}h
          </span>
        ) : null}
        {course.rating ? (
          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-300">
            <Star className="size-3 fill-current" />
            {course.rating.toFixed(1)}
          </span>
        ) : null}
        {course.similarity ? (
          <span className="ml-auto font-mono text-muted-foreground">
            sim {(course.similarity * 100).toFixed(0)}%
          </span>
        ) : null}
      </div>
    </li>
  );
}
