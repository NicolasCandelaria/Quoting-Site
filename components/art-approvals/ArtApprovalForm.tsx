"use client";

import type { FormEvent } from "react";
import type { Project } from "@/lib/models";

export type ArtApprovalFormValues = {
  title: string;
  clientName: string;
  notes: string;
  optionalProjectId: string;
  optionalItemId: string;
  material: string;
  itemSize: string;
  logo1: string;
  logo1Color: string;
  logo1Location: string;
  logo1Application: string;
  baseColor: string;
  additionalNotes: string;
  includeLogo2: boolean;
  logo2: string;
  logo2Color: string;
  logo2Location: string;
  logo2Application: string;
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="art-approval-material">
            Material
          </label>
          <input
            id="art-approval-material"
            className="input"
            value={values.material}
            onChange={(e) => onValuesChange({ material: e.target.value })}
            disabled={disabled}
          />
        </div>
        <div>
          <label className="label" htmlFor="art-approval-item-size">
            Item size
          </label>
          <input
            id="art-approval-item-size"
            className="input"
            value={values.itemSize}
            onChange={(e) => onValuesChange({ itemSize: e.target.value })}
            disabled={disabled}
          />
        </div>
      </div>
      <div className="rounded-panel border border-slate-200 p-4 space-y-4">
        <h3 className="text-body font-semibold text-text-primary">Logo 1</h3>
        <div>
          <label className="label" htmlFor="art-approval-logo1">
            Logo 1
          </label>
          <input
            id="art-approval-logo1"
            className="input"
            value={values.logo1}
            onChange={(e) => onValuesChange({ logo1: e.target.value })}
            disabled={disabled}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="art-approval-logo1-color">
              Color
            </label>
            <input
              id="art-approval-logo1-color"
              className="input"
              value={values.logo1Color}
              onChange={(e) => onValuesChange({ logo1Color: e.target.value })}
              disabled={disabled}
            />
          </div>
          <div>
            <label className="label" htmlFor="art-approval-logo1-location">
              Location
            </label>
            <input
              id="art-approval-logo1-location"
              className="input"
              value={values.logo1Location}
              onChange={(e) => onValuesChange({ logo1Location: e.target.value })}
              disabled={disabled}
            />
          </div>
          <div>
            <label className="label" htmlFor="art-approval-logo1-application">
              Application
            </label>
            <input
              id="art-approval-logo1-application"
              className="input"
              value={values.logo1Application}
              onChange={(e) => onValuesChange({ logo1Application: e.target.value })}
              disabled={disabled}
            />
          </div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="art-approval-base-color">
            Base color
          </label>
          <input
            id="art-approval-base-color"
            className="input"
            value={values.baseColor}
            onChange={(e) => onValuesChange({ baseColor: e.target.value })}
            disabled={disabled}
          />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="art-approval-additional-notes">
          Additional notes
        </label>
        <textarea
          id="art-approval-additional-notes"
          className="input min-h-[96px]"
          value={values.additionalNotes}
          onChange={(e) => onValuesChange({ additionalNotes: e.target.value })}
          disabled={disabled}
        />
      </div>
      <div className="rounded-panel border border-slate-200 p-4 space-y-4">
        <label className="inline-flex items-center gap-2 text-body text-text-primary">
          <input
            type="checkbox"
            checked={values.includeLogo2}
            onChange={(e) => onValuesChange({ includeLogo2: e.target.checked })}
            disabled={disabled}
          />
          Add Logo 2
        </label>
        {values.includeLogo2 ? (
          <>
            <div>
              <label className="label" htmlFor="art-approval-logo2">
                Logo 2
              </label>
              <input
                id="art-approval-logo2"
                className="input"
                value={values.logo2}
                onChange={(e) => onValuesChange({ logo2: e.target.value })}
                disabled={disabled}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="label" htmlFor="art-approval-logo2-color">
                  Color
                </label>
                <input
                  id="art-approval-logo2-color"
                  className="input"
                  value={values.logo2Color}
                  onChange={(e) => onValuesChange({ logo2Color: e.target.value })}
                  disabled={disabled}
                />
              </div>
              <div>
                <label className="label" htmlFor="art-approval-logo2-location">
                  Location
                </label>
                <input
                  id="art-approval-logo2-location"
                  className="input"
                  value={values.logo2Location}
                  onChange={(e) => onValuesChange({ logo2Location: e.target.value })}
                  disabled={disabled}
                />
              </div>
              <div>
                <label className="label" htmlFor="art-approval-logo2-application">
                  Application
                </label>
                <input
                  id="art-approval-logo2-application"
                  className="input"
                  value={values.logo2Application}
                  onChange={(e) => onValuesChange({ logo2Application: e.target.value })}
                  disabled={disabled}
                />
              </div>
            </div>
          </>
        ) : null}
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
