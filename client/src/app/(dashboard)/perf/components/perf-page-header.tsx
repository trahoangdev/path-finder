"use client";

import { Activity } from "lucide-react";
import { useTranslations } from "@/contexts/locale-context";

export function PerfPageHeader() {
  const t = useTranslations();

  return (
    <section className="px-4 lg:px-6">
      <article className="flex flex-col gap-2">
        <header className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">
            {t("perf.page.title")}
          </h1>
          <span className="inline-flex items-center gap-1 rounded-full border bg-primary/5 px-2 py-0.5 text-xs font-medium text-primary">
            <Activity className="size-3" />
            {t("perf.page.badge")}
          </span>
        </header>
        <p className="text-muted-foreground">{t("perf.page.subtitle")}</p>
      </article>
    </section>
  );
}
