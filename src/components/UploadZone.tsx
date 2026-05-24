/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from "react";
import { Upload, Image as ImageIcon, Sparkles, FileImage, ShieldCheck } from "lucide-react";

interface UploadZoneProps {
  onImageSelected: (img: HTMLImageElement) => void;
}

export default function UploadZone({ onImageSelected }: UploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);

  const demoImages = [
    {
      name: "🪄 幾何建築",
      desc: "幾何線條豐富，最適合頻域傅立葉高低通濾波實驗",
      url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80",
    },
    {
      name: "⛰️ 翠綠山脈",
      desc: "色彩層次感高，最適合作為色溫、飽和度等調色大師調校",
      url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80",
    },
    {
      name: "👩🏻 優雅人像",
      desc: "細膩五官特徵，推薦用來玩畫筆塗鴉、光影白點陰影細調",
      url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
    },
  ];

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("請上傳正確的圖片格式（png, jpg, jpeg）");
      return;
    }

    setLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        onImageSelected(img);
        setLoading(false);
      };
      img.onerror = () => {
        alert("載入圖片失敗");
        setLoading(false);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const selectDemo = (url: string) => {
    setLoading(false);
    const img = new Image();
    img.crossOrigin = "anonymous"; // Bypass CORS
    img.onload = () => {
      onImageSelected(img);
    };
    img.onerror = () => {
      alert("載入範例圖片失敗，請嘗試自行上傳。或檢查網絡連接。");
    };
    img.src = url;
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8" id="upload-zone">
      {/* Intro Cover */}
      <div className="text-center mb-10">
        <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-3.5 py-1.5 rounded-full shadow-inner inline-flex items-center gap-1">
          <Sparkles className="h-3 w-3 animate-spin" /> Interactive Multi-Media Processing
        </span>
        <h1 className="mt-4 text-3xl font-extrabold text-gray-900 tracking-tight sm:text-4xl">
          智慧多媒體影像處理實驗室
        </h1>
        <p className="mt-3 max-w-xl mx-auto text-sm text-gray-500">
          整合傅立葉頻域轉換（2D FFT）與現代化的 Google 色彩工具箱。本系統無須上傳雲端，所有演算法皆在您的瀏覽器端沙盒內完成，提供流暢的無損濾波與即時編輯體驗。
        </p>
      </div>

      {/* Main Drag Box */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all duration-300 ${
          isDragging
            ? "border-blue-500 bg-blue-50/50 scale-[1.011]"
            : "border-gray-200 hover:border-blue-400 hover:bg-gray-50/40"
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          accept="image/*"
          className="hidden"
        />

        {loading ? (
          <div className="space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm font-medium text-gray-500">正在解碼影像像素資料...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto text-blue-505 shadow-md">
              <Upload className="h-8 w-8 text-blue-600" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold text-gray-800">
                拖打或點擊此處，上傳測試照片
              </p>
              <p className="text-xs text-gray-400">
                支援 PNG, JPG, JPEG 格式，影像像素將即時轉入記憶體處理
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Demo Section */}
      <div className="mt-12 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center space-x-2 mb-4">
          <FileImage className="h-5 w-5 text-indigo-505" />
          <h2 className="text-sm font-semibold text-gray-800">💡 沒有合適圖片？直接點選即時體驗：</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {demoImages.map((demo, idx) => (
            <div
              key={idx}
              onClick={() => selectDemo(demo.url)}
              className="group relative cursor-pointer overflow-hidden rounded-xl border border-gray-150 hover:border-blue-300 hover:shadow-md transition-all flex flex-col"
            >
              <div className="aspect-video w-full overflow-hidden bg-gray-100">
                <img
                  src={demo.url}
                  alt={demo.name}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-3 bg-white flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-gray-800">{demo.name}</h3>
                  <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">{demo.desc}</p>
                </div>
                <div className="mt-2 text-right">
                  <span className="text-[9px] font-bold text-blue-600 group-hover:underline">免上傳套用 &rarr;</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security note */}
      <div className="mt-8 flex items-center justify-center space-x-2 text-[11px] text-gray-400 font-mono">
        <ShieldCheck className="h-4 w-4 text-green-500" />
        <span>本地獨立沙盒：照片完全不經伺服器，資料隱私安全。符合專題展示規範</span>
      </div>
    </div>
  );
}
