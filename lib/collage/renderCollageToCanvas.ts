import type { CollageLayout, SourceImage } from "./types";

type DrawOptions = {
  fitMode?: "cover" | "contain";
};

function drawCollageOnContext(
  ctx: CanvasRenderingContext2D,
  layout: CollageLayout,
  sourceImages: SourceImage[],
  options: DrawOptions = {},
) {
  const fitMode = options.fitMode ?? "contain";

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, layout.canvasWidth, layout.canvasHeight);

  const radius = fitMode === "cover" ? 0 : 16;

  for (const row of layout.rows) {
    for (const slot of row.images) {
      const img = sourceImages.find((s) => s.id === slot.id);
      if (!img || img.decodeError) continue;

      ctx.save();
      const x = slot.x;
      const y = slot.y;
      const w = slot.width;
      const h = slot.height;

      if (radius > 0) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + w - radius, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
        ctx.lineTo(x + w, y + h - radius);
        ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
        ctx.lineTo(x + radius, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.clip();
      } else {
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();
      }

      const sourceWidth = Math.max(img.naturalWidth, 1);
      const sourceHeight = Math.max(img.naturalHeight, 1);

      const scale =
        fitMode === "cover"
          ? Math.max(w / sourceWidth, h / sourceHeight)
          : Math.min(w / sourceWidth, h / sourceHeight);
      const drawWidth = sourceWidth * scale;
      const drawHeight = sourceHeight * scale;
      const offsetX = x + (w - drawWidth) / 2;
      const offsetY = y + (h - drawHeight) / 2;

      const imageElement = new Image();
      imageElement.src = img.dataUrl;
      ctx.drawImage(imageElement, offsetX, offsetY, drawWidth, drawHeight);
      ctx.restore();
    }
  }
}

export function renderCollageToCanvas(
  sourceImages: SourceImage[],
  layout: CollageLayout,
  options: DrawOptions = {},
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = layout.canvasWidth;
  canvas.height = layout.canvasHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get canvas context.");
  }

  drawCollageOnContext(ctx, layout, sourceImages, options);

  return canvas;
}

