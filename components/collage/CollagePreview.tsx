"use client";

import { useEffect, useRef } from "react";
import type { CollageLayout, SourceImage } from "@/lib/collage/types";
import { renderCollageToCanvas } from "@/lib/collage/renderCollageToCanvas";

type Props = {
  sourceImages: SourceImage[];
  layout: CollageLayout | null;
};

export function CollagePreview({ sourceImages, layout }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!layout) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = layout.canvasWidth;
    canvas.height = layout.canvasHeight;

    const offscreen = renderCollageToCanvas(sourceImages, layout, {
      lowCountSafeCover:
        sourceImages.length === 2 ||
        sourceImages.length === 3 ||
        sourceImages.length === 4,
      fitMode:
        sourceImages.length >= 2 && sourceImages.length <= 4
          ? undefined
          : "contain",
    });
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(offscreen, 0, 0);
  }, [layout, sourceImages]);

  if (!layout || sourceImages.length === 0) {
    return (
      <div className="flex h-full min-h-[260px] items-center justify-center rounded-panel border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center">
        <p className="max-w-xs text-caption text-text-secondary">
          Add source images on the left to see a live collage preview.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-panel border border-slate-200 bg-slate-50 p-3">
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "auto", maxHeight: 480 }}
      />
    </div>
  );
}

