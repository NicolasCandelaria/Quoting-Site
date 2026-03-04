"use client";

import { useCallback, useMemo, useRef, useState } from "react";

type Props = {
  images: string[];
  previewIndex: number;
  onChange: (images: string[], previewIndex: number) => void;
};

export function ImageDropzone({ images, previewIndex, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const normalizedPreviewIndex = useMemo(() => {
    if (images.length === 0) return 0;
    if (previewIndex < 0 || previewIndex >= images.length) return 0;
    return previewIndex;
  }, [images, previewIndex]);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      setError("");
      setUploading(true);

      try {
        const uploadedUrls: string[] = [];

        for (const file of Array.from(files)) {
          const form = new FormData();
          form.append("file", file);

          const response = await fetch("/api/uploads", {
            method: "POST",
            body: form,
          });

          const body = (await response.json()) as { url?: string; error?: string };

          if (!response.ok || !body.url) {
            throw new Error(body.error || "Image upload failed.");
          }

          uploadedUrls.push(body.url);
        }

        const nextImages = [...images, ...uploadedUrls];
        const nextPreviewIndex = images.length === 0 ? 0 : normalizedPreviewIndex;
        onChange(nextImages, nextPreviewIndex);
      } catch (uploadError) {
        const message =
          uploadError instanceof Error ? uploadError.message : "Image upload failed.";
        setError(message);
      } finally {
        setUploading(false);
      }
    },
    [images, normalizedPreviewIndex, onChange],
  );

  const removeImage = (index: number) => {
    const nextImages = images.filter((_, imageIndex) => imageIndex !== index);

    if (nextImages.length === 0) {
      onChange([], 0);
      return;
    }

    if (index === normalizedPreviewIndex) {
      onChange(nextImages, 0);
      return;
    }

    const nextPreviewIndex = index < normalizedPreviewIndex
      ? normalizedPreviewIndex - 1
      : normalizedPreviewIndex;

    onChange(nextImages, nextPreviewIndex);
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 text-center text-xs sm:text-sm transition ${
          isDragging ? "border-brand-500 bg-brand-50" : "border-slate-300 bg-slate-50"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          void handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
      >
        <p className="font-medium text-slate-800">Drag &amp; drop product images</p>
        <p className="mt-1 text-slate-500">or click to browse</p>
        <p className="mt-2 text-[11px] text-slate-400">JPG, PNG or GIF. Uploaded to cloud storage.</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          void handleFiles(e.target.files);
        }}
      />

      {uploading && <p className="text-xs text-slate-500">Uploading image(s)…</p>}

      {error && <p className="text-xs text-red-600">{error}</p>}

      {images.length > 0 && (
        <div className="mt-1 space-y-2">
          <p className="mb-1 text-xs font-medium text-slate-700">Preview</p>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[normalizedPreviewIndex] ?? images[0]}
              alt="Uploaded preview"
              className="h-40 w-full object-cover"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {images.map((url, index) => (
              <div key={`${url}-${index}`} className="group relative">
                <button
                  type="button"
                  className={`overflow-hidden rounded border ${
                    index === normalizedPreviewIndex ? "border-brand-500" : "border-slate-200"
                  }`}
                  onClick={() => onChange(images, index)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Thumbnail ${index + 1}`} className="h-14 w-14 object-cover" />
                </button>
                <button
                  type="button"
                  className="absolute -right-1 -top-1 rounded-full bg-white px-1 text-[10px] text-red-600 shadow"
                  onClick={() => removeImage(index)}
                  aria-label={`Remove image ${index + 1}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
