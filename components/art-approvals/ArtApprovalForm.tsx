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
  logos: Array<{
    logo: string;
    color: string;
    location: string;
    application: string;
  }>;
  baseColor: string;
  additionalNotes: string;
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
  const updateLogo = (
    index: number,
    patch: Partial<ArtApprovalFormValues["logos"][number]>,
  ) => {
    const next = values.logos.map((logo, i) => (i === index ? { ...logo, ...patch } : logo));
    onValuesChange({ logos: next });
  };

  const addLogo = () => {
    if (values.logos.length >= 6) return;
    onValuesChange({
      logos: [...values.logos, { logo: "", color: "", location: "", application: "" }],
    });
  };

  const removeLogo = (index: number) => {
    if (values.logos.length <= 1) return;
    onValuesChange({
      logos: values.logos.filter((_, i) => i !== index),
    });
  };

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
        {values.logos.map((logo, index) => {
          const num = index + 1;
          return (
            <div key={index} className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-body font-semibold text-text-primary">Logo {num}</h3>
                {values.logos.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeLogo(index)}
                    className="text-caption font-medium text-status-error hover:opacity-80 underline decoration-from-font"
                    disabled={disabled}
                  >
                    Remove Logo
                  </button>
                ) : null}
              </div>
              <div>
                <label className="label" htmlFor={`art-approval-logo-${num}`}>
                  Logo {num}
                </label>
                <input
                  id={`art-approval-logo-${num}`}
                  className="input"
                  value={logo.logo}
                  onChange={(e) => updateLogo(index, { logo: e.target.value })}
                  disabled={disabled}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="label" htmlFor={`art-approval-logo-${num}-color`}>
                    Color
                  </label>
                  <input
                    id={`art-approval-logo-${num}-color`}
                    className="input"
                    value={logo.color}
                    onChange={(e) => updateLogo(index, { color: e.target.value })}
                    disabled={disabled}
                  />
                </div>
                <div>
                  <label className="label" htmlFor={`art-approval-logo-${num}-location`}>
                    Location
                  </label>
                  <input
                    id={`art-approval-logo-${num}-location`}
                    className="input"
                    value={logo.location}
                    onChange={(e) => updateLogo(index, { location: e.target.value })}
                    disabled={disabled}
                  />
                </div>
                <div>
                  <label className="label" htmlFor={`art-approval-logo-${num}-application`}>
                    Application
                  </label>
                  <input
                    id={`art-approval-logo-${num}-application`}
                    className="input"
                    value={logo.application}
                    onChange={(e) => updateLogo(index, { application: e.target.value })}
                    disabled={disabled}
                  />
                </div>
              </div>
            </div>
          );
        })}
        {values.logos.length < 6 ? (
          <button
            type="button"
            onClick={addLogo}
            className="text-caption font-medium text-accent hover:text-accent-hover underline decoration-from-font"
            disabled={disabled}
          >
            Add New Logo
          </button>
        ) : (
          <p className="text-caption text-text-secondary">Maximum of 6 logos reached.</p>
        )}
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
