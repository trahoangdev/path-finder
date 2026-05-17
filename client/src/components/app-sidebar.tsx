"use client"

import * as React from "react"
import { Compass } from "lucide-react"
import Link from "next/link"
import { Logo } from "@/components/logo"
import { useTranslations } from "@/contexts/locale-context"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const t = useTranslations()

  const data = {
    user: {
      name: t("common.pathfinder"),
      email: "demo@pathfinder.vn",
      avatar: "",
    },
    navGroups: [
      {
        label: t("nav.pathfinderGroup"),
        items: [
          {
            title: t("common.careerPivot"),
            url: "/pathfinder",
            icon: Compass,
          },
        ],
      },
    ],
  }

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/pathfinder">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Logo size={24} className="text-current" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {t("common.pathfinder")}
                  </span>
                  <span className="truncate text-xs">
                    {t("common.careerPivotEngine")}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {data.navGroups.map((group) => (
          <NavMain key={group.label} label={group.label} items={group.items} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}

