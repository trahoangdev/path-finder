"use client";

import { LocaleProvider } from "@/contexts/locale-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>;
}
