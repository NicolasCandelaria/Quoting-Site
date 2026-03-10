"use client";

import { useState } from "react";
import type { Item, PriceTier } from "@/lib/models";
import { ImageDropzone } from "./ImageDropzone";

type ItemFormProps = {
  initial?: Item;
  onSubmit: (item: Item) => void;
  onCancel?: () => void;
};

const emptyItemBase: Omit<Item, "id"> = {
  name: "",
  shortDescription: "",
  images: [],
  previewImageIndex: 0,
  material: "",
  size: "",
  logo: "",
  preProductionSampleTime: "",
  preProductionSampleFee: "",
  packingDetails: "",
  customFields: [],
  priceTiers: [],
};

export function ItemForm({ initial, onSubmit, onCancel }: ItemFormProps) {
  const [item, setItem] = useState<Item>(
    initial ?? { id: crypto.randomUUID(), ...emptyItemBase },
  );

  const updateField = (
    field:
      | "name"
      | "shortDescription"
      | "material"
      | "size"
      | "logo"
      | "preProductionSampleTime"
      | "preProductionSampleFee"
      | "packingDetails",
    value: string,
  ) => {
    setItem((prev) => ({ ...prev, [field]: value }));
  };

  const updatePriceTier = (index: number, patch: Partial<PriceTier>) => {
    setItem((prev) => {
      const tiers = [...prev.priceTiers];
      const current = tiers[index] ?? {
        qty: 0,
        pricePerUnitDDP: 0,
        productionPlusTransitTime: "",
      };
      tiers[index] = { ...current, ...patch };
      return { ...prev, priceTiers: tiers };
    });
  };

  const addTier = () => {
    setItem((prev) => ({
      ...prev,
      priceTiers: [
        ...prev.priceTiers,
        { qty: 0, pricePerUnitDDP: 0, productionPlusTransitTime: "" },
      ],
    }));
  };

  const removeTier = (index: number) => {
    setItem((prev) => ({
      ...prev,
      priceTiers: prev.priceTiers.filter((_, i) => i !== index),
    }));
  };

  const addCustomField = () => {
    setItem((prev) => ({
      ...prev,
      customFields: [...(prev.customFields ?? []), { name: "", value: "" }],
    }));
  };

  const updateCustomField = (
    index: number,
    patch: { name?: string; value?: string },
  ) => {
    setItem((prev) => {
      const fields = [...(prev.customFields ?? [])];
      const current = fields[index] ?? { name: "", value: "" };
      fields[index] = { ...current, ...patch };
      return { ...prev, customFields: fields };
    });
  };

  const removeCustomField = (index: number) => {
    setItem((prev) => ({
      ...prev,
      customFields: (prev.customFields ?? []).filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(item);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="card space-y-4">
        <h2 className="text-subsection-title font-semibold text-text-primary">Core Details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Name</label>
            <input className="input" value={item.name} onChange={(e) => updateField("name", e.target.value)} required />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Short Description</label>
            <textarea
              className="input min-h-[72px]"
              value={item.shortDescription}
              onChange={(e) => updateField("shortDescription", e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Material</label>
            <input className="input" value={item.material} onChange={(e) => updateField("material", e.target.value)} />
          </div>
          <div>
            <label className="label">Size</label>
            <input className="input" value={item.size} onChange={(e) => updateField("size", e.target.value)} />
          </div>
          <div>
            <label className="label">Logo</label>
            <input className="input" value={item.logo} onChange={(e) => updateField("logo", e.target.value)} />
          </div>
          <div>
            <label className="label">Pre-Production Sample Time</label>
            <input
              className="input"
              value={item.preProductionSampleTime}
              onChange={(e) => updateField("preProductionSampleTime", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Pre-Production Sample Fee</label>
            <input
              className="input"
              value={item.preProductionSampleFee}
              onChange={(e) => updateField("preProductionSampleFee", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Packing Details</label>
            <textarea
              className="input min-h-[72px]"
              value={item.packingDetails}
              onChange={(e) => updateField("packingDetails", e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-subsection-title font-semibold text-text-primary">Custom fields</h3>
            <button type="button" className="btn-secondary !px-3 !py-1.5 text-caption" onClick={addCustomField}>
              Add new field
            </button>
          </div>
          {(item.customFields ?? []).length === 0 ? (
            <p className="text-caption text-text-secondary">
              No custom fields. Add field name and value (e.g. Base color / black).
            </p>
          ) : (
            <div className="space-y-3">
              {(item.customFields ?? []).map((field, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-panel border border-slate-200 p-3 sm:grid-cols-[1fr_1fr_auto]"
                  style={{ background: "rgba(241,245,249,0.6)" }}
                >
                  <div>
                    <label className="label text-xs">Field name</label>
                    <input
                      className="input"
                      value={field.name}
                      onChange={(e) => updateCustomField(index, { name: e.target.value })}
                      placeholder="e.g. Base color"
                    />
                  </div>
                  <div>
                    <label className="label text-xs">Value</label>
                    <input
                      className="input"
                      value={field.value}
                      onChange={(e) => updateCustomField(index, { value: e.target.value })}
                      placeholder="e.g. black"
                    />
                  </div>
                  <div className="flex items-end justify-end">
                    <button
                      type="button"
                      className="text-caption text-text-secondary hover:text-status-error"
                      onClick={() => removeCustomField(index)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="text-subsection-title font-semibold text-text-primary">Product Images</h2>
        <ImageDropzone
          images={item.images}
          previewIndex={item.previewImageIndex}
          onChange={(images, previewImageIndex) =>
            setItem((prev) => ({ ...prev, images, previewImageIndex }))
          }
        />
      </section>

      <section className="card space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-subsection-title font-semibold text-text-primary">Pricing Tiers</h2>
          <button type="button" className="btn-secondary !px-3 !py-1.5 text-caption" onClick={addTier}>
            Add Tier
          </button>
        </div>
        {item.priceTiers.length === 0 ? (
          <p className="text-caption text-text-secondary">No pricing tiers yet. Add at least one tier for client pricing.</p>
        ) : (
          <div className="space-y-3">
            {item.priceTiers.map((tier, index) => (
              <div
                key={index}
                className="grid gap-3 rounded-panel border border-slate-200 p-3 sm:grid-cols-[1fr_1fr_1.2fr_auto]"
                style={{ background: "rgba(241,245,249,0.6)" }}
              >
                <div>
                  <label className="label text-xs">Qty</label>
                  <input
                    type="number"
                    className="input"
                    value={tier.qty}
                    min={0}
                    onChange={(e) =>
                      updatePriceTier(index, {
                        qty: Number(e.target.value || 0),
                      })
                    }
                  />
                </div>
                <div>
                  <label className="label text-xs">Price per Unit (DDP)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    value={tier.pricePerUnitDDP}
                    min={0}
                    onChange={(e) =>
                      updatePriceTier(index, {
                        pricePerUnitDDP: Number(e.target.value || 0),
                      })
                    }
                  />
                </div>
                <div>
                  <label className="label text-xs">Production + Transit Time</label>
                  <input
                    className="input"
                    value={tier.productionPlusTransitTime}
                    onChange={(e) =>
                      updatePriceTier(index, {
                        productionPlusTransitTime: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="flex items-end justify-end">
                  <button
                    type="button"
                    className="text-caption text-text-secondary hover:text-status-error"
                    onClick={() => removeTier(index)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="flex items-center justify-between gap-3">
        {onCancel && (
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn-primary ml-auto">
          Save Item
        </button>
      </div>
    </form>
  );
}
