import type { Metadata } from "next";
import "./globals.css";

import { Providers } from "@/components/providers";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarConfigProvider } from "@/contexts/sidebar-context";
import { inter } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "PathFinder · Công cụ chuyển hướng sự nghiệp",
  description:
    "PathFinder giúp lập trình viên Việt Nam lên kế hoạch bước chuyển nghề tiếp theo với MongoDB Atlas Vector Search và OpenAI.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={`${inter.variable} antialiased`}>
      <body className={inter.className}>
        <Providers>
          <ThemeProvider defaultTheme="system" storageKey="nextjs-ui-theme">
            <SidebarConfigProvider>{children}</SidebarConfigProvider>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
