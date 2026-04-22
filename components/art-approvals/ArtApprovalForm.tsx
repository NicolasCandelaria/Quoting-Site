"use client";

import type { FormEvent } from "react";
import type { Project } from "@/lib/models";

export type ArtApprovalFormValues = {
  title: string;
  clientName: string;
  notes: string;
  optionalProjectId: string;
  optionalItemId: string;
};

type Props = {
  values: ArtApprovalFormValues;
  projects: Project[];
  disabled?: boolean;
  saving?: boolean;
  onValuesChange: (patch: Partial<ArtApprovalFormValues>) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void | Promise<void>;
};

export function ArtApprovalForm({
  values,
  projects,
  disabled,
  saving,
  onValuesChange,
  onSubmit,
}: Props) {
  return (
    <form onSubmit={(e) => void onSubmit(e)} className="mt-4 space-y-4">
      <div>
        <label className="label" htmlFor="art-approval-title">
          Title
        </label>
        <input
          id="art-approval-title"
          className="input"
          value={values.title}
          onChange={(e) => onValuesChange({ title: e.target.value })}
          required
          disabled={disabled}
        />
      </div>
      <div>
        <label className="label" htmlFor="art-approval-client">
          Client name
        </label>
        <input
          id="art-approval-client"
          className="input"
          value={values.clientName}
          onChange={(e) => onValuesChange({ clientName: e.target.value })}
          required
          disabled={disabled}
        />
      </div>
      <div>
        <label className="label" htmlFor="art-approval-notes">
          Notes (internal)
        </label>
        <textarea
          id="art-approval-notes"
          className="input min-h-[96px]"
          value={values.notes}
          onChange={(e) => onValuesChange({ notes: e.target.value })}
          disabled={disabled}
        />
      </div>
      <div>
        <label className="label" htmlFor="art-approval-project">
          Project (optional)
        </label>
        <select
          id="art-approval-project"
          className="input h-10"
          value={values.optionalProjectId}
          onChange={(e) => onValuesChange({ optionalProjectId: e.target.value })}
          disabled={disabled}
        >
          <option value="">None</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="art-approval-item-id">
          Item ID (optional)
        </label>
        <input
          id="art-approval-item-id"
          className="input font-mono text-caption"
          value={values.optionalItemId}
          onChange={(e) => onValuesChange({ optionalItemId: e.target.value })}
          placeholder="Quote item UUID or reference"
          disabled={disabled}
        />
      </div>
      <div className="pt-2">
        <button type="submit" className="btn-primary" disabled={disabled || saving}>
          {saving ? "Saving…" : "Save metadata"}
        </button>
      </div>
    </form>
  );
}
