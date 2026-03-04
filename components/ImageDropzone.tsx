"use client";

import { useCallback, useRef, useState } from "react";

type Props = {
  value: string;
  onChange: (url: string) => void;
};

type MultiImageProps = {
  images: string[];
  previewIndex: number;
  onChange: (images: string[], previewIndex: number) => void;
};

type ImageDropzoneProps =
  | Props
  | MultiImageProps;

export function ImageDropzone(props: ImageDropzoneProps) {
  const images = "images" in props ? props.images : props.value ? [props.value] : [];
  const previewIndex = "previewIndex" in props ? props.previewIndex : 0;

  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;

      setError("");
      setUploading(true);

      try {
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

        if ("images" in props) {
          const nextImages = [...images, body.url];
          const nextPreviewIndex = images.length === 0 ? 0 : previewIndex;
          props.onChange(nextImages, nextPreviewIndex);
        } else {
          props.onChange(body.url);
        }
      } catch (uploadError) {
        const message =
          uploadError instanceof Error
            ? uploadError.message
            : "Image upload failed.";
        setError(message);
      } finally {
        setUploading(false);
      }
    },
    [images, previewIndex, props],
  );

  return (
    <div className="flex flex-col gap-3">
      <div
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 text-center text-xs sm:text-sm transition ${
          isDragging
            ? "border-brand-500 bg-brand-50"
            : "border-slate-300 bg-slate-50"
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
        <p className="font-medium text-slate-800">
          Drag &amp; drop product image
        </p>
        <p className="mt-1 text-slate-500">or click to browse</p>
        <p className="mt-2 text-[11px] text-slate-400">
          JPG, PNG or GIF. Uploaded to cloud storage.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void handleFiles(e.target.files);
        }}
      />

      {uploading && (
        <p className="text-xs text-slate-500">Uploading image…</p>
      )}

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      {images.length > 0 && (
        <div className="mt-1">
          <p className="mb-1 text-xs font-medium text-slate-700">Preview</p>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[previewIndex] ?? images[0]}
              alt="Uploaded preview"
              className="h-40 w-full object-cover"
            />
          </div>
        </div>
      )}
    </div>
  );
}
