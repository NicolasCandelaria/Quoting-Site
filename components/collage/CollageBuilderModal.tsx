"use client";

import { useEffect, useMemo, useState } from "react";
import { SourceImageDropzone } from "./SourceImageDropzone";
import { SourceImageThumbnailStrip } from "./SourceImageThumbnailStrip";
import { CollagePreview } from "./CollagePreview";
import type {
  CollageLayout,
  SourceImage,
} from "@/lib/collage/types";
import { computeJustifiedLayout } from "@/lib/collage/computeJustifiedLayout";
import { renderCollageToCanvas } from "@/lib/collage/renderCollageToCanvas";
import { exportCanvasToJpegBlob } from "@/lib/collage/exportCanvasToJpegBlob";

type Props = {
  projectName: string;
  itemName: string;
  onConfirm: (imageUrl: string) => void;
  onCancel: () => void;
};

function sanitizeForFilename(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function fileToSourceImage(file: File): Promise<SourceImage> {
  const id = crypto.randomUUID();

  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === "string" ? reader.result : "");
    };
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });

  return new Promise<SourceImage>((resolve) => {
    const image = new Image();
    image.onload = () => {
      resolve({
        id,
        file,
        dataUrl,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
      });
    };
    image.onerror = () => {
      resolve({
        id,
        file,
        dataUrl,
        naturalWidth: 0,
        naturalHeight: 0,
        decodeError: "Could not decode image.",
      });
    };
    image.src = dataUrl;
  });
}

export function CollageBuilderModal({
  projectName,
  itemName,
  onConfirm,
  onCancel,
}: Props) {
  const [sourceImages, setSourceImages] = useState<SourceImage[]>([]);
  const [layout, setLayout] = useState<CollageLayout | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dropError, setDropError] = useState<string | undefined>(undefined);

  const validImages = useMemo(
    () => sourceImages.filter((img) => !img.decodeError),
    [sourceImages],
  );

  useEffect(() => {
    if (validImages.length === 0) {
      setLayout(null);
      return;
    }
    const inputs = validImages.map((img) => ({
      id: img.id,
      aspectRatio:
        img.naturalWidth > 0 && img.naturalHeight > 0
          ? img.naturalWidth / img.naturalHeight
          : 1,
    }));
    const nextLayout = computeJustifiedLayout(inputs);
    setLayout(nextLayout);
  }, [validImages]);

  const handleAddFiles = async (files: File[]) => {
    setDropError(undefined);
    setErrorMessage(null);

    const currentCount = sourceImages.length;
    const remaining = Math.max(0, 9 - currentCount);
    if (remaining <= 0) {
      setDropError("Maximum 9 images allowed; extra files were ignored.");
      return;
    }

    const limitedFiles = files.slice(0, remaining);
    if (limitedFiles.length < files.length) {
      setDropError("Maximum 9 images allowed; extra files were ignored.");
    }

    const newImages: SourceImage[] = [];
    for (const file of limitedFiles) {
      const src = await fileToSourceImage(file);
      newImages.push(src);
    }

    setSourceImages((prev) => [...prev, ...newImages]);
  };

  const handleReorder = (newOrderIds: string[]) => {
    setSourceImages((prev) => {
      const byId = new Map(prev.map((img) => [img.id, img]));
      return newOrderIds
        .map((id) => byId.get(id))
        .filter((img): img is SourceImage => Boolean(img));
    });
  };

  const handleRemove = (id: string) => {
    setSourceImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleUseCollage = async () => {
    if (!layout || validImages.length === 0) return;

    setIsExporting(true);
    setErrorMessage(null);

    try {
      const canvas = renderCollageToCanvas(validImages, layout, {
        lowCountSafeCover:
          validImages.length === 2 ||
          validImages.length === 3 ||
          validImages.length === 4,
        fitMode:
          validImages.length >= 2 && validImages.length <= 4
            ? undefined
            : "contain",
      });
      const blob = await exportCanvasToJpegBlob(canvas, 0.9);

      const safeProject = sanitizeForFilename(projectName || "project");
      const safeItem = sanitizeForFilename(itemName || "item");
      const filename = `${safeProject}-${safeItem}-collage.jpg`;

      const file = new File([blob], filename, { type: "image/jpeg" });
      const form = new FormData();
      form.append("file", file);

      const response = await fetch("/api/uploads", {
        method: "POST",
        body: form,
      });

      const body = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !body.url) {
        throw new Error(body.error || "Collage upload failed.");
      }

      onConfirm(body.url);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not create collage.";
      setErrorMessage(message);
    } finally {
      setIsExporting(false);
    }
  };

  const hasImages = sourceImages.length > 0;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <header className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">
                Create Collage for Item
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                Combine multiple photos into a single image for this item. The
                final collage will be used as the primary product image.
              </p>
            </div>
            <button
              type="button"
              className="rounded-full border border-slate-200 px-2 py-1 text-sm text-text-secondary hover:bg-slate-50"
              onClick={onCancel}
            >
              ✕
            </button>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-4 md:flex-row">
          <div className="flex w-full flex-1 flex-col gap-3 md:max-w-sm">
            <h3 className="text-sm font-medium text-text-primary">
              Source images
            </h3>
            <SourceImageDropzone
              onFiles={handleAddFiles}
              errorMessage={dropError}
            />
            <SourceImageThumbnailStrip
              images={sourceImages}
              onReorder={handleReorder}
              onRemove={handleRemove}
            />
          </div>

          <div className="flex w-full flex-1 flex-col gap-3">
            <h3 className="text-sm font-medium text-text-primary">
              Collage preview
            </h3>
            <CollagePreview sourceImages={validImages} layout={layout} />
          </div>
        </div>

        <footer className="border-t border-slate-200 px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              {!hasImages && (
                <p className="text-caption text-text-secondary">
                  Add at least one image to create a collage.
                </p>
              )}
              {errorMessage && (
                <p className="text-caption text-status-error">{errorMessage}</p>
              )}
            </div>
            <div className="flex items-center gap-2 sm:justify-end">
              <button
                type="button"
                className="btn-secondary"
                onClick={onCancel}
                disabled={isExporting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleUseCollage}
                disabled={!hasImages || isExporting}
              >
                {isExporting ? "Creating collage…" : "Use Collage for Item"}
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

