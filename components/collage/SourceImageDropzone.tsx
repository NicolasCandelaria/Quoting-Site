"use client";

import { useRef, useState } from "react";

type Props = {
  onFiles: (files: File[]) => void;
  errorMessage?: string;
};

export function SourceImageDropzone({ onFiles, errorMessage }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileList = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).filter((file) =>
      ["image/png", "image/jpeg", "image/webp"].includes(file.type),
    );
    if (files.length === 0) return;
    onFiles(files);
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        className={`flex cursor-pointer flex-col items-center justify-center rounded-panel border border-dashed px-6 py-6 text-center text-body transition-all duration-glass ease-glass ${
          isDragging
            ? "border-accent"
            : "border-slate-300 bg-slate-50 hover:bg-slate-100"
        }`}
        style={isDragging ? { background: "rgba(59,130,246,0.08)" } : undefined}
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
          handleFileList(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
      >
        <p className="font-medium text-text-primary">
          Drag &amp; drop up to 9 images
        </p>
        <p className="mt-1 text-text-secondary text-caption">
          or click to browse (JPG, PNG, WEBP)
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        className="hidden"
        onChange={(e) => handleFileList(e.target.files)}
      />

      {errorMessage && (
        <p className="text-caption text-status-error">{errorMessage}</p>
      )}
    </div>
  );
}

