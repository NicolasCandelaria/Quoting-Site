"use client";

import { Calculator, Percent, DollarSign, Target } from "lucide-react";
import { ComingSoonFeaturePage } from "@/components/ComingSoonFeaturePage";

export default function QuickProfitCalculatorPage() {
  return (
    <ComingSoonFeaturePage
      title="Quick Profit Calculator"
      description="Instantly calculate margins, landed costs, and profit across pricing tiers. Designed to help account managers evaluate pricing decisions before quotes are finalized."
      illustrationType="profitCalculator"
      featureHighlights={[
        {
          icon: <Percent />,
          title: "Margin calculation",
          description: "Instantly compute profit margins across pricing tiers.",
        },
        {
          icon: <DollarSign />,
          title: "Cost modeling",
          description: "Compare supplier costs and selling price scenarios.",
        },
        {
          icon: <Target />,
          title: "Quote optimization",
          description: "Identify pricing sweet spots quickly.",
        },
      ]}
    />
  );
}
