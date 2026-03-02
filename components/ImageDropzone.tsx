"use client";

import { useCallback, useRef, useState } from "react";

type Props = {
  value: string;
  onChange: (dataUrl: string) => void;
};

export function ImageDropzone({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === "string") {
          onChange(result);
        }
      };
      reader.readAsDataURL(file);
    },
    [onChange],
  );

  return (
    <div className="flex flex-col gap-3">
      <div
        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 text-center text-xs sm:text-sm transition ${
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
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {value && (
        <div className="mt-1">
          <p className="text-xs font-medium text-slate-700 mb-1">Preview</p>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Uploaded preview"
              className="h-40 w-full object-cover"
            />
          </div>
        </div>
      )}
    </div>
  );
}

