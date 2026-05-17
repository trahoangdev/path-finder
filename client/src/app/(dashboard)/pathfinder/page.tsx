import { Suspense } from "react";
import { PathFinderAnalyzer } from "./components/pathfinder-analyzer";
import { PathfinderPageHeader } from "./components/pathfinder-page-header";

export const dynamic = "force-dynamic";

export default function PathFinderPage() {
  return (
    <>
      <PathfinderPageHeader />

      <section className="@container/main px-4 lg:px-6">
        <Suspense fallback={null}>
          <PathFinderAnalyzer />
        </Suspense>
      </section>
    </>
  );
}
