import { Suspense } from "react";
import { PerfDashboard } from "./components/perf-dashboard";
import { PerfPageHeader } from "./components/perf-page-header";

export const dynamic = "force-dynamic";

export default function PerfPage() {
  return (
    <>
      <PerfPageHeader />
      <section className="@container/main px-4 lg:px-6">
        <Suspense fallback={null}>
          <PerfDashboard />
        </Suspense>
      </section>
    </>
  );
}
