import type { ArtApprovalStatus } from "@/lib/art-approvals/models";

const STATUS_LABELS: Record<ArtApprovalStatus, string> = {
  draft: "Draft",
  with_designer: "With designer",
  ready_for_client: "Ready for client",
  approved: "Approved",
  changes_requested: "Changes requested",
};

const STATUS_CLASSES: Record<ArtApprovalStatus, string> = {
  draft: "border-slate-200 bg-slate-50 text-slate-700",
  with_designer: "border-indigo-200 bg-indigo-50 text-indigo-800",
  ready_for_client: "border-amber-200 bg-amber-50 text-amber-900",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-800",
  changes_requested: "border-orange-200 bg-orange-50 text-orange-900",
};

export function ArtApprovalStatusBadge({ status }: { status: ArtApprovalStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-caption font-medium ${STATUS_CLASSES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
