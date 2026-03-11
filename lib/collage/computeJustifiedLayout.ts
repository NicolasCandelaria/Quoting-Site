import type { CollageLayout, LayoutImageSlot, LayoutRow } from "./types";

type InputImage = {
  id: string;
  aspectRatio: number;
};

type LayoutOptions = {
  canvasWidth?: number;
  outerPadding?: number;
  targetRowHeight?: number;
  minRowHeight?: number;
  maxRowHeight?: number;
  gap?: number;
};

const DEFAULTS: Required<LayoutOptions> = {
  canvasWidth: 1600,
  outerPadding: 32,
  targetRowHeight: 320,
  minRowHeight: 220,
  maxRowHeight: 380,
  gap: 16,
};

export function computeJustifiedLayout(
  images: InputImage[],
  options: LayoutOptions = {},
): CollageLayout {
  const {
    canvasWidth,
    outerPadding,
    targetRowHeight,
    minRowHeight,
    maxRowHeight,
    gap,
  } = { ...DEFAULTS, ...options };

  if (images.length === 0) {
    return {
      rows: [],
      canvasWidth,
      canvasHeight: canvasWidth * 0.6,
    };
  }

  const contentWidth = canvasWidth - 2 * outerPadding;
  const rows: LayoutRow[] = [];

  let currentRow: InputImage[] = [];
  let currentSumAspect = 0;

  const finalizeRow = (
    rowImages: InputImage[],
    isLastRow: boolean,
    accumulatedHeight: number,
  ): { row: LayoutRow; height: number } => {
    const count = rowImages.length;
    const gapsWidth = gap * Math.max(0, count - 1);
    const availableWidth = contentWidth - gapsWidth;

    let sumAspect = 0;
    rowImages.forEach((img) => {
      sumAspect += img.aspectRatio;
    });

    let rowHeight = availableWidth / Math.max(sumAspect, 0.0001);
    if (!isLastRow) {
      rowHeight = Math.min(Math.max(rowHeight, minRowHeight), maxRowHeight);
    } else {
      if (rowHeight < minRowHeight) {
        rowHeight = minRowHeight;
      } else if (rowHeight > maxRowHeight) {
        rowHeight = maxRowHeight;
      }
    }

    const slots: LayoutImageSlot[] = [];
    let x = outerPadding;
    let totalWidth = 0;

    rowImages.forEach((img, index) => {
      const idealWidth = rowHeight * img.aspectRatio;
      const width = idealWidth;
      slots.push({
        id: img.id,
        x,
        y: accumulatedHeight + outerPadding,
        width,
        height: rowHeight,
      });
      x += width + gap;
      totalWidth += width;
    });

    const usedWidth = totalWidth + gapsWidth;
    if (isLastRow && usedWidth < contentWidth) {
      const shift = (contentWidth - usedWidth) / 2;
      slots.forEach((slot) => {
        slot.x += shift;
      });
    } else if (!isLastRow && usedWidth !== contentWidth && totalWidth > 0) {
      const scale = (contentWidth - gapsWidth) / totalWidth;
      x = outerPadding;
      slots.forEach((slot) => {
        const width = slot.width * scale;
        slot.x = x;
        slot.width = width;
        slot.height = rowHeight;
        slot.y = accumulatedHeight + outerPadding;
        x += width + gap;
      });
    }

    const row: LayoutRow = {
      height: rowHeight,
      yOffset: accumulatedHeight,
      images: slots,
    };

    return { row, height: rowHeight };
  };

  let accumulatedHeight = 0;

  for (let i = 0; i < images.length; i += 1) {
    const img = images[i];
    currentRow.push(img);
    currentSumAspect += img.aspectRatio;

    const gapsWidth = gap * Math.max(0, currentRow.length - 1);
    const availableWidth = contentWidth - gapsWidth;
    const rowHeight = availableWidth / Math.max(currentSumAspect, 0.0001);

    if (rowHeight <= targetRowHeight || i === images.length - 1) {
      const { row, height } = finalizeRow(
        currentRow,
        i === images.length - 1,
        accumulatedHeight,
      );
      rows.push(row);
      accumulatedHeight += height + gap;
      currentRow = [];
      currentSumAspect = 0;
    }
  }

  if (currentRow.length > 0) {
    const { row, height } = finalizeRow(currentRow, true, accumulatedHeight);
    rows.push(row);
    accumulatedHeight += height + gap;
  }

  const canvasHeight =
    rows.length === 0
      ? canvasWidth * 0.6
      : accumulatedHeight + outerPadding - gap;

  return {
    rows,
    canvasWidth,
    canvasHeight,
  };
}

