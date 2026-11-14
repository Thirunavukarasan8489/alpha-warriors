"use client";

import React, { useRef, useState } from "react";
import { Camera, Trash2, User, Building2, Loader2 } from "lucide-react";
import { useToast } from "@/components/Toast";

interface PhotoUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  folder?: "members" | "staff" | "branding" | "products" | "general";
  className?: string;
  label?: string;
}

export function PhotoUploader({
  value,
  onChange,
  folder = "members",
  className = "",
  label,
}: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate image format
    if (!file.type.startsWith("image/")) {
      showToast("Please choose an image file (JPEG, PNG, WEBP)", "error");
      return;
    }

    // Client-side local preview for zero-delay UX
    const localPreviewUrl = URL.createObjectURL(file);
    setPreview(localPreviewUrl);
    setUploading(true);

    try {
      // Direct FormData upload to server endpoint with multi-tenant Cloudinary scoping
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error?.message || "Upload failed");
      }

      const cloudUrl = json.data.url;
      onChange(cloudUrl);
      setPreview(null);
      showToast("Image uploaded to cloud storage!", "success");
    } catch (err: unknown) {
      console.error("Image upload failed:", err);
      showToast((err as Error).message || "Failed to upload image", "error");
      // Revert preview on failure
      setPreview(null);
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPreview(null);
    onChange("");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const displayImage = preview || value;

  return (
    <div className={`flex flex-col sm:flex-row items-start sm:items-center gap-4 ${className}`}>
      {/* Photo Frame / Preview Avatar */}
      <div className="relative w-24 h-24 sm:w-20 sm:h-20 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden shrink-0 shadow-xs group">
        {displayImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayImage}
            alt="Preview"
            className={`w-full h-full object-cover transition-opacity duration-200 ${
              uploading ? "opacity-40" : "opacity-100"
            }`}
          />
        ) : folder === "branding" ? (
          <Building2 className="w-10 h-10 sm:w-8 sm:h-8 text-gray-400" />
        ) : (
          <User className="w-10 h-10 sm:w-8 sm:h-8 text-gray-400" />
        )}

        {/* Uploading Overlay Spinner */}
        {uploading && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-2xs flex flex-col items-center justify-center text-white p-1 text-center">
            <Loader2 className="w-5 h-5 animate-spin text-red-500 mb-1" />
            <span className="text-[10px] font-bold tracking-tight">Uploading</span>
          </div>
        )}
      </div>

      {/* Action Buttons & Status */}
      <div className="flex flex-col gap-2 min-w-0">
        {label && <p className="text-xs font-semibold text-gray-700">{label}</p>}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="user"
          onChange={handleFileChange}
          disabled={uploading}
          className="hidden"
          id={`photo-upload-${folder}`}
        />

        <div className="flex items-center gap-2 flex-wrap">
          <label
            htmlFor={`photo-upload-${folder}`}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl shadow-xs transition select-none touch-manipulation cursor-pointer ${
              uploading
                ? "bg-gray-100 text-gray-400 pointer-events-none"
                : "bg-white text-gray-800 border border-gray-300 hover:bg-gray-50 active:bg-gray-100"
            }`}
          >
            {uploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
                <span>Uploading to Cloud...</span>
              </>
            ) : (
              <>
                <Camera className="w-3.5 h-3.5 text-red-600" />
                <span>{displayImage ? "Change photo" : "Take / Upload photo"}</span>
              </>
            )}
          </label>

          {displayImage && !uploading && (
            <button
              type="button"
              onClick={handleRemove}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition touch-manipulation cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove</span>
            </button>
          )}
        </div>

        <p className="text-[11px] text-gray-400">
          Supports camera capture, JPG, PNG or WEBP (Saved directly to Cloudinary).
        </p>
      </div>
    </div>
  );
}
