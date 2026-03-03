"use client";

import { useCallback, useRef, useState } from "react";

type Props = {
  images: string[];
  previewIndex: number;
  onChange: (nextImages: string[], nextPreviewIndex: number) => void;
};

export function ImageDropzone({ images, previewIndex, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const nextImages: string[] = [...images];

      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result;
          if (typeof result === "string") {
            nextImages.push(result);
            const newPreviewIndex =
              nextImages.length === 1 ? 0 : previewIndex;
            onChange([...nextImages], newPreviewIndex);
          }
        };
        reader.readAsDataURL(file);
      });
    },
    [images, onChange, previewIndex],
  );

  return (
    <div className="flex flex-col gap-3">
      <div
        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 text-center text-xs sm:text-sm transition ${
          isDragging
            ? "border-brand-500 bg-brand-50"
            : "border-zinc-300 bg-zinc-50"
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
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
      >
        <p className="font-medium text-slate-800">
          Drag &amp; drop product image
        </p>
        <p className="mt-1 text-slate-500">or click to browse</p>
        <p className="mt-2 text-[11px] text-slate-400">
          JPG, PNG or GIF. Stored locally in your browser only.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {images.length > 0 && (
        <div className="mt-1 space-y-3">
          <div>
            <p className="text-xs font-medium text-zinc-700 mb-1">
              Preview image
            </p>
            <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={images[previewIndex] ?? images[0]}
                alt="Preview"
                className="h-40 w-full object-cover"
              />
            </div>
          </div>

          {images.length > 1 && (
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-zinc-600">
                Gallery images
              </p>
              <div className="flex flex-wrap gap-2">
                {images.map((src, index) => (
                  <button
                    key={index}
                    type="button"
                    className={`relative overflow-hidden rounded-md border ${
                      index === previewIndex
                        ? "border-brand-500 ring-2 ring-brand-200"
                        : "border-zinc-200 hover:border-brand-300"
                    }`}
                    onClick={() => onChange(images, index)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={`Thumbnail ${index + 1}`}
                      className="h-16 w-16 object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

