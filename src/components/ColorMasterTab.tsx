/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from "react";
import {
  Sliders,
  Sun,
  Moon,
  Zap,
  Palette,
  Thermometer,
  Sparkles,
  RefreshCw,
  Edit3,
  Undo2,
  Trash2,
  Crop,
  RotateCw,
  Download,
  AlertCircle,
  Eye,
  CheckCircle,
  Wand2
} from "lucide-react";
import { applyImageFilters } from "../utils/imageProcess";

interface ColorMasterTabProps {
  image: HTMLImageElement;
}

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
  color: string;
  width: number;
}

export default function ColorMasterTab({ image }: ColorMasterTabProps) {
  // Filters state
  const [brightness, setBrightness] = useState(0);     // -100 to 100
  const [shadows, setShadows] = useState(0);           // -50 to 50
  const [highlights, setHighlights] = useState(0);         // -50 to 50
  const [saturation, setSaturation] = useState(1.0);     // 0.0 to 3.0
  const [warmth, setWarmth] = useState(0);             // -50 to 50
  const [tint, setTint] = useState(0);                 // -50 to 50
  const [contrast, setContrast] = useState(1.0);         // 0.5 to 2.0

  // Drawing state
  const [isBrushMode, setIsBrushMode] = useState(false);
  const [brushWidth, setBrushWidth] = useState(5);
  const [brushColor, setBrushColor] = useState("#FF0000");
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  // Rotation and Cropping state
  const [rotationAngle, setRotationAngle] = useState<number>(0); // 360-degree continuous rotation (-180 to 180)
  const [cropMethod, setCropMethod] = useState<"preset" | "manual">("preset");
  const [cropRatio, setCropRatio] = useState<"none" | "1:1" | "4:3" | "16:9">("none");
  
  // Custom margin crop percentages (0 to 45% crop from each edge)
  const [cropLeft, setCropLeft] = useState<number>(0);
  const [cropRight, setCropRight] = useState<number>(0);
  const [cropTop, setCropTop] = useState<number>(0);
  const [cropBottom, setCropBottom] = useState<number>(0);

  // Comparative & Premium Modes
  const [showOriginal, setShowOriginal] = useState(false);
  const [isAutoEnhanced, setIsAutoEnhanced] = useState(false);

  // Canvas references
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Reset helpers for individual controls
  const resetBrightness = () => setBrightness(0);
  const resetShadows = () => setShadows(0);
  const resetHighlights = () => setHighlights(0);
  const resetSaturation = () => setSaturation(1.0);
  const resetWarmth = () => setWarmth(0);
  const resetTint = () => setTint(0);
  const resetContrast = () => setContrast(1.0);

  // Auto Enhance (AI Magic)
  const applyAutoEnhance = () => {
    if (isAutoEnhanced) {
      // Toggle off to normal
      setBrightness(0);
      setContrast(1.0);
      setSaturation(1.0);
      setHighlights(0);
      setShadows(0);
      setIsAutoEnhanced(false);
    } else {
      // Elegant pop enhancement parameters
      setBrightness(12);
      setContrast(1.25);
      setSaturation(1.2);
      setHighlights(10);
      setShadows(-5);
      setIsAutoEnhanced(true);
    }
  };

  // Preset Filters
  const applyPreset = (type: "vintage" | "cool" | "noir" | "warm_sun") => {
    setIsAutoEnhanced(false);
    if (type === "vintage") {
      setBrightness(8);
      setContrast(1.1);
      setSaturation(0.7);
      setWarmth(18);
      setTint(5);
      setHighlights(-5);
      setShadows(8);
    } else if (type === "cool") {
      setBrightness(2);
      setContrast(1.05);
      setSaturation(1.15);
      setWarmth(-15);
      setTint(-2);
      setHighlights(5);
      setShadows(-5);
    } else if (type === "noir") {
      setBrightness(-5);
      setContrast(1.35);
      setSaturation(0.0);
      setWarmth(0);
      setTint(0);
      setHighlights(15);
      setShadows(-5);
    } else if (type === "warm_sun") {
      setBrightness(10);
      setContrast(1.15);
      setSaturation(1.25);
      setWarmth(20);
      setTint(2);
      setHighlights(10);
      setShadows(5);
    }
  };

  // Reset all adjustments
  const resetAll = () => {
    setBrightness(0);
    setShadows(0);
    setHighlights(0);
    setSaturation(1.0);
    setWarmth(0);
    setTint(0);
    setContrast(1.0);
    setRotationAngle(0);
    setCropRatio("none");
    setCropLeft(0);
    setCropRight(0);
    setCropTop(0);
    setCropBottom(0);
    setCropMethod("preset");
    setStrokes([]);
    setIsAutoEnhanced(false);
  };

  // Perform full drawing mapping and filters
  const renderCombined = () => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    // 1. Set up offscreen canvas representing cropped & rotated portion of original image
    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement("canvas");
    }
    const offCtx = offscreenCanvasRef.current.getContext("2d");
    if (!offCtx) return;

    // Determine original image size
    const imgW = image.naturalWidth || image.width;
    const imgH = image.naturalHeight || image.height;

    // Apply crop boundary logic
    let sx = 0;
    let sy = 0;
    let sw = imgW;
    let sh = imgH;

    if (cropMethod === "preset" && cropRatio !== "none") {
      let targetRatio = 1;
      if (cropRatio === "1:1") targetRatio = 1;
      else if (cropRatio === "4:3") targetRatio = 4 / 3;
      else if (cropRatio === "16:9") targetRatio = 16 / 9;

      const currentRatio = imgW / imgH;
      if (currentRatio > targetRatio) {
        // Crop width from center
        sw = imgH * targetRatio;
        sx = (imgW - sw) / 2;
      } else {
        // Crop height from center
        sh = imgW / targetRatio;
        sy = (imgH - sh) / 2;
      }
    } else if (cropMethod === "manual") {
      // Calculate custom percentage crop
      const leftPx = (cropLeft / 100) * imgW;
      const rightPx = (cropRight / 100) * imgW;
      const topPx = (cropTop / 100) * imgH;
      const bottomPx = (cropBottom / 100) * imgH;

      sx = leftPx;
      sy = topPx;
      sw = Math.max(10, imgW - leftPx - rightPx);
      sh = Math.max(10, imgH - topPx - bottomPx);
    }

    // Determine canvas target dimensions based on rotational trigonometry
    const radians = (rotationAngle * Math.PI) / 180;
    const cosAngle = Math.abs(Math.cos(radians));
    const sinAngle = Math.abs(Math.sin(radians));

    // Bounding Box formula to prevent any rotational cropping/clipping
    const targetW = sw * cosAngle + sh * sinAngle;
    const targetH = sw * sinAngle + sh * cosAngle;

    // Max size constraint for high editing speed (preserve resolution relative up to 1200px)
    const MAX_DIM = 1200;
    let drawW = targetW;
    let drawH = targetH;
    if (targetW > MAX_DIM || targetH > MAX_DIM) {
      const scale = MAX_DIM / Math.max(targetW, targetH);
      drawW = Math.round(targetW * scale);
      drawH = Math.round(targetH * scale);
    }

    // Configure offscreen canvas size
    offscreenCanvasRef.current.width = drawW;
    offscreenCanvasRef.current.height = drawH;

    // Draw rotated & cropped image source onto offscreen base
    offCtx.clearRect(0, 0, drawW, drawH);
    offCtx.save();
    offCtx.translate(drawW / 2, drawH / 2);
    offCtx.rotate(radians);

    // Standard scale drawer factor to match scaled dimensions
    const scaleFactor = drawW / targetW;
    const sourceDrawW = sw * scaleFactor;
    const sourceDrawH = sh * scaleFactor;

    offCtx.drawImage(
      image,
      sx, sy, sw, sh, // Crop coordinates source
      -sourceDrawW / 2, -sourceDrawH / 2, sourceDrawW, sourceDrawH // Destination centered
    );
    offCtx.restore();

    // 2. Extract pixels to process filters
    const baseImgData = offCtx.getImageData(0, 0, drawW, drawH);
    
    // Resize visible rendering canvas
    canvas.width = drawW;
    canvas.height = drawH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const outputImgData = ctx.createImageData(drawW, drawH);

    // If hold-to-compare is turned on, bypass filters and draw the clean rotated/cropped image
    if (showOriginal) {
      ctx.putImageData(baseImgData, 0, 0);
    } else {
      // Apply high-performance pixel filters
      applyImageFilters(
        baseImgData,
        outputImgData,
        brightness,
        shadows,
        highlights,
        saturation,
        warmth,
        tint,
        contrast
      );

      // Apply pixel output to screen canvas
      ctx.putImageData(outputImgData, 0, 0);

      // 3. Render vector brush doodles on top of filter output
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Draw historical strokes
      strokes.forEach((stroke) => {
        if (stroke.points.length < 1) return;
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      });

      ctx.restore();
    }
  };

  // Trigger repaint loop whenever adjusting sliders, rotation, aspect crop, strokes, or compare modes
  useEffect(() => {
    renderCombined();
  }, [
    image,
    brightness,
    shadows,
    highlights,
    saturation,
    warmth,
    tint,
    contrast,
    rotationAngle,
    cropMethod,
    cropRatio,
    cropLeft,
    cropRight,
    cropTop,
    cropBottom,
    strokes,
    showOriginal
  ]);

  // Coordinate mapper from event to Canvas space
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isBrushMode || showOriginal) return;
    const coords = getCanvasCoords(e);
    if (!coords) return;

    setIsDrawing(true);
    setStrokes((prev) => [
      ...prev,
      {
        points: [coords],
        color: brushColor,
        width: brushWidth,
      },
    ]);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isBrushMode || !isDrawing || showOriginal) return;
    const coords = getCanvasCoords(e);
    if (!coords) return;

    setStrokes((prev) => {
      if (prev.length === 0) return prev;
      const copy = [...prev];
      const activeIdx = copy.length - 1;
      copy[activeIdx] = {
        ...copy[activeIdx],
        points: [...copy[activeIdx].points, coords],
      };
      return copy;
    });
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const undoLastStroke = () => {
    setStrokes((prev) => prev.slice(0, -1));
  };

  const clearStrokes = () => {
    setStrokes([]);
  };

  // Handle saving modified image download file
  const downloadMasterpiece = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `GooglePhotos_Edit_${Date.now()}.png`;
    link.href = url;
    link.click();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" id="color-master-view">
      {/* Dynamic Editing Area on LHS (3/4 Columns) */}
      <div className="lg:col-span-3 space-y-4">
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between h-auto gap-4">
          <div className="flex flex-wrap items-center justify-between border-b border-gray-100 pb-3 gap-2">
            <div>
              <h2 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                <Palette className="h-4.5 w-4.5 text-blue-600" />
                Google 相簿智慧色彩調校工作區
              </h2>
              <p className="text-xs text-gray-400 font-sans">
                支援 360° 任意旋轉微調、選取範圍裁剪、一鍵 AI 智慧優化與畫筆互動。
              </p>
            </div>
            
            {/* Quick Presets Menu */}
            <div className="flex items-center space-x-1">
              <span className="text-[10px] text-gray-400 font-bold uppercase mr-1">濾鏡預設:</span>
              <button
                onClick={() => applyPreset("warm_sun")}
                className="px-2 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-250 text-[10px] font-bold rounded-lg transition-colors"
              >
                ☀️ 暖陽
              </button>
              <button
                onClick={() => applyPreset("vintage")}
                className="px-2 py-1 bg-yellow-50 text-yellow-800 hover:bg-yellow-105 border border-yellow-200 text-[10px] font-bold rounded-lg transition-colors"
              >
                🎞️ 復古
              </button>
              <button
                onClick={() => applyPreset("cool")}
                className="px-2 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 text-[10px] font-bold rounded-lg transition-colors"
              >
                ❄️ 冷調
              </button>
              <button
                onClick={() => applyPreset("noir")}
                className="px-2 py-1 bg-gray-50 text-gray-800 hover:bg-gray-100 border border-gray-200 text-[10px] font-bold rounded-lg transition-colors"
              >
                🕶️ 單色
              </button>
            </div>
          </div>

          {/* Interactive Workspace Screen */}
          <div className="relative bg-slate-900 rounded-2xl flex flex-col items-center justify-center p-6 border border-gray-200 min-h-[380px] md:min-h-[480px] overflow-hidden group shadow-inner">
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className={`max-w-full max-h-[480px] object-contain rounded-lg shadow-xl cursor-crosshair transition-all duration-200 ${
                isBrushMode ? "ring-2 ring-rose-400" : ""
              }`}
            />

            {/* Brush & status indicators */}
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              {showOriginal && (
                <span className="bg-yellow-500 text-slate-950 font-bold text-[10px] px-2.5 py-1 rounded-lg border border-yellow-400 shadow-md">
                  💡 正在對比原始圖
                </span>
              )}
              {isAutoEnhanced && (
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-[10px] px-2.5 py-1 rounded-lg shadow-md flex items-center gap-1">
                  <Sparkles className="h-3 w-3 animate-pulse" />
                  AI 效果套用中
                </span>
              )}
            </div>

            {/* Interactive Compare hold button in bottom right corner */}
            <div className="absolute bottom-4 right-4 flex items-center space-x-2">
              <button
                onMouseDown={() => setShowOriginal(true)}
                onMouseUp={() => setShowOriginal(false)}
                onMouseLeave={() => setShowOriginal(false)}
                onTouchStart={() => setShowOriginal(true)}
                onTouchEnd={() => setShowOriginal(false)}
                className="bg-black/85 text-white border border-white/20 hover:bg-black px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-lg active:scale-95 cursor-pointer backdrop-blur-sm select-none"
                title="按住即可查看編輯前原圖，放開恢復"
              >
                <Eye className="h-4 w-4 text-blue-400" />
                <span>按住比對原相片</span>
              </button>
            </div>

            {/* Hint overlay */}
            {!isBrushMode && !showOriginal && (
              <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-auto md:max-w-md bg-black/80 text-white/90 p-2.5 text-xs text-center rounded-xl backdrop-blur-sm pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-sky-400" />
                <span>長按右下角「比對原相片」可以立刻切換前後修圖差異</span>
              </div>
            )}
          </div>

          {/* Quick Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-gray-50/80 p-4 rounded-2xl border border-gray-100">
            {/* Crop method selection tab */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2 border-r border-gray-200 pr-4">
                <span className="text-xs text-gray-500 font-bold flex items-center gap-1">
                  <Crop className="h-3.5 w-3.5 text-blue-500" />
                  裁剪模式:
                </span>
                <div className="flex items-center space-x-1 bg-white p-0.5 rounded-lg border border-gray-100 shadow-sm">
                  <button
                    onClick={() => setCropMethod("preset")}
                    className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
                      cropMethod === "preset"
                        ? "bg-slate-900 text-white"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    預設比例
                  </button>
                  <button
                    onClick={() => setCropMethod("manual")}
                    className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
                      cropMethod === "manual"
                        ? "bg-slate-900 text-white"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    自訂邊界微調
                  </button>
                </div>
              </div>

              {/* Depend on Crop method */}
              {cropMethod === "preset" ? (
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500 font-semibold">固定比例 (Ratio):</span>
                  <div className="flex items-center space-x-1 bg-white p-0.5 rounded-lg border border-gray-100 shadow-sm">
                    {(["none", "1:1", "4:3", "16:9"] as const).map((ratio) => (
                      <button
                        key={ratio}
                        onClick={() => setCropRatio(ratio)}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all uppercase ${
                          cropRatio === ratio
                            ? "bg-blue-600 text-white"
                            : "text-gray-650 hover:bg-gray-50"
                        }`}
                      >
                        {ratio === "none" ? "原圖樣式" : ratio}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-2 bg-white/80 px-3 py-1.5 rounded-xl border border-gray-200/50 text-[11px] font-medium text-gray-600">
                  <span>✨ 請到右側工具箱調整左、右、上、下裁剪拉條，即可輕鬆進行自由構圖！</span>
                </div>
              )}
            </div>

            {/* Smart Optimize Button & Export */}
            <div className="flex items-center space-x-2">
              <button
                onClick={applyAutoEnhance}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-sm active:scale-95 border ${
                  isAutoEnhanced
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                }`}
              >
                <Wand2 className={`h-3.5 w-3.5 ${isAutoEnhanced ? "animate-spin" : ""}`} />
                <span>{isAutoEnhanced ? "🔄 恢復調色" : "🧙 一鍵 AI 智慧優化"}</span>
              </button>

              <button
                onClick={downloadMasterpiece}
                className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md active:scale-95"
              >
                <Download className="h-3.5 w-3.5" />
                <span>📥 儲存 / 下載專題照片</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Sidebar Configuration Columns (RHS) */}
      <div className="lg:col-span-1 space-y-4">
        {/* Sliders Container Column */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-5 max-h-[820px] overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center space-x-2">
              <Sliders className="h-4.5 w-4.5 text-blue-600" />
              <span className="text-sm font-bold text-gray-800">相簿色彩與幾何大師</span>
            </div>
            <button
              onClick={resetAll}
              className="text-gray-400 hover:text-red-500 p-1 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1"
              title="全部重設"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold">全部重設</span>
            </button>
          </div>

          {/* New 360-degree Smooth rotation slider */}
          <div className="space-y-1.5 bg-sky-50/40 p-3 rounded-xl border border-sky-100/50">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <RotateCw className="h-3.5 w-3.5 text-sky-500 animate-spin" style={{ animationDuration: '6s' }} />
                📐 360° 旋轉微調 (Rotate)
              </span>
              <div className="flex items-center space-x-1.5">
                <span className="font-mono bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded text-[10px] font-extrabold">
                  {rotationAngle}°
                </span>
                <button
                  onClick={() => setRotationAngle(0)}
                  className="text-gray-400 hover:text-sky-600"
                  title="重設為 0 度"
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
              </div>
            </div>
            <input
              type="range"
              min="-180"
              max="180"
              value={rotationAngle}
              onChange={(e) => setRotationAngle(parseInt(e.target.value))}
              className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
            <div className="flex justify-between text-[10px] text-gray-400 font-mono">
              <span>-180°</span>
              <span>0° (正中)</span>
              <span>180°</span>
            </div>
          </div>

          {/* New Manual Clipping Margin Crop Sliders visible if CropMethod = manual */}
          {cropMethod === "manual" && (
            <div className="space-y-3.5 bg-indigo-50/40 p-3 rounded-xl border border-indigo-100/50">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Crop className="h-3.5 w-3.5 text-indigo-500" />
                🪓 幾何裁剪範圍調校
              </span>

              {/* Left Cut */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-gray-500">左邊界裁剪 (Left)</span>
                  <span className="font-mono text-gray-700 font-bold">{cropLeft}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="45"
                  value={cropLeft}
                  onChange={(e) => setCropLeft(parseInt(e.target.value))}
                  className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              {/* Right Cut */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-gray-500">右邊界裁剪 (Right)</span>
                  <span className="font-mono text-gray-700 font-bold">{cropRight}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="45"
                  value={cropRight}
                  onChange={(e) => setCropRight(parseInt(e.target.value))}
                  className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              {/* Top Cut */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-gray-500">上邊界裁剪 (Top)</span>
                  <span className="font-mono text-gray-700 font-bold">{cropTop}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="45"
                  value={cropTop}
                  onChange={(e) => setCropTop(parseInt(e.target.value))}
                  className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              {/* Bottom Cut */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-gray-500">下邊界裁剪 (Bottom)</span>
                  <span className="font-mono text-gray-700 font-bold">{cropBottom}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="45"
                  value={cropBottom}
                  onChange={(e) => setCropBottom(parseInt(e.target.value))}
                  className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              <div className="flex items-center gap-1.5 pt-1 border-t border-indigo-100/50">
                <button
                  type="button"
                  onClick={() => {
                    setCropLeft(0);
                    setCropRight(0);
                    setCropTop(0);
                    setCropBottom(0);
                  }}
                  className="w-full bg-white text-gray-500 border border-gray-200 hover:text-indigo-600 hover:bg-indigo-50/50 py-1 rounded-lg text-[10px] font-bold transition-all"
                >
                  重設裁剪範圍
                </button>
              </div>
            </div>
          )}

          {/* 1. Brightness Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-gray-700 flex items-center gap-1.5">
                <Sun className="h-3.5 w-3.5 text-amber-500" />
                1. 亮度 (Brightness)
              </span>
              <div className="flex items-center space-x-1.5">
                <span className="font-mono bg-gray-50 px-1.5 py-0.5 rounded text-[10px] text-gray-650">
                  {brightness > 0 ? `+${brightness}` : brightness}
                </span>
                <button
                  onClick={resetBrightness}
                  className="text-gray-400 hover:text-blue-500"
                  title="重設亮度"
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
              </div>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={brightness}
              onChange={(e) => setBrightness(parseInt(e.target.value))}
              className="w-full h-1 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-650"
            />
          </div>

          {/* 2. Shadows Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-gray-700 flex items-center gap-1.5">
                <Moon className="h-3.5 w-3.5 text-indigo-400" />
                2. 黑點 / 陰影 (Shadows)
              </span>
              <div className="flex items-center space-x-1.5">
                <span className="font-mono bg-gray-50 px-1.5 py-0.5 rounded text-[10px] text-gray-650">
                  {shadows > 0 ? `+${shadows}` : shadows}
                </span>
                <button
                  onClick={resetShadows}
                  className="text-gray-400 hover:text-blue-500"
                  title="重設黑點"
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
              </div>
            </div>
            <input
              type="range"
              min="-50"
              max="50"
              value={shadows}
              onChange={(e) => setShadows(parseInt(e.target.value))}
              className="w-full h-1 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-650"
            />
          </div>

          {/* 3. Highlights Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-gray-700 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-yellow-500" />
                3. 白點 / 加亮 (Highlights)
              </span>
              <div className="flex items-center space-x-1.5">
                <span className="font-mono bg-gray-50 px-1.5 py-0.5 rounded text-[10px] text-gray-650">
                  {highlights > 0 ? `+${highlights}` : highlights}
                </span>
                <button
                  onClick={resetHighlights}
                  className="text-gray-400 hover:text-blue-500"
                  title="重設白點"
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
              </div>
            </div>
            <input
              type="range"
              min="-50"
              max="50"
              value={highlights}
              onChange={(e) => setHighlights(parseInt(e.target.value))}
              className="w-full h-1 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-650"
            />
          </div>

          {/* 4. Saturation Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-gray-700 flex items-center gap-1.5">
                <Palette className="h-3.5 w-3.5 text-purple-400" />
                4. 飽和度 (Saturation)
              </span>
              <div className="flex items-center space-x-1.5">
                <span className="font-mono bg-gray-50 px-1.5 py-0.5 rounded text-[10px] text-gray-650">
                  {saturation.toFixed(1)}x
                </span>
                <button
                  onClick={resetSaturation}
                  className="text-gray-400 hover:text-blue-500"
                  title="重設飽和度"
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
              </div>
            </div>
            <input
              type="range"
              min="0.0"
              max="3.0"
              step="0.1"
              value={saturation}
              onChange={(e) => setSaturation(parseFloat(e.target.value))}
              className="w-full h-1 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-650"
            />
          </div>

          {/* 5. Warmth Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-gray-700 flex items-center gap-1.5">
                <Thermometer className="h-3.5 w-3.5 text-orange-400" />
                5. 色溫 (Warmth)
              </span>
              <div className="flex items-center space-x-1.5">
                <span className="font-mono bg-gray-50 px-1.5 py-0.5 rounded text-[10px] text-gray-650">
                  {warmth > 0 ? `+${warmth}` : warmth}
                </span>
                <button
                  onClick={resetWarmth}
                  className="text-gray-400 hover:text-blue-500"
                  title="重設色溫"
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
              </div>
            </div>
            <input
              type="range"
              min="-50"
              max="50"
              value={warmth}
              onChange={(e) => setWarmth(parseInt(e.target.value))}
              className="w-full h-1 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-650"
            />
          </div>

          {/* 6. Tint Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-gray-700 flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-emerald-400" />
                6. 色調 (Tint)
              </span>
              <div className="flex items-center space-x-1.5">
                <span className="font-mono bg-gray-50 px-1.5 py-0.5 rounded text-[10px] text-gray-650">
                  {tint > 0 ? `+${tint}` : tint}
                </span>
                <button
                  onClick={resetTint}
                  className="text-gray-400 hover:text-blue-500"
                  title="重設色調"
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
              </div>
            </div>
            <input
              type="range"
              min="-50"
              max="50"
              value={tint}
              onChange={(e) => setTint(parseInt(e.target.value))}
              className="w-full h-1 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-650"
            />
          </div>

          {/* 7. Contrast / Vividness Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-gray-700 flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-teal-400" />
                7. 鮮明度 (Contrast)
              </span>
              <div className="flex items-center space-x-1.5">
                <span className="font-mono bg-gray-50 px-1.5 py-0.5 rounded text-[10px] text-gray-650">
                  {contrast.toFixed(1)}x
                </span>
                <button
                  onClick={resetContrast}
                  className="text-gray-400 hover:text-blue-500"
                  title="重設鮮明度"
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
              </div>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={contrast}
              onChange={(e) => setContrast(parseFloat(e.target.value))}
              className="w-full h-1 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-650"
            />
          </div>

          {/* 8. Modern Doodle Painting Brush tools */}
          <div className="pt-4 border-t border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-800 flex items-center gap-1">
                <Edit3 className="h-3.5 w-3.5 text-rose-500" />
                8. 畫筆塗鴉工具
              </label>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setIsBrushMode(!isBrushMode)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 ${
                    isBrushMode
                      ? "bg-rose-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {isBrushMode ? "關閉畫筆" : "開啟畫筆"}
                </button>
              </div>
            </div>

            {isBrushMode && (
              <div className="bg-rose-50/40 p-3 rounded-xl border border-rose-100/50 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">畫筆顏色 (Palette)：</span>
                  <input
                    type="color"
                    value={brushColor}
                    onChange={(e) => setBrushColor(e.target.value)}
                    className="w-8 h-6 bg-transparent border-0 rounded cursor-pointer self-center"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>畫筆粗細：</span>
                    <strong className="font-mono text-gray-800">{brushWidth}px</strong>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={brushWidth}
                    onChange={(e) => setBrushWidth(parseInt(e.target.value))}
                    className="w-full accent-rose-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-rose-100/30">
                  <button
                    onClick={undoLastStroke}
                    disabled={strokes.length === 0}
                    className="flex-1 bg-white hover:bg-rose-50 border border-gray-200 text-gray-600 hover:text-rose-600 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 disabled:opacity-50 disabled:pointer-events-none transition-all duration-150"
                  >
                    <Undo2 className="h-3 w-3" />
                     復原上一筆
                  </button>
                  <button
                    onClick={clearStrokes}
                    disabled={strokes.length === 0}
                    className="flex-1 bg-white hover:bg-rose-50 border border-gray-200 text-gray-600 hover:text-red-600 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 disabled:opacity-50 disabled:pointer-events-none transition-all duration-150"
                  >
                    <Trash2 className="h-3 w-3" />
                     清除全部
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
