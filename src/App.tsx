/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import Header from "./components/Header";
import UploadZone from "./components/UploadZone";
import FrequencyDomainTab from "./components/FrequencyDomainTab";
import ColorMasterTab from "./components/ColorMasterTab";
import { Sliders, Palette, Activity, ChevronLeft, RefreshCw, HelpCircle } from "lucide-react";

export default function App() {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [activeTab, setActiveTab] = useState<"frequency" | "color_master">("frequency");

  const resetAll = () => {
    setImage(null);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans" id="app-root">
      {/* Universal Google-themed Header with editable student meta details */}
      <Header hasImage={!!image} onReset={resetAll} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!image ? (
          // 1. Initial State: No loaded image. Displays Upload Screen with Demo cards
          <UploadZone onImageSelected={(img) => setImage(img)} />
        ) : (
          // 2. Main Workbench State: Displays the 2 Workspace Tabs
          <div className="space-y-6 animate-fade-in" id="workbench">
            
            {/* Action Bar / Navigation Top */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white px-5 py-3 rounded-2xl border border-gray-100 shadow-sm">
              <button
                onClick={resetAll}
                className="inline-flex items-center space-x-1.5 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors py-1 px-2.5 hover:bg-gray-100/50 rounded-xl"
                id="back-to-upload-btn"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>返回上一頁（重新上傳）</span>
              </button>

              <div className="text-xs text-gray-400 font-mono">
                圖片尺寸尺寸：
                <span className="text-gray-700 font-semibold font-mono">
                  {image.naturalWidth || image.width} &times; {image.naturalHeight || image.height} 像素
                </span>
              </div>
            </div>

            {/* Custom Google Photos Styled Tab Selection */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6">
              <div className="flex border-b border-gray-100 pb-px gap-4">
                <button
                  type="button"
                  onClick={() => setActiveTab("frequency")}
                  className={`flex items-center space-x-2 pb-3.5 px-3 text-sm font-extrabold border-b-2 transition-all active:scale-98 ${
                    activeTab === "frequency"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-400 hover:text-gray-700"
                  }`}
                >
                  <Activity className="h-4.5 w-4.5" />
                  <span>🎛️ 【指定題目】頻域高低通濾波</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("color_master")}
                  className={`flex items-center space-x-2 pb-3.5 px-3 text-sm font-extrabold border-b-2 transition-all active:scale-98 ${
                    activeTab === "color_master"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-400 hover:text-gray-700"
                  }`}
                >
                  <Palette className="h-4.5 w-4.5" />
                  <span>🎨 【自選題目】Google 相簿色彩大師</span>
                </button>
              </div>

              {/* Display Current Selected Tab Content */}
              {activeTab === "frequency" ? (
                <FrequencyDomainTab image={image} />
              ) : (
                <ColorMasterTab image={image} />
              )}
            </div>
          </div>
        )}
      </main>

      {/* Elegant Footer Details */}
      <footer className="bg-white border-t border-gray-100 py-6 text-center text-xs text-gray-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
          <div>
            &copy; 2026 Google 相簿智慧多媒體修圖實驗室專題版權所有
          </div>
          <div className="flex items-center space-x-4">
            <span>Powered by HTML5 Canvas &amp; 2D FFT Math Engine</span>
            <span>|</span>
            <span>本地無損流處理</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
