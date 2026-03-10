import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Project, Item, PriceTier } from "@/lib/models";
import { formatQuoteDate } from "@/lib/format-date";

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

async function getImageBytes(src: string): Promise<Uint8Array | null> {
  if (src.startsWith("http://") || src.startsWith("https://")) {
    try {
      const res = await fetch(src, { cache: "no-store" });
      if (!res.ok) return null;
      const buf = await res.arrayBuffer();
      return new Uint8Array(buf);
    } catch {
      return null;
    }
  }
  return dataUrlToUint8Array(src);
}

async function embedItemImages(doc: PDFDocument, item: Item) {
  const images: string[] = Array.isArray(item.images) ? item.images : [];
  const result: { width: number; height: number; ref: any }[] = [];

  for (const src of images) {
    const bytes = await getImageBytes(src);
    if (!bytes || bytes.length === 0) continue;
    try {
      let image;
      if (src.startsWith("data:image/png") || src.endsWith(".png")) {
        image = await doc.embedPng(bytes);
      } else if (
        src.startsWith("data:image/jpeg") ||
        src.startsWith("data:image/jpg") ||
        src.endsWith(".jpg") ||
        src.endsWith(".jpeg")
      ) {
        image = await doc.embedJpg(bytes);
      } else {
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

function wrapText(
  text: string,
  font: any,
  fontSize: number,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    const w = font.widthOfTextAtSize(next, fontSize);
    if (w <= maxWidth) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

const ITEM_PAGE_LEGAL =
  'This quote sheet together with the ideas expressed therein are the Confidential and Proprietary work of Billboard Worldwide Promotions Ltd. ("Billboard") and is delivered to the recipient for the sole and exclusive purpose of soliciting a PO, job, or contract for work from the recipient. Billboard is the sole and exclusive copyright owner of the images and/or ideas expressed in the Quote Sheet and the recipient will not copy or alter the same, including removing Billboard\'s name or trademarks or adding the name or trademarks of the recipient or any third party and the recipient will not present it as the recipient\'s own or original work without Billboard\'s prior written consent.';

export async function exportProjectPdf(project: Project) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28; // A4 width in points
  const pageHeight = 841.89; // A4 height in points
  const margin = 40;
  const footerZoneHeight = 52;
  const contentMinY = margin + footerZoneHeight;

  // Logo: load from same-origin (browser only)
  let logoImage: { ref: any; width: number; height: number } | null = null;
  if (typeof window !== "undefined") {
    const logoUrl = `${window.location.origin}/images/logo.png`;
    const logoBytes = await getImageBytes(logoUrl);
    if (logoBytes && logoBytes.length > 0) {
      try {
        const img = await pdfDoc.embedPng(logoBytes);
        logoImage = { ref: img, width: img.width, height: img.height };
      } catch {
        try {
          const img = await pdfDoc.embedJpg(logoBytes);
          logoImage = { ref: img, width: img.width, height: img.height };
        } catch {
          // ignore
        }
      }
    }
  }
  const logoDisplayHeight = 40;
  const logoScale = logoImage ? logoDisplayHeight / logoImage.height : 0;
  const logoDisplayWidth = logoImage ? logoImage.width * logoScale : 0;
  const logoGap = 22;

  function drawLogo(page: any) {
    if (!logoImage) return;
    page.drawImage(logoImage.ref, {
      x: margin,
      y: pageHeight - margin - logoDisplayHeight,
      width: logoDisplayWidth,
      height: logoDisplayHeight,
    });
  }

  function drawFooterLegal(page: any) {
    const lines = wrapText(ITEM_PAGE_LEGAL, font, 6, pageWidth - margin * 2);
    const lineHeight = 6.5;
    const topY = contentMinY - 4;
    lines.forEach((line, i) => {
      const y = topY - (i + 1) * lineHeight;
      if (y >= margin) {
        page.drawText(line, {
          x: margin,
          y,
          size: 6,
          font,
          color: rgb(0.45, 0.45, 0.48),
        });
      }
    });
  }

  const legalParagraphs: string[] = [
    "Artwork: This quotation is contingent upon receiving the required artwork and a confirmed purchase order. Any logo changes and/or additional artwork modifications may impact the production timeline and incur additional costs. If the first pre-production sample deviates from the original purchase order, the timeline will be affected, and new dates will need to be confirmed. Additionally, creative and design services—including artwork/logo development, modifications, design creation, and dye-line adjustments—are subject to additional charges.",
    "Custom pantone/color note: (substrate) Custom Pantone color will be matched as closely as possible to the pantone number provided; however, a 100% match cannot always be guaranteed due to substrate limitations.",
    "Freight: Air freight quotes remain valid for 7 days from the date issued and are subject to change based on space availability. Freight charges and pricing are subject to fluctuations, such as fuel price adjustments. Prices do not include TAX/VAT. Due to the fluctuating freight cost all quotes for ocean and air transit will be updated at the time your goods are ready, and a sailing/booking is confirmed. Government implemented electricity cuts/shutdowns may occur at our overseas factories without notice and may cause production delays.",
    "Please be advised that pricing may vary based on fluctuating tariff rates.",
    "Timelines to be confirmed upon receipt of PO as CNY can affect timeline/production time. Pre-production samples must be developed and approved prior to the order date to ensure timely delivery. Quotations are valid for 15 days. Lead times will be confirmed upon receipt of sign-off.",
  ];

  const pricingBasisLabel = project.pricingBasis === "FOB" ? "FOB" : "DDP";

  for (const item of project.items) {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    const { height } = page.getSize();

    drawLogo(page);

    let y = height - margin - (logoImage ? logoDisplayHeight + logoGap : 0);

    // Header: project + client
    const title = project.name;
    const clientLine = `Client: ${project.client}`;
    const dateLabel =
      project.quoteDate && project.quoteDate.trim() !== ""
        ? formatQuoteDate(project.quoteDate)
        : project.createdAt && !Number.isNaN(Date.parse(project.createdAt))
          ? new Date(project.createdAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : null;
    const contactLine = project.contactName
      ? `Billboard Worldwide contact: ${project.contactName}`
      : null;

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
    y -= 12;

    if (dateLabel) {
      page.drawText(`Date: ${dateLabel}`, {
        x: margin,
        y,
        size: 10,
        font,
        color: rgb(0.3, 0.3, 0.33),
      });
      y -= 12;
    }

    if (contactLine) {
      page.drawText(contactLine, {
        x: margin,
        y,
        size: 10,
        font,
        color: rgb(0.3, 0.3, 0.33),
      });
      y -= 14;
    }

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

    // Image block: show all images in a grid; resize so they fit on one page
    const imageBlockTop = y;
    const embeddedImages = await embedItemImages(pdfDoc, item);
    const maxImageBlockHeight = 200; // cap so caption, specs, pricing, footer fit without overlap
    const gap = 6;
    const captionGapAbove = 14; // space between image block and caption
    const captionGapBelow = 20; // space between caption and next section
    const n = embeddedImages.length;
    const perRow = n <= 1 ? 1 : n <= 4 ? 2 : 3;

    if (embeddedImages.length > 0) {
      const numRows = Math.ceil(embeddedImages.length / perRow);
      const rowHeight = (maxImageBlockHeight - gap * (numRows - 1)) / numRows;
      const thumbWidth = (pageWidth - margin * 2 - gap * (perRow - 1)) / perRow;
      const thumbHeight = rowHeight;
      const imageBlockHeightUsed = numRows * thumbHeight + gap * (numRows - 1);

      let imageY = imageBlockTop;
      let x = margin;
      let col = 0;

      for (const img of embeddedImages) {
        const scale = Math.min(
          thumbWidth / img.width,
          thumbHeight / img.height,
          1,
        );
        const w = img.width * scale;
        const h = img.height * scale;
        const yOffset = (thumbHeight - h) / 2;

        page.drawImage(img.ref, {
          x,
          y: imageY - thumbHeight + yOffset,
          width: w,
          height: h,
        });

        col += 1;
        if (col >= perRow) {
          col = 0;
          x = margin;
          imageY -= rowHeight + gap;
        } else {
          x += thumbWidth + gap;
        }
      }

      const captionY = imageBlockTop - imageBlockHeightUsed - captionGapAbove;
      page.drawText(
        "For visual representation purposes only. May not be exactly as shown.",
        {
          x: margin,
          y: captionY,
          size: 8,
          font,
          color: rgb(0.4, 0.4, 0.42),
          maxWidth: pageWidth - margin * 2,
        },
      );
      y = captionY - 10 - captionGapBelow;
    } else {
      y -= 20;
    }

    // Specs
    const specs: [string, string][] = [];
    if (item.material) specs.push(["Material", item.material]);
    if (item.size) specs.push(["Size", item.size]);
    if (item.logo) specs.push(["Logo", item.logo]);
    if (item.baseColor) specs.push(["Base color", item.baseColor]);
    if (item.additionalNotes) specs.push(["Additional notes", item.additionalNotes]);

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
      page.drawText(
        pricingBasisLabel === "FOB" ? "Pricing (FOB)" : "Pricing (DDP)",
        {
          x: margin,
          y,
          size: 11,
          font: boldFont,
          color: rgb(0.05, 0.05, 0.07),
        },
      );
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
      page.drawText(`Price / Unit (${pricingBasisLabel})`, {
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
        if (y < contentMinY + 10) break;
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

      y -= 12;
    }

    drawFooterLegal(page);
  }

  // Final legal page
  const legalPage = pdfDoc.addPage([pageWidth, pageHeight]);
  drawLogo(legalPage);
  let legalY = pageHeight - margin - (logoImage ? logoDisplayHeight + logoGap : 0);

  legalPage.drawText("Artwork, Freight & Terms", {
    x: margin,
    y: legalY,
    size: 14,
    font: boldFont,
    color: rgb(0.05, 0.05, 0.07),
  });
  legalY -= 22;

  const maxLegalWidth = pageWidth - margin * 2;
  const legalFontSize = 9;
  const legalLineHeight = 12;

  for (const paragraph of legalParagraphs) {
    const lines = wrapText(paragraph, font, legalFontSize, maxLegalWidth);
    for (const line of lines) {
      legalPage.drawText(line, {
        x: margin,
        y: legalY,
        size: legalFontSize,
        font,
        color: rgb(0.25, 0.25, 0.28),
      });
      legalY -= legalLineHeight;
    }
    legalY -= 8;
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

