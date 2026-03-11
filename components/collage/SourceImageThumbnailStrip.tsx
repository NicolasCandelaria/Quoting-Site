"use client";

import type { SourceImage } from "@/lib/collage/types";

type Props = {
  images: SourceImage[];
  onReorder: (newOrderIds: string[]) => void;
  onRemove: (id: string) => void;
};

export function SourceImageThumbnailStrip({
  images,
  onReorder,
  onRemove,
}: Props) {
  const move = (id: string, direction: -1 | 1) => {
    const index = images.findIndex((img) => img.id === id);
    if (index === -1) return;
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= images.length) return;

    const next = [...images];
    const [moved] = next.splice(index, 1);
    next.splice(newIndex, 0, moved);
    onReorder(next.map((img) => img.id));
  };

  if (images.length === 0) {
    return (
      <p className="text-caption text-text-secondary">
        Add up to 9 source images. Reorder them to change the collage layout.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      {images.map((image, index) => (
        <div
          key={image.id}
          className="group flex flex-col items-center gap-1 rounded-panel border border-slate-200 bg-slate-50 p-1"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.dataUrl}
            alt=""
            className="h-20 w-20 rounded-md object-cover"
          />
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="rounded-full border border-slate-200 px-1.5 py-0.5 text-[11px] text-text-secondary disabled:opacity-40"
              onClick={() => move(image.id, -1)}
              disabled={index === 0}
            >
              ←
            </button>
            <button
              type="button"
              className="rounded-full border border-slate-200 px-1.5 py-0.5 text-[11px] text-text-secondary disabled:opacity-40"
              onClick={() => move(image.id, 1)}
              disabled={index === images.length - 1}
            >
              →
            </button>
            <button
              type="button"
              className="rounded-full border border-slate-200 px-1.5 py-0.5 text-[11px] text-status-error"
              onClick={() => onRemove(image.id)}
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

