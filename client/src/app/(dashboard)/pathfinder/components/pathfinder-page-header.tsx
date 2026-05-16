"use client";

import { Sparkles } from "lucide-react";
import { useTranslations } from "@/contexts/locale-context";

export function PathfinderPageHeader() {
  const t = useTranslations();

  return (
    <section className="px-4 lg:px-6">
      <article className="flex flex-col gap-2">
        <header className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">
            {t("common.careerPivotEngine")}
          </h1>
          <span className="inline-flex items-center gap-1 rounded-full border bg-primary/5 px-2 py-0.5 text-xs font-medium text-primary">
            <Sparkles className="size-3" />
            {t("pathfinder.page.badge")}
          </span>
        </header>
        <p className="text-muted-foreground">{t("pathfinder.page.subtitle")}</p>
      </article>
    </section>
  );
}
