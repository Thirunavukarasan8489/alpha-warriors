"use client";

import React, { useRef } from "react";
import { Camera, Trash2, User } from "lucide-react";

interface PhotoUploaderProps {
  value?: string;
  onChange: (base64: string) => void;
  className?: string;
}

export function PhotoUploader({ value, onChange, className = "" }: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Resize client side to max 400x400
        const canvas = document.createElement("canvas");
        const maxDim = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const resizedBase64 = canvas.toDataURL("image/jpeg", 0.85);
          onChange(resizedBase64);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    onChange("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div className="relative w-20 h-20 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden shrink-0 group">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="Member photo" className="w-full h-full object-cover" />
        ) : (
          <User className="w-8 h-8 text-gray-400" />
        )}
      </div>

      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="user"
          onChange={handleFileChange}
          className="hidden"
          id="photo-upload-input"
        />

        <label
          htmlFor="photo-upload-input"
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 cursor-pointer shadow-xs transition w-fit"
        >
          <Camera className="w-3.5 h-3.5 text-gray-500" />
          {value ? "Change photo" : "Take / Upload photo"}
        </label>

        {value && (
          <button
            type="button"
            onClick={handleRemove}
            className="inline-flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-medium"
          >
            <Trash2 className="w-3 h-3" />
            Remove photo
          </button>
        )}
      </div>
    </div>
  );
}

