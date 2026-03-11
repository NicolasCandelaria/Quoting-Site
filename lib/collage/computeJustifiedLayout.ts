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

  const rowHeight = Math.min(
    Math.max(targetRowHeight, minRowHeight),
    maxRowHeight,
  );

  // Special-case 2 images: aspect-ratio-aware single row, gap = 0.
  if (images.length === 2) {
    const ar1 = images[0]?.aspectRatio ?? 1;
    const ar2 = images[1]?.aspectRatio ?? 1;
    const sumAr = ar1 + ar2;
    let rowHeight = contentWidth / Math.max(sumAr, 0.001);
    rowHeight = Math.min(Math.max(rowHeight, minRowHeight), maxRowHeight);

    const width1 = (contentWidth * ar1) / Math.max(sumAr, 0.001);
    const width2 = contentWidth - width1;
    const y = outerPadding;

    const row: LayoutRow = {
      height: rowHeight,
      yOffset: 0,
      images: [
        {
          id: images[0]?.id,
          x: outerPadding,
          y,
          width: width1,
          height: rowHeight,
        },
        {
          id: images[1]?.id,
          x: outerPadding + width1,
          y,
          width: width2,
          height: rowHeight,
        },
      ].filter((slot): slot is LayoutImageSlot => Boolean(slot.id)),
    };

    const canvasHeight = outerPadding * 2 + rowHeight;

    return {
      rows: [row],
      canvasWidth,
      canvasHeight,
    };
  }

  // Special-case 3 images: aspect-ratio-aware top row (2 tiles) + full-width bottom, gap = 0.
  if (images.length === 3) {
    const ar1 = images[0]?.aspectRatio ?? 1;
    const ar2 = images[1]?.aspectRatio ?? 1;
    const ar3 = images[2]?.aspectRatio ?? 1;
    const sumArTop = ar1 + ar2;

    let topRowHeight = contentWidth / Math.max(sumArTop, 0.001);
    topRowHeight = Math.min(Math.max(topRowHeight, minRowHeight), maxRowHeight);

    let bottomRowHeight = contentWidth / Math.max(ar3, 0.001);
    bottomRowHeight = Math.min(
      Math.max(bottomRowHeight, minRowHeight),
      maxRowHeight,
    );

    const width1 = (contentWidth * ar1) / Math.max(sumArTop, 0.001);
    const width2 = contentWidth - width1;

    const topY = outerPadding;
    const bottomY = outerPadding + topRowHeight;

    const topRow: LayoutRow = {
      height: topRowHeight,
      yOffset: 0,
      images: [
        {
          id: images[0]?.id,
          x: outerPadding,
          y: topY,
          width: width1,
          height: topRowHeight,
        },
        {
          id: images[1]?.id,
          x: outerPadding + width1,
          y: topY,
          width: width2,
          height: topRowHeight,
        },
      ].filter((slot): slot is LayoutImageSlot => Boolean(slot.id)),
    };

    const bottomRow: LayoutRow = {
      height: bottomRowHeight,
      yOffset: topRowHeight,
      images: [
        {
          id: images[2]?.id,
          x: outerPadding,
          y: bottomY,
          width: contentWidth,
          height: bottomRowHeight,
        },
      ].filter((slot): slot is LayoutImageSlot => Boolean(slot.id)),
    };

    const canvasHeight =
      outerPadding * 2 + topRowHeight + bottomRowHeight;

    return {
      rows: [topRow, bottomRow],
      canvasWidth,
      canvasHeight,
    };
  }

  // Special-case 4 images: 2x2 grid.
  if (images.length === 4) {
    const slotWidth =
      (contentWidth - gap) / 2;

    const firstRowY = outerPadding;
    const secondRowY = outerPadding + rowHeight + gap;

    const firstRow: LayoutRow = {
      height: rowHeight,
      yOffset: 0,
      images: [
        {
          id: images[0]?.id,
          x: outerPadding,
          y: firstRowY,
          width: slotWidth,
          height: rowHeight,
        },
        {
          id: images[1]?.id,
          x: outerPadding + slotWidth + gap,
          y: firstRowY,
          width: slotWidth,
          height: rowHeight,
        },
      ].filter((slot): slot is LayoutImageSlot => Boolean(slot.id)),
    };

    const secondRow: LayoutRow = {
      height: rowHeight,
      yOffset: rowHeight + gap,
      images: [
        {
          id: images[2]?.id,
          x: outerPadding,
          y: secondRowY,
          width: slotWidth,
          height: rowHeight,
        },
        {
          id: images[3]?.id,
          x: outerPadding + slotWidth + gap,
          y: secondRowY,
          width: slotWidth,
          height: rowHeight,
        },
      ].filter((slot): slot is LayoutImageSlot => Boolean(slot.id)),
    };

    const canvasHeight =
      outerPadding * 2 + rowHeight * 2 + gap;

    return {
      rows: [firstRow, secondRow],
      canvasWidth,
      canvasHeight,
    };
  }

  // Special-case 5 images: 3 on top, 2 below.
  if (images.length === 5) {
    const topSlotWidth =
      (contentWidth - gap * 2) / 3;
    const bottomSlotWidth =
      (contentWidth - gap) / 2;

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
        {
          id: images[2]?.id,
          x: outerPadding + (topSlotWidth + gap) * 2,
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
          id: images[3]?.id,
          x: outerPadding,
          y: bottomY,
          width: bottomSlotWidth,
          height: rowHeight,
        },
        {
          id: images[4]?.id,
          x: outerPadding + bottomSlotWidth + gap,
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

