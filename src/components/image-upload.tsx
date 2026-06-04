"use client";

import { useState } from "react";

// Lets the admin EITHER paste an image URL OR upload a file. Uploads are resized
// client-side and stored as a data URL in the branding setting (no extra storage
// service needed). Renders a hidden input so the parent <form> submits the value.
export function ImageUpload({
  name,
  label,
  spec,
  current,
  maxDim = 512,
  format = "image/png",
}: {
  name: string;
  label: string;
  spec: string;
  current: string | null;
  maxDim?: number;
  format?: "image/png" | "image/jpeg";
}) {
  const [value, setValue] = useState(current ?? "");
  const [busy, setBusy] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      setValue(
        file.type === "image/svg+xml"
          ? await readAsDataUrl(file)
          : await resizeToDataUrl(file, maxDim, format),
      );
    } finally {
      setBusy(false);
    }
  }

  const isUpload = value.startsWith("data:");

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-black/20 p-3 ring-1 ring-white/5">
      <div className="text-sm font-medium text-slate-300">{label}</div>
      <div className="text-xs text-slate-500">{spec}</div>
      {value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="preview" className="max-h-20 w-auto self-start rounded-md bg-white/5 object-contain p-1 ring-1 ring-white/10" />
      )}
      <input
        type="url"
        placeholder="Paste an image URL…"
        value={isUpload ? "" : value}
        onChange={(e) => setValue(e.target.value)}
        className="rounded-lg bg-white/5 px-3 py-2 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-2"
      />
      <label className="text-xs text-slate-400">
        …or upload{busy ? " — processing…" : ""}
        <input
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          onChange={onFile}
          className="mt-1 block w-full text-xs text-slate-400 file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-white hover:file:bg-white/20"
        />
      </label>
      {isUpload && (
        <button type="button" onClick={() => setValue("")} className="self-start text-xs text-red-400 hover:underline">
          Clear uploaded image
        </button>
      )}
      <input type="hidden" name={name} value={value} />
    </div>
  );
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function resizeToDataUrl(file: File, maxDim: number, format: string): Promise<string> {
  const dataUrl = await readAsDataUrl(file);
  const img = document.createElement("img");
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = dataUrl;
  });
  let { width, height } = img;
  if (Math.max(width, height) > maxDim) {
    const scale = maxDim / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL(format, 0.85);
}
