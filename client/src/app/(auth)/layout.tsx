import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Authentication - PathFinder",
  description: "Sign in to your PathFinder account or create a new one",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
