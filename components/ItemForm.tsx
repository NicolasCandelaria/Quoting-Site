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
  priceTiers: [],
};

export function ItemForm({ initial, onSubmit, onCancel }: ItemFormProps) {
  const [item, setItem] = useState<Item>(
    initial ?? { id: crypto.randomUUID(), ...emptyItemBase },
  );

  const updateField = (field: keyof Item, value: string) => {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(item);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="card p-5 space-y-4">
        <h2 className="text-base font-semibold text-slate-900">
          Core Details
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Name</label>
            <input
              className="input"
              value={item.name}
              onChange={(e) => updateField("name", e.target.value)}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Short Description</label>
            <textarea
              className="input min-h-[72px]"
              value={item.shortDescription}
              onChange={(e) =>
                updateField("shortDescription", e.target.value)
              }
              required
            />
          </div>
          <div>
            <label className="label">Material</label>
            <input
              className="input"
              value={item.material}
              onChange={(e) => updateField("material", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Size</label>
            <input
              className="input"
              value={item.size}
              onChange={(e) => updateField("size", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Logo</label>
            <input
              className="input"
              value={item.logo}
              onChange={(e) => updateField("logo", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Pre-Production Sample Time</label>
            <input
              className="input"
              value={item.preProductionSampleTime}
              onChange={(e) =>
                updateField("preProductionSampleTime", e.target.value)
              }
            />
          </div>
          <div>
            <label className="label">Pre-Production Sample Fee</label>
            <input
              className="input"
              value={item.preProductionSampleFee}
              onChange={(e) =>
                updateField("preProductionSampleFee", e.target.value)
              }
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Packing Details</label>
            <textarea
              className="input min-h-[72px]"
              value={item.packingDetails}
              onChange={(e) =>
                updateField("packingDetails", e.target.value)
              }
            />
          </div>
        </div>
      </section>

      <section className="card p-5 space-y-4">
        <h2 className="text-base font-semibold text-zinc-950">
          Product Images
        </h2>
        <ImageDropzone
          images={item.images}
          previewIndex={item.previewImageIndex}
          onChange={(images, previewIndex) =>
            setItem((prev) => ({ ...prev, images, previewImageIndex: previewIndex }))
          }
        />
      </section>

      <section className="card p-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold text-slate-900">
            Pricing Tiers
          </h2>
          <button
            type="button"
            className="btn-secondary !px-3 !py-1.5 text-xs"
            onClick={addTier}
          >
            Add Tier
          </button>
        </div>
        {item.priceTiers.length === 0 ? (
          <p className="text-xs text-slate-500">
            No pricing tiers yet. Add at least one tier for client pricing.
          </p>
        ) : (
          <div className="space-y-3">
            {item.priceTiers.map((tier, index) => (
              <div
                key={index}
                className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_1.2fr_auto]"
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
                  <label className="label text-xs">
                    Production + Transit Time
                  </label>
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
                    className="text-xs text-slate-500 hover:text-red-500"
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
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
          >
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

