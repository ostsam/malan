import { DashboardForm } from "@/components/dashboard/DashboardForm";
import { Suspense } from "react";

export default function DemoPage() {
  return (
    <Suspense fallback={null}>
      <DashboardForm isDemo={true} />
    </Suspense>
  );
}
