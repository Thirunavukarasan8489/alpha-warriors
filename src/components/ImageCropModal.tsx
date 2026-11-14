"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  Check,
  RotateCw,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Crop,
  Loader2,
  Sparkles,
} from "lucide-react";

interface ImageCropModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onCrop: (croppedFile: File) => void;
  onCancel: () => void;
  onSkipCrop?: () => void;
  aspectRatio?: number; // 1 for square (default)
  circularCrop?: boolean;
  outputSize?: number; // default 800px
}

export function ImageCropModal({
  isOpen,
  imageSrc,
  onCrop,
  onCancel,
  onSkipCrop,
  aspectRatio = 1,
  circularCrop = false,
  outputSize = 800,
}: ImageCropModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialPinchDist, setInitialPinchDist] = useState<number | null>(null);
  const [initialPinchZoom, setInitialPinchZoom] = useState<number>(1);
  const [processing, setProcessing] = useState(false);

  // Viewport crop box dimension in CSS pixels (e.g. 280px on phone, 320px on desktop)
  const [cropBoxSize, setCropBoxSize] = useState(280);

  // Responsive crop box sizing
  useEffect(() => {
    const updateSize = () => {
      if (typeof window !== "undefined") {
        const availableWidth = Math.min(window.innerWidth - 48, 340);
        setCropBoxSize(Math.max(240, Math.min(availableWidth, 320)));
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Load image when imageSrc changes
  useEffect(() => {
    if (!imageSrc) {
      setImage(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImage(img);
      setZoom(1);
      setRotation(0);
      setOffset({ x: 0, y: 0 });
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Compute base cover scale
  const getBaseScale = useCallback(
    (boxWidth: number, boxHeight: number, rot: number) => {
      if (!image) return 1;
      const isRotated = rot === 90 || rot === 270;
      const imgW = isRotated ? image.naturalHeight : image.naturalWidth;
      const imgH = isRotated ? image.naturalWidth : image.naturalHeight;
      return Math.max(boxWidth / imgW, boxHeight / imgH);
    },
    [image]
  );

  // Render live preview on canvas
  const drawPreview = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const boxWidth = cropBoxSize;
    const boxHeight = cropBoxSize / aspectRatio;

    canvas.width = boxWidth;
    canvas.height = boxHeight;

    ctx.clearRect(0, 0, boxWidth, boxHeight);
    ctx.save();

    // 1. Center of canvas
    ctx.translate(boxWidth / 2, boxHeight / 2);

    // 2. User pan offset
    ctx.translate(offset.x, offset.y);

    // 3. User rotation
    ctx.rotate((rotation * Math.PI) / 180);

    // 4. Draw image
    const baseScale = getBaseScale(boxWidth, boxHeight, rotation);
    const totalScale = baseScale * zoom;

    ctx.drawImage(
      image,
      -(image.naturalWidth * totalScale) / 2,
      -(image.naturalHeight * totalScale) / 2,
      image.naturalWidth * totalScale,
      image.naturalHeight * totalScale
    );

    ctx.restore();
  }, [image, cropBoxSize, aspectRatio, offset, rotation, zoom, getBaseScale]);

  useEffect(() => {
    drawPreview();
  }, [drawPreview]);

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch pan & pinch zoom handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - offset.x,
        y: e.touches[0].clientY - offset.y,
      });
      setInitialPinchDist(null);
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setInitialPinchDist(dist);
      setInitialPinchZoom(zoom);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      setOffset({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    } else if (e.touches.length === 2 && initialPinchDist) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scaleMultiplier = dist / initialPinchDist;
      const newZoom = Math.min(Math.max(initialPinchZoom * scaleMultiplier, 1), 3.5);
      setZoom(newZoom);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setInitialPinchDist(null);
  };

  // Wheel zoom handler
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY * -0.0015;
    setZoom((prev) => Math.min(Math.max(prev + zoomDelta, 1), 3.5));
  };

  // Rotate 90 deg clockwise
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
    setOffset({ x: 0, y: 0 });
  };

  // Reset adjustments
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  };

  // Export cropped high-res image
  const handleApplyCrop = async () => {
    if (!image) return;
    setProcessing(true);

    try {
      const outputCanvas = document.createElement("canvas");
      const outW = outputSize;
      const outH = outputSize / aspectRatio;

      outputCanvas.width = outW;
      outputCanvas.height = outH;

      const ctx = outputCanvas.getContext("2d");
      if (!ctx) throw new Error("Could not create canvas context");

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      const boxWidth = cropBoxSize;
      const boxHeight = cropBoxSize / aspectRatio;
      const exportFactor = outW / boxWidth;

      // 1. Center of output canvas
      ctx.translate(outW / 2, outH / 2);

      // 2. User pan offset (scaled up to export resolution)
      ctx.translate(offset.x * exportFactor, offset.y * exportFactor);

      // 3. User rotation
      ctx.rotate((rotation * Math.PI) / 180);

      // 4. Render scaled image
      const baseScale = getBaseScale(boxWidth, boxHeight, rotation);
      const totalDrawScale = baseScale * zoom * exportFactor;

      ctx.drawImage(
        image,
        -(image.naturalWidth * totalDrawScale) / 2,
        -(image.naturalHeight * totalDrawScale) / 2,
        image.naturalWidth * totalDrawScale,
        image.naturalHeight * totalDrawScale
      );

      // Convert canvas to Blob & File
      outputCanvas.toBlob(
        (blob) => {
          if (!blob) {
            setProcessing(false);
            return;
          }
          const croppedFile = new File([blob], `cropped_${Date.now()}.jpg`, {
            type: "image/jpeg",
          });
          onCrop(croppedFile);
          setProcessing(false);
        },
        "image/jpeg",
        0.92
      );
    } catch (err) {
      console.error("Crop export error:", err);
      setProcessing(false);
    }
  };

  if (!isOpen || !imageSrc) return null;

  const boxWidth = cropBoxSize;
  const boxHeight = cropBoxSize / aspectRatio;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        ref={containerRef}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden max-h-[95vh] animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-gray-900 leading-tight">
                Crop & Position Photo
              </h3>
              <p className="text-[11px] text-gray-500 font-medium">
                Drag to align face • Pinch or slide to zoom
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={processing}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
            title="Cancel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cropper Viewport */}
        <div className="p-4 sm:p-6 flex flex-col items-center justify-center bg-slate-950/5 select-none overflow-hidden">
          <div
            className={`relative overflow-hidden shadow-xl ring-4 ring-red-600/30 bg-black cursor-grab active:cursor-grabbing touch-none transition-shadow ${
              circularCrop ? "rounded-full" : "rounded-3xl"
            }`}
            style={{ width: boxWidth, height: boxHeight }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
          >
            {/* Live Canvas Preview */}
            <canvas ref={canvasRef} className="block w-full h-full pointer-events-none" />

            {/* Rule of Thirds Grid Overlay */}
            <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-white/20">
              <div className="border-r border-b border-white/20" />
              <div className="border-r border-b border-white/20" />
              <div className="border-b border-white/20" />
              <div className="border-r border-b border-white/20" />
              <div className="border-r border-b border-white/20" />
              <div className="border-b border-white/20" />
              <div className="border-r border-white/20" />
              <div className="border-r border-white/20" />
              <div />
            </div>

            {/* Hint Chip */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-xs text-white/90 text-[10px] font-bold px-2.5 py-0.5 rounded-full pointer-events-none shadow-xs">
              Drag to reposition
            </div>
          </div>
        </div>

        {/* Controls Toolbar */}
        <div className="px-5 py-3.5 bg-white border-t border-gray-100 space-y-3 shrink-0">
          {/* Zoom Slider */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(1, z - 0.2))}
              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-lg transition"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 accent-red-600 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />

            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-lg transition"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <span className="text-[11px] font-mono font-bold text-gray-500 w-10 text-right">
              {zoom.toFixed(1)}x
            </span>
          </div>

          {/* Action Tools: Rotate, Reset */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRotate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition"
              >
                <RotateCw className="w-3.5 h-3.5 text-red-600" />
                <span>Rotate 90°</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition"
              >
                <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
                <span>Reset</span>
              </button>
            </div>

            {onSkipCrop && (
              <button
                type="button"
                onClick={onSkipCrop}
                disabled={processing}
                className="text-xs font-semibold text-gray-500 hover:text-gray-800 transition px-2 py-1"
              >
                Use Full Image
              </button>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onCancel}
            disabled={processing}
            className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 transition rounded-xl"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleApplyCrop}
            disabled={processing}
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-red-600/20 transition cursor-pointer"
          >
            {processing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Crop & Upload</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
