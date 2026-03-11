import type { CollageLayout, LayoutImageSlot, LayoutRow } from "./types";

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
  targetRowHeight: 240,
  minRowHeight: 180,
  maxRowHeight: 300,
  gap: 16,
};

export function computeJustifiedLayout(
  images: { id: string; aspectRatio: number }[],
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

  // Special-case 3 images: 2 on top, 1 centered below.
  if (images.length === 3) {
    const rowHeight = Math.min(
      Math.max(targetRowHeight, minRowHeight),
      maxRowHeight,
    );

    const topSlotWidth =
      (contentWidth - gap) / 2; // two slots + one gap
    const bottomSlotWidth = contentWidth; // full width

    const topY = outerPadding;
    const bottomY = outerPadding + rowHeight + gap;

    const topRow: LayoutRow = {
      height: rowHeight,
      yOffset: 0,
      images: [
        {
          id: images[0]?.id,
          x: outerPadding,
          y: topY,
          width: topSlotWidth,
          height: rowHeight,
        },
        {
          id: images[1]?.id,
          x: outerPadding + topSlotWidth + gap,
          y: topY,
          width: topSlotWidth,
          height: rowHeight,
        },
      ].filter((slot): slot is LayoutImageSlot => Boolean(slot.id)),
    };

    const bottomRow: LayoutRow = {
      height: rowHeight,
      yOffset: rowHeight + gap,
      images: [
        {
          id: images[2]?.id,
          x: outerPadding,
          y: bottomY,
          width: bottomSlotWidth,
          height: rowHeight,
        },
      ].filter((slot): slot is LayoutImageSlot => Boolean(slot.id)),
    };

    const canvasHeight =
      outerPadding * 2 + rowHeight * 2 + gap;

    return {
      rows: [topRow, bottomRow],
      canvasWidth,
      canvasHeight,
    };
  }

  // Simple grid layout for all other counts:
  // - Fill images left-to-right, then wrap to the next row (row-major).
  // - Use up to 3 columns, or fewer if there are fewer images.
  const maxColumns = 3;
  const columns = Math.min(maxColumns, images.length);
  const rowsCount = Math.ceil(images.length / columns);

  const slotWidth =
    (contentWidth - gap * Math.max(0, columns - 1)) / Math.max(columns, 1);
  const rowHeight = Math.min(
    Math.max(targetRowHeight, minRowHeight),
    maxRowHeight,
  );

  for (let rowIndex = 0; rowIndex < rowsCount; rowIndex += 1) {
    const slots: LayoutImageSlot[] = [];

    for (let colIndex = 0; colIndex < columns; colIndex += 1) {
      const imageIndex = rowIndex * columns + colIndex;
      const image = images[imageIndex];
      if (!image) continue;

      const x =
        outerPadding + colIndex * (slotWidth + gap);
      const y =
        outerPadding + rowIndex * (rowHeight + gap);

      slots.push({
        id: image.id,
        x,
        y,
        width: slotWidth,
        height: rowHeight,
      });
    }

    rows.push({
      height: rowHeight,
      yOffset: rowIndex * (rowHeight + gap),
      images: slots,
    });
  }

  const canvasHeight =
    rows.length === 0
      ? canvasWidth * 0.6
      : outerPadding * 2 +
        rowsCount * rowHeight +
        gap * Math.max(0, rowsCount - 1);

  return {
    rows,
    canvasWidth,
    canvasHeight,
  };
}

