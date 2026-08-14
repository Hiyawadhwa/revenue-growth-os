"use client";

import { useRef, useState } from "react";
import { UploadCloud, FileSpreadsheet } from "lucide-react";

export default function FileDrop({
  label,
  hint,
  accept = ".xlsx,.xls,.csv",
  onFile,
  fileName,
}: {
  label: string;
  hint: string;
  accept?: string;
  onFile: (file: File) => void;
  fileName?: string | null;
}) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
      className={`group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl2 border border-dashed px-6 py-8 text-center transition-colors ${
        dragOver ? "border-accent bg-accent/5" : "border-base-600 hover:border-accent-dim hover:bg-base-850"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
      {fileName ? (
        <>
          <FileSpreadsheet className="h-6 w-6 text-signal-up" />
          <p className="text-sm font-medium text-ink-hi">{fileName}</p>
          <p className="text-xs text-ink-lo">Click or drop to replace</p>
        </>
      ) : (
        <>
          <UploadCloud className="h-6 w-6 text-ink-mid transition-colors group-hover:text-accent-soft" />
          <p className="text-sm font-medium text-ink-hi">{label}</p>
          <p className="text-xs text-ink-lo">{hint}</p>
        </>
      )}
    </div>
  );
}
