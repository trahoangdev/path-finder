"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Activity, Compass, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslations } from "@/contexts/locale-context"

interface NavTab {
  href: string
  /** Translation key for the visible label. */
  labelKey: string
  icon: LucideIcon
  /** Active when the pathname starts with this prefix, in addition to exact match on `href`. */
  matchPrefix?: string
}

const TABS: NavTab[] = [
  {
    href: "/pathfinder",
    labelKey: "common.careerPivot",
    icon: Compass,
    matchPrefix: "/pathfinder",
  },
  {
    href: "/perf",
    labelKey: "common.benchmark",
    icon: Activity,
    matchPrefix: "/perf",
  },
]

/**
 * Compact route switcher rendered inline in the site header. Gives judges /
 * users a fast, always-visible way to flip between the two main surfaces
 * (Career Pivot dashboard and Performance benchmark) without going through
 * the sidebar.
 */
export function SiteNavTabs() {
  const pathname = usePathname()
  const t = useTranslations()

  return (
    <nav
      aria-label="Primary"
      className="inline-flex items-center gap-1 rounded-md border bg-card p-0.5"
    >
      {TABS.map((tab) => {
        const active =
          pathname === tab.href ||
          (tab.matchPrefix ? pathname.startsWith(tab.matchPrefix) : false)
        const Icon = tab.icon
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-xs font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" />
            <span className="hidden sm:inline">{t(tab.labelKey)}</span>
          </Link>
        )
      })}
    </nav>
  )
}
