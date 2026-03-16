"use client";

import { LayoutGrid, List, Activity, ClipboardList } from "lucide-react";
import { ComingSoonFeaturePage } from "@/components/ComingSoonFeaturePage";

export default function RfpDashboardPage() {
  return (
    <ComingSoonFeaturePage
      title="RFP Dashboard"
      description="Get a high-level overview of active quotes, pipeline value, and project activity. Designed to give teams visibility into ongoing opportunities."
      illustrationType="rfpDashboard"
      featureHighlights={[
        {
          icon: <LayoutGrid />,
          title: "Pipeline overview",
          description: "View all active quotes at a glance.",
        },
        {
          icon: <List />,
          title: "Project status",
          description: "Track draft, review, and finalized quotes.",
        },
        {
          icon: <Activity />,
          title: "Activity feed",
          description: "Monitor updates across projects.",
        },
      ]}
    />
  );
}
