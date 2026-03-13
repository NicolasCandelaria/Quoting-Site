"use client";

import { ImageCheck, CheckCircle, MessageSquare, History } from "lucide-react";
import { ComingSoonFeaturePage } from "@/components/ComingSoonFeaturePage";

export default function ArtApprovalsPage() {
  return (
    <ComingSoonFeaturePage
      title="Art Approvals"
      description="Streamline artwork approval workflows. Share mockups with clients, collect approvals, and keep feedback organized in one place."
      illustrationType="artApprovals"
      featureHighlights={[
        {
          icon: <CheckCircle />,
          title: "Client approvals",
          description: "Approve or reject artwork directly.",
        },
        {
          icon: <MessageSquare />,
          title: "Feedback tracking",
          description: "Centralize client comments and revisions.",
        },
        {
          icon: <History />,
          title: "Version history",
          description: "Maintain a record of artwork iterations.",
        },
      ]}
    />
  );
}
