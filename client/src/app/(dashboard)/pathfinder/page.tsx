import { Suspense } from "react";
import { Sparkles } from "lucide-react";
import { PathFinderAnalyzer } from "./components/pathfinder-analyzer";

export const dynamic = "force-dynamic";

export default function PathFinderPage() {
  return (
    <>
      <div className="px-4 lg:px-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              Career Pivot Engine
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full border bg-primary/5 px-2 py-0.5 text-xs font-medium text-primary">
              <Sparkles className="size-3" />
              MongoDB Atlas · OpenAI
            </span>
          </div>
          <p className="text-muted-foreground">
            Paste a Vietnamese developer&apos;s CV, pick a target role, and get
            a gap analysis, a pivot plan, peer benchmarks, and statistical
            proof — all in one MongoDB pipeline.
          </p>
        </div>
      </div>

      <div className="@container/main px-4 lg:px-6">
        <Suspense fallback={null}>
          <PathFinderAnalyzer />
        </Suspense>
      </div>
    </>
  );
}
