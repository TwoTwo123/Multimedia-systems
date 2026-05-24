/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useMemo } from "react";
import { Sliders, RotateCw, HelpCircle, Activity, Zap, Play } from "lucide-react";
import { fft2D, fftShift, getMagnitudeSpectrum } from "../utils/fft";

interface FrequencyDomainTabProps {
  image: HTMLImageElement;
}

export default function FrequencyDomainTab({ image }: FrequencyDomainTabProps) {
  const [filterType, setFilterType] = useState<"low" | "high">("low");
  const [resolution, setResolution] = useState<128 | 256>(128); // 128 is instant; 256 is high-detail
  const [radius, setRadius] = useState<number>(30);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calcTime, setCalcTime] = useState<number>(0);

  // References to the 4 canvases shown to users
  const canvasOriginalRef = useRef<HTMLCanvasElement>(null);
  const canvasSpectrumOriginalRef = useRef<HTMLCanvasElement>(null);
  const canvasSpectrumFilteredRef = useRef<HTMLCanvasElement>(null);
  const canvasReconstructedRef = useRef<HTMLCanvasElement>(null);

  // Auto-adjust default radius based on chosen resolution
  useEffect(() => {
    setRadius(resolution === 128 ? 20 : 40);
  }, [resolution]);

  // Main DFT processing loop
  useEffect(() => {
    if (!image) return;

    let active = true;
    setIsCalculating(true);
    const startTime = performance.now();

    // Run in a small macrotask to prevent UI thread lock
    const timeoutId = setTimeout(() => {
      const N = resolution;
      
      // 1. Create offscreen canvas to resize and extract grayscale image
      const offscreen = document.createElement("canvas");
      offscreen.width = N;
      offscreen.height = N;
      const ctx = offscreen.getContext("2d");
      if (!ctx) return;

      // Draw original image resized to NxN square
      ctx.drawImage(image, 0, 0, N, N);
      const imgData = ctx.getImageData(0, 0, N, N);
      const pixels = imgData.data;

      // Extract grayscale values into real array, imag is 0
      const re = new Float32Array(N * N);
      const im = new Float32Array(N * N);

      for (let i = 0; i < N * N; i++) {
        const r = pixels[i * 4];
        const g = pixels[i * 4 + 1];
        const b = pixels[i * 4 + 2];
        // Standard Rec 601 grayscale formula
        re[i] = 0.299 * r + 0.587 * g + 0.114 * b;
        im[i] = 0.0;
      }

      // Draw the Grayscale Image onto Canvas #1 (Original Grayscale)
      const originalCanvas = canvasOriginalRef.current;
      if (originalCanvas) {
        originalCanvas.width = N;
        originalCanvas.height = N;
        const oCtx = originalCanvas.getContext("2d");
        if (oCtx) {
          const oData = oCtx.createImageData(N, N);
          for (let i = 0; i < N * N; i++) {
            const val = Math.round(re[i]);
            oData.data[i * 4] = val;
            oData.data[i * 4 + 1] = val;
            oData.data[i * 4 + 2] = val;
            oData.data[i * 4 + 3] = 255;
          }
          oCtx.putImageData(oData, 0, 0);
        }
      }

      // 2. Perform forward 2D Discrete Fourier Transform (FFT)
      fft2D(re, im, N, false);

      // 3. Shift DC component to center for standard visualization
      const shifted = fftShift(re, im, N);

      // 4. Generate Spectrum Magnitude (Original)
      const origSpectrumMag = getMagnitudeSpectrum(shifted.re, shifted.im, N);
      
      // Render original spectrum onto Canvas #2
      // Logarithmic normalization for display [0-255]
      let maxOrigMag = 0.0001;
      for (let i = 0; i < N * N; i++) {
        if (origSpectrumMag[i] > maxOrigMag) maxOrigMag = origSpectrumMag[i];
      }

      const origSpectrumCanvas = canvasSpectrumOriginalRef.current;
      if (origSpectrumCanvas) {
        origSpectrumCanvas.width = N;
        origSpectrumCanvas.height = N;
        const sCtx = origSpectrumCanvas.getContext("2d");
        if (sCtx) {
          const sData = sCtx.createImageData(N, N);
          for (let i = 0; i < N * N; i++) {
            const val = Math.min(255, Math.max(0, Math.round((origSpectrumMag[i] / maxOrigMag) * 255)));
            sData.data[i * 4] = val;
            sData.data[i * 4 + 1] = val;
            sData.data[i * 4 + 2] = val;
            sData.data[i * 4 + 3] = 255;
          }
          sCtx.putImageData(sData, 0, 0);
        }
      }

      // 5. Apply circular mask on the centered spectrum
      const cx = N / 2;
      const cy = N / 2;
      const rSq = radius * radius;

      // We modify centered coefficients
      const filteredRe = new Float32Array(shifted.re);
      const filteredIm = new Float32Array(shifted.im);

      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const idx = y * N + x;
          const distSq = (x - cx) * (x - cx) + (y - cy) * (y - cy);

          if (filterType === "low") {
            // Low-pass: keep inside cutoff, filter out high frequencies
            if (distSq > rSq) {
              filteredRe[idx] = 0;
              filteredIm[idx] = 0;
            }
          } else {
            // High-pass: filter out low frequencies (inside cutoff), keep high
            if (distSq <= rSq) {
              filteredRe[idx] = 0;
              filteredIm[idx] = 0;
            }
          }
        }
      }

      // 6. Draw Filtered Spectrum onto Canvas #3
      const filtSpectrumMag = getMagnitudeSpectrum(filteredRe, filteredIm, N);
      const filtSpectrumCanvas = canvasSpectrumFilteredRef.current;
      if (filtSpectrumCanvas) {
        filtSpectrumCanvas.width = N;
        filtSpectrumCanvas.height = N;
        const fsCtx = filtSpectrumCanvas.getContext("2d");
        if (fsCtx) {
          const fsData = fsCtx.createImageData(N, N);
          for (let i = 0; i < N * N; i++) {
            const val = Math.min(255, Math.max(0, Math.round((filtSpectrumMag[i] / maxOrigMag) * 255)));
            fsData.data[i * 4] = val;
            fsData.data[i * 4 + 1] = val;
            fsData.data[i * 4 + 2] = val;
            fsData.data[i * 4 + 3] = 255;
          }
          fsCtx.putImageData(fsData, 0, 0);

          // Draw a soft glowing guideline ring indicating cutoff radius on filtered spectrum
          fsCtx.strokeStyle = "rgba(14, 165, 233, 0.45)"; // sky blue
          fsCtx.lineWidth = 1;
          fsCtx.beginPath();
          fsCtx.arc(cx, cy, radius, 0, 2 * Math.PI);
          fsCtx.stroke();
        }
      }

      // 7. Revert Centered shift back (ifftshift)
      const deShifted = fftShift(filteredRe, filteredIm, N);

      // 8. Run Inverse 2D FFT to reconstruct grayscale spatial image
      fft2D(deShifted.re, deShifted.im, N, true);

      // 9. Render reconstructed magnitude (with min-max scaling to stretch dynamic range)
      let minVal = Infinity;
      let maxVal = -Infinity;
      for (let i = 0; i < N * N; i++) {
        const val = deShifted.re[i]; // standard value is primarily in the real part
        if (val < minVal) minVal = val;
        if (val > maxVal) maxVal = val;
      }

      const diff = maxVal - minVal || 1;

      const reconCanvas = canvasReconstructedRef.current;
      if (reconCanvas) {
        reconCanvas.width = N;
        reconCanvas.height = N;
        const rCtx = reconCanvas.getContext("2d");
        if (rCtx) {
          const rData = rCtx.createImageData(N, N);
          for (let i = 0; i < N * N; i++) {
            // Min-max normalization for precise pixel restoration
            const val = Math.min(255, Math.max(0, Math.round(((deShifted.re[i] - minVal) / diff) * 255)));
            rData.data[i * 4] = val;
            rData.data[i * 4 + 1] = val;
            rData.data[i * 4 + 2] = val;
            rData.data[i * 4 + 3] = 255;
          }
          rCtx.putImageData(rData, 0, 0);
        }
      }

      if (active) {
        setCalcTime(Math.round(performance.now() - startTime));
        setIsCalculating(false);
      }
    }, 40);

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [image, filterType, resolution, radius]);

  // Max radius based on center calculation
  const maxRadius = Math.floor(resolution / 2);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" id="freq-domain-view">
      {/* 2x2 Canvas Grid Visualization on LHS (Takes 3/4 columns) */}
      <div className="lg:col-span-3 space-y-4">
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b border-gray-55 pb-3">
            <div>
              <h2 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-blue-500" />
                傅立葉頻域重構視覺化矩陣 (2D Fourier Grid)
              </h2>
              <p className="text-xs text-gray-400">
                將空間影像（陣列像素）以複數形式投影為高/低波頻譜，並利用逆轉換（IDFT）還原結構。
              </p>
            </div>
            <div className="flex items-center space-x-2 text-[11px] font-mono text-gray-450 bg-gray-50 px-2.5 py-1 rounded-lg">
              <Zap className="h-3.5 w-3.5 text-yellow-500 animate-pulse" />
              <span>
                運算耗時：<strong className="text-gray-700">{calcTime} ms</strong>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Cell 1: Original Gray */}
            <div className="bg-gray-50/50 p-4 border border-gray-100 rounded-2xl flex flex-col items-center">
              <span className="text-xs font-bold text-gray-700 mb-2 self-start flex items-center gap-1 bg-white px-2 py-0.5 rounded-md shadow-sm border border-gray-100">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                1. 原始灰階影像
              </span>
              <div className="aspect-square w-full rounded-xl bg-black overflow-hidden flex items-center justify-center border border-gray-200">
                <canvas ref={canvasOriginalRef} className="object-contain w-full h-full max-h-[320px] image-render-pixelated" />
              </div>
              <p className="text-[10px] text-gray-400 mt-2 font-mono text-center">
                Spatial Domain Image f(x, y) - {resolution} &times; {resolution} px
              </p>
            </div>

            {/* Cell 4: Inverse Reconstructed Image */}
            <div className="bg-gray-50/50 p-4 border border-gray-100 rounded-2xl flex flex-col items-center">
              <span className="text-xs font-bold text-gray-700 mb-2 self-start flex items-center gap-1 bg-white px-2 py-0.5 rounded-md shadow-sm border border-gray-100">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                4. 逆傅立葉轉換後影像 ({filterType === "low" ? "低通平滑" : "高通銳化"})
              </span>
              <div className="aspect-square w-full rounded-xl bg-black overflow-hidden flex items-center justify-center border border-gray-200 relative">
                <canvas ref={canvasReconstructedRef} className="object-contain w-full h-full max-h-[320px] image-render-pixelated" />
                {isCalculating && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center">
                    <span className="text-[10px] font-mono text-white tracking-widest bg-black px-2.5 py-1.5 rounded-xl border border-white/20 shadow-md">
                      TRANSFORMING...
                    </span>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-gray-400 mt-2 font-mono text-center">
                Spatial Restoration g(x, y) = Re(IDFT[G(u, v)])
              </p>
            </div>

            {/* Cell 2: Original Fourier Spectrum */}
            <div className="bg-gray-50/50 p-4 border border-gray-100 rounded-2xl flex flex-col items-center">
              <span className="text-xs font-bold text-gray-700 mb-2 self-start flex items-center gap-1 bg-white px-2 py-0.5 rounded-md shadow-sm border border-gray-100">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>
                2. 原始傅立葉功率頻譜圖
              </span>
              <div className="aspect-square w-full rounded-xl bg-black overflow-hidden flex items-center justify-center border border-gray-200">
                <canvas ref={canvasSpectrumOriginalRef} className="object-contain w-full h-full max-h-[320px] image-render-pixelated" />
              </div>
              <p className="text-[10px] text-gray-400 mt-2 font-mono text-center">
                Logarithmic Power Spectrum log(1 + |F(u, v)|)
              </p>
            </div>

            {/* Cell 3: Filtered Spectrum */}
            <div className="bg-gray-50/50 p-4 border border-gray-100 rounded-2xl flex flex-col items-center">
              <span className="text-xs font-bold text-gray-700 mb-2 self-start flex items-center gap-1 bg-white px-2 py-0.5 rounded-md shadow-sm border border-gray-100">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                3. 濾波後的頻譜圖 (半徑: {radius} px)
              </span>
              <div className="aspect-square w-full rounded-xl bg-black overflow-hidden flex items-center justify-center border border-gray-200 relative">
                <canvas ref={canvasSpectrumFilteredRef} className="object-contain w-full h-full max-h-[320px] image-render-pixelated" />
                {isCalculating && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center">
                    <span className="text-[10px] font-mono text-white tracking-widest bg-black px-2.5 py-1.5 rounded-xl border border-white/20 shadow-md">
                      RECALCULATING...
                    </span>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-gray-400 mt-2 font-mono text-center">
                Masked Frequency G(u, v) = F(u, v) * H(u, v)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Control Configuration Panel on RHS (Takes 1/4 column) */}
      <div className="lg:col-span-1 space-y-4">
        {/* Grayscale low/high pass filter parameters */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-5">
          <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
            <Sliders className="h-4.5 w-4.5 text-blue-600" />
            <span className="text-sm font-bold text-gray-800">傅立葉濾波設定</span>
          </div>

          {/* Type picker */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 tracking-wider uppercase block">
              選擇濾波器種類
            </label>
            <div className="grid grid-cols-2 gap-2" id="filter-type-picker">
              <button
                type="button"
                onClick={() => setFilterType("low")}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                  filterType === "low"
                    ? "bg-blue-50 text-blue-700 border-blue-200 shadow-sm"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                低通濾波 (Low-pass)
              </button>
              <button
                type="button"
                onClick={() => setFilterType("high")}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                  filterType === "high"
                    ? "bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                高通濾波 (High-pass)
              </button>
            </div>
          </div>

          {/* Spatial frequency radius */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-gray-500 tracking-wider uppercase">
                截止頻率半徑 (Radius)
              </label>
              <strong className="text-xs font-mono font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                {radius} px
              </strong>
            </div>
            <input
              type="range"
              min="1"
              max={maxRadius}
              value={radius}
              onChange={(e) => setRadius(parseInt(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-450 font-mono">
              <span>1 px (低頻)</span>
              <span>{maxRadius} px (滿頻率)</span>
            </div>
          </div>

          {/* Grayscale canvas resolution toggle */}
          <div className="space-y-2 pt-2 border-t border-gray-50">
            <label className="text-xs font-bold text-gray-500 tracking-wider uppercase block">
              運算空間維度
            </label>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setResolution(128)}
                className={`flex-1 py-1 px-2.5 rounded-lg text-xs font-mono font-medium border ${
                  resolution === 128
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
              >
                128 &times; 128 (流暢)
              </button>
              <button
                onClick={() => setResolution(256)}
                className={`flex-1 py-1 px-2.5 rounded-lg text-xs font-mono font-medium border ${
                  resolution === 256
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
              >
                256 &times; 256 (高精)
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1 leading-normal">
              128&times;128 在阻尼截止半徑拉動時更流暢，256&times;256 運算量擴大四倍，細節還原度更精準。
            </p>
          </div>
        </div>

        {/* Theoretical help context */}
        <div className="bg-gradient-to-br from-indigo-50/60 to-blue-50/40 rounded-3xl p-5 border border-indigo-50/50 shadow-inner">
          <div className="flex items-center space-x-1.5 mb-2 text-indigo-850">
            <HelpCircle className="h-4 w-4" />
            <h3 className="text-xs font-bold text-indigo-900">學術原理解析小筆記</h3>
          </div>
          <div className="text-[11px] text-indigo-950/80 space-y-2 leading-relaxed">
            <p>
              <strong>低通濾波 (Low-pass)</strong>：只保留頻譜中心附近的低頻成分（代表平滑色塊），濾除外圍高頻（代表邊界、噪點）。影像逆轉換後將呈<strong>模糊、去噪點狀態</strong>。
            </p>
            <p>
              <strong>高通濾波 (High-pass)</strong>：濾除低頻直流分量，僅保留高頻邊界與細節。逆轉換後影像中原先平緩的區塊變黑，僅勾勒出<strong>極具張力的輪廓與細節紋理</strong>。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
