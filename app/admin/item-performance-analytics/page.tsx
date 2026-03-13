"use client";

import { BarChart3, Eye, ShoppingCart, TrendingUp } from "lucide-react";
import { ComingSoonFeaturePage } from "@/components/ComingSoonFeaturePage";

export default function ItemPerformanceAnalyticsPage() {
  return (
    <ComingSoonFeaturePage
      title="Item Performance Analytics"
      description="Understand which items perform best across quotes. Track engagement, conversions, and pricing trends to inform better merchandising decisions."
      illustrationType="itemAnalytics"
      featureHighlights={[
        {
          icon: <Eye />,
          title: "Quote engagement",
          description: "See which items clients interact with.",
        },
        {
          icon: <ShoppingCart />,
          title: "Conversion metrics",
          description: "Track which items actually get ordered.",
        },
        {
          icon: <TrendingUp />,
          title: "Trend insights",
          description: "Identify popular products over time.",
        },
      ]}
    />
  );
}
