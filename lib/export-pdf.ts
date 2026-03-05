import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Project, Item, PriceTier } from "@/lib/models";
import { getItemPreviewImage } from "@/lib/item-image";

function dataUrlToUint8Array(dataUrl: string): Uint8Array | null {
  const parts = dataUrl.split(",");
  if (parts.length < 2) return null;
  const base64 = parts[1]!;
  try {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

async function embedItemImages(doc: PDFDocument, item: Item) {
  const images: string[] = Array.isArray(item.images) ? item.images : [];
  const result: { width: number; height: number; ref: any }[] = [];

  for (const dataUrl of images) {
    const bytes = dataUrlToUint8Array(dataUrl);
    if (!bytes) continue;
    try {
      // Try PNG first, then JPEG fallback
      let image;
      if (dataUrl.startsWith("data:image/png")) {
        image = await doc.embedPng(bytes);
      } else if (dataUrl.startsWith("data:image/jpeg") || dataUrl.startsWith("data:image/jpg")) {
        image = await doc.embedJpg(bytes);
      } else {
        // Heuristic: try PNG, then JPEG
        try {
          image = await doc.embedPng(bytes);
        } catch {
          image = await doc.embedJpg(bytes);
        }
      }
      result.push({
        width: image.width,
        height: image.height,
        ref: image,
      });
    } catch {
      // Skip invalid images
    }
  }

  return result;
}

function formatPriceTiers(tiers: PriceTier[]): PriceTier[] {
  return [...tiers].sort((a, b) => {
    if (a.qty === b.qty) return a.pricePerUnitDDP - b.pricePerUnitDDP;
    return a.qty - b.qty;
  });
}

export async function exportProjectPdf(project: Project) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28; // A4 width in points
  const pageHeight = 841.89; // A4 height in points
  const margin = 40;

  const finePrint =
    "This quote sheet together with the ideas expressed therein are the Confidential and Proprietary work of Billboard Worldwide Promotions Ltd. (“Billboard”) and is delivered to the recipient for the sole and exclusive purpose of soliciting a PO, job, or contract for work from the recipient. Billboard is the sole and exclusive copyright owner of the images and/or ideas expressed in the Quote Sheet and the recipient will not copy or alter the same, including removing Billboard’s name or trademarks or adding the name or trademarks of the recipient or any third party and the recipient will not present it as the recipient’s own or original work without Billboard’s prior written consent.";

  const priceNote =
    "Important note: Quotations are valid for 15 days. Lead times will be confirmed upon receipt of sign-off. Please be advised that pricing may vary based on fluctuating tariff rates.";

  for (const item of project.items) {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    const { height } = page.getSize();

    let y = height - margin;

    // Header: project + client
    const title = project.name;
    const clientLine = `Client: ${project.client}`;

    page.drawText(title, {
      x: margin,
      y,
      size: 18,
      font: boldFont,
      color: rgb(0.05, 0.05, 0.07),
    });
    y -= 22;

    page.drawText(clientLine, {
      x: margin,
      y,
      size: 11,
      font,
      color: rgb(0.25, 0.25, 0.28),
    });
    y -= 10;

    page.drawText(item.name, {
      x: margin,
      y,
      size: 14,
      font: boldFont,
      color: rgb(0.05, 0.05, 0.07),
    });
    y -= 18;

    if (item.shortDescription) {
      page.drawText(item.shortDescription, {
        x: margin,
        y,
        size: 10,
        font,
        color: rgb(0.25, 0.25, 0.28),
        maxWidth: pageWidth - margin * 2,
      });
      y -= 28;
    } else {
      y -= 8;
    }

    // Images (2 per row)
    const embeddedImages = await embedItemImages(pdfDoc, item);
    if (embeddedImages.length > 0) {
      const thumbWidth = 120;
      const thumbHeight = 90;
      const gap = 10;
      const perRow = 2;

      let imageY = y;
      let x = margin;
      let col = 0;

      for (const img of embeddedImages) {
        const scale = Math.min(thumbWidth / img.width, thumbHeight / img.height);
        const w = img.width * scale;
        const h = img.height * scale;

        page.drawImage(img.ref, {
          x,
          y: imageY - h,
          width: w,
          height: h,
        });

        col += 1;
        if (col >= perRow) {
          col = 0;
          x = margin;
          imageY -= thumbHeight + gap;
        } else {
          x += thumbWidth + gap;
        }
      }

      y = imageY - 20;

      page.drawText(
        "For visual representation purposes only. May not be exactly as shown.",
        {
          x: margin,
          y,
          size: 8,
          font,
          color: rgb(0.4, 0.4, 0.42),
          maxWidth: pageWidth - margin * 2,
        },
      );
      y -= 24;
    }

    // Specs
    const specs: [string, string][] = [];
    if (item.material) specs.push(["Material", item.material]);
    if (item.size) specs.push(["Size", item.size]);
    if (item.logo) specs.push(["Logo", item.logo]);

    if (specs.length > 0) {
      page.drawText("Specifications", {
        x: margin,
        y,
        size: 11,
        font: boldFont,
        color: rgb(0.05, 0.05, 0.07),
      });
      y -= 14;

      const labelColor = rgb(0.45, 0.45, 0.47);
      const valueColor = rgb(0.1, 0.1, 0.13);

      for (const [label, value] of specs) {
        page.drawText(`${label}:`, {
          x: margin,
          y,
          size: 9,
          font,
          color: labelColor,
        });
        page.drawText(value, {
          x: margin + 80,
          y,
          size: 9,
          font,
          color: valueColor,
          maxWidth: pageWidth - margin * 2 - 80,
        });
        y -= 12;
      }

      y -= 6;
    }

    // Pre-production
    if (item.preProductionSampleTime || item.preProductionSampleFee) {
      page.drawText("Pre-Production", {
        x: margin,
        y,
        size: 11,
        font: boldFont,
        color: rgb(0.05, 0.05, 0.07),
      });
      y -= 14;

      if (item.preProductionSampleTime) {
        page.drawText("Sample Time:", {
          x: margin,
          y,
          size: 9,
          font,
          color: rgb(0.45, 0.45, 0.47),
        });
        page.drawText(item.preProductionSampleTime, {
          x: margin + 80,
          y,
          size: 9,
          font,
          color: rgb(0.1, 0.1, 0.13),
        });
        y -= 12;
      }

      if (item.preProductionSampleFee) {
        page.drawText("Sample Fee:", {
          x: margin,
          y,
          size: 9,
          font,
          color: rgb(0.45, 0.45, 0.47),
        });
        page.drawText(item.preProductionSampleFee, {
          x: margin + 80,
          y,
          size: 9,
          font,
          color: rgb(0.1, 0.1, 0.13),
        });
        y -= 12;
      }

      y -= 8;
    }

    // Packing details
    if (item.packingDetails) {
      page.drawText("Packing Details", {
        x: margin,
        y,
        size: 11,
        font: boldFont,
        color: rgb(0.05, 0.05, 0.07),
      });
      y -= 14;

      page.drawText(item.packingDetails, {
        x: margin,
        y,
        size: 9,
        font,
        color: rgb(0.1, 0.1, 0.13),
        maxWidth: pageWidth - margin * 2,
      });
      y -= 40;
    }

    // Pricing
    const tiers = formatPriceTiers(item.priceTiers ?? []);
    if (tiers.length > 0) {
      page.drawText("Pricing (Delivered Duty Paid)", {
        x: margin,
        y,
        size: 11,
        font: boldFont,
        color: rgb(0.05, 0.05, 0.07),
      });
      y -= 14;

      const headerY = y;
      const colQty = margin;
      const colPrice = margin + 120;
      const colTime = margin + 240;

      page.drawText("Qty", {
        x: colQty,
        y: headerY,
        size: 9,
        font: boldFont,
        color: rgb(0.3, 0.3, 0.32),
      });
      page.drawText("Price / Unit (DDP)", {
        x: colPrice,
        y: headerY,
        size: 9,
        font: boldFont,
        color: rgb(0.3, 0.3, 0.32),
      });
      page.drawText("Production + Transit Time", {
        x: colTime,
        y: headerY,
        size: 9,
        font: boldFont,
        color: rgb(0.3, 0.3, 0.32),
      });

      y = headerY - 12;

      for (const tier of tiers) {
        page.drawText(tier.qty.toLocaleString(), {
          x: colQty,
          y,
          size: 9,
          font,
          color: rgb(0.1, 0.1, 0.13),
        });
        page.drawText(`$${tier.pricePerUnitDDP.toFixed(2)}`, {
          x: colPrice,
          y,
          size: 9,
          font,
          color: rgb(0.1, 0.1, 0.13),
        });
        page.drawText(tier.productionPlusTransitTime, {
          x: colTime,
          y,
          size: 9,
          font,
          color: rgb(0.1, 0.1, 0.13),
        });
        y -= 12;
      }

      y -= 8;

      page.drawText(priceNote, {
        x: margin,
        y,
        size: 8,
        font,
        color: rgb(0.4, 0.4, 0.42),
        maxWidth: pageWidth - margin * 2,
      });
    }

    // Footer fine print
    page.drawText(finePrint, {
      x: margin,
      y: margin + 20,
      size: 7,
      font,
      color: rgb(0.5, 0.5, 0.52),
      maxWidth: pageWidth - margin * 2,
    });
  }

const pdfBytes = await pdfDoc.save();

// Normalize to a plain ArrayBuffer-backed typed array for Blob typing.
const normalizedPdfBytes = new Uint8Array(pdfBytes);
const blob = new Blob([normalizedPdfBytes.buffer], {
  type: "application/pdf",
});
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${project.name || "quote-sheet"}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

