"use client";

import type { ReactNode } from "react";
import {
  LineChart,
  MessageCircle,
  BarChart3,
  LayoutGrid,
  Calculator,
  ImageCheck,
  TrendingUp,
  ClipboardList,
} from "lucide-react";

export type ComingSoonIllustrationType =
  | "profitCalculator"
  | "artApprovals"
  | "itemAnalytics"
  | "rfpDashboard";

export type FeatureHighlight = {
  icon: ReactNode;
  title: string;
  description: string;
};

type ComingSoonFeaturePageProps = {
  title: string;
  description: string;
  illustrationType: ComingSoonIllustrationType;
  featureHighlights: FeatureHighlight[];
};

function IllustrationProfitCalculator() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-wrap items-end justify-center gap-3">
        <div className="h-9 w-24 rounded-lg border border-slate-200 bg-white/80 shadow-sm" />
        <span className="text-caption text-slate-400">Cost</span>
        <div className="h-9 w-24 rounded-lg border border-slate-200 bg-white/80 shadow-sm" />
        <span className="text-caption text-slate-400">Sell</span>
        <div className="flex h-10 items-center rounded-lg border border-slate-200 bg-slate-100/80 px-3 shadow-sm">
          <span className="text-caption font-medium text-slate-600">42% margin</span>
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white/60 p-2">
        <LineChart className="h-8 w-8 text-slate-400" strokeWidth={1.5} />
      </div>
    </div>
  );
}

function IllustrationArtApprovals() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm">
        <div className="h-16 w-20 rounded-lg bg-slate-200/80" />
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <div className="h-8 w-16 rounded-md bg-emerald-100" />
            <div className="h-8 w-16 rounded-md bg-red-100/80" />
          </div>
          <span className="text-caption text-slate-500">Approve / Reject</span>
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white/60 p-2">
        <MessageCircle className="h-8 w-8 text-slate-400" strokeWidth={1.5} />
      </div>
    </div>
  );
}

function IllustrationItemAnalytics() {
  return (
    <div className="flex flex-wrap items-end justify-center gap-4">
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-end gap-1">
          {[40, 65, 45, 80, 55].map((h, i) => (
            <div
              key={i}
              className="w-4 rounded-t bg-slate-300/80"
              style={{ height: h }}
            />
          ))}
        </div>
        <span className="text-caption text-slate-500">Trend</span>
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-end gap-2">
          <div className="h-12 w-6 rounded bg-slate-300/80" />
          <div className="h-8 w-6 rounded bg-slate-300/60" />
          <div className="h-10 w-6 rounded bg-slate-300/70" />
        </div>
        <span className="text-caption text-slate-500">Bars</span>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white/80 px-3 py-2 shadow-sm">
        <div className="text-caption font-medium text-slate-700">Item card</div>
        <span className="inline-block mt-1 rounded bg-amber-100 px-1.5 py-0.5 text-caption text-amber-800">
          +24% conversion
        </span>
      </div>
    </div>
  );
}

function IllustrationRfpDashboard() {
  return (
    <div className="flex flex-col gap-4 w-full max-w-sm">
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-12 flex-1 rounded-lg border border-slate-200 bg-white/80 shadow-sm"
          />
        ))}
      </div>
      <div className="h-3 w-full rounded-full bg-slate-200/80" />
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-4 w-full rounded border border-slate-100 bg-white/60"
          />
        ))}
      </div>
    </div>
  );
}

function getIllustration(type: ComingSoonIllustrationType) {
  switch (type) {
    case "profitCalculator":
      return <IllustrationProfitCalculator />;
    case "artApprovals":
      return <IllustrationArtApprovals />;
    case "itemAnalytics":
      return <IllustrationItemAnalytics />;
    case "rfpDashboard":
      return <IllustrationRfpDashboard />;
    default:
      return null;
  }
}

export function ComingSoonFeaturePage({
  title,
  description,
  illustrationType,
  featureHighlights,
}: ComingSoonFeaturePageProps) {
  return (
    <div className="mx-auto max-w-[900px] space-y-10 py-8">
      <header className="space-y-3">
        <h1 className="text-page-title font-semibold text-text-primary">
          {title}
        </h1>
        <span
          className="inline-block rounded-full px-3 py-1.5 text-[12px] tracking-[0.04em] text-text-secondary"
          style={{ background: "rgba(0,0,0,0.06)" }}
        >
          Coming Soon
        </span>
      </header>

      <section
        className="flex min-h-[200px] items-center justify-center rounded-2xl p-[60px]"
        style={{
          background: "linear-gradient(180deg, #F6F7F9, #EEF1F5)",
        }}
      >
        {getIllustration(illustrationType)}
      </section>

      <p className="mx-auto max-w-[600px] text-base leading-relaxed text-text-secondary">
        {description}
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {featureHighlights.map((item, index) => (
          <div
            key={index}
            className="rounded-xl border border-[#ECECEC] bg-white p-[18px]"
          >
            <div className="mb-2 text-slate-500 [&>svg]:h-5 [&>svg]:w-5">
              {item.icon}
            </div>
            <h3 className="font-semibold text-text-primary">{item.title}</h3>
            <p className="mt-1 text-body text-text-secondary">
              {item.description}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-10 text-center text-[13px] text-[#6B7280]">
        This feature is currently in development and will be available in a
        future release.
      </p>
    </div>
  );
}
