"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "@/contexts/locale-context";

export default function HomePage() {
  const t = useTranslations();
  const router = useRouter();

  useEffect(() => {
    router.replace("/pathfinder");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground mt-2">{t("common.opening")}</p>
      </div>
    </div>
  );
}
