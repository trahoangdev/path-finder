"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/contexts/locale-context";

export default function NotFound() {
  const t = useTranslations();

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-muted-foreground mt-2">{t("common.pageNotFound")}</p>
        <Button asChild className="mt-4">
          <Link href="/pathfinder">{t("common.goToPathfinder")}</Link>
        </Button>
      </div>
    </div>
  );
}
