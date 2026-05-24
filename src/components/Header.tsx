/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Image as ImageIcon, Sparkles, User, FileText, Check, Edit2 } from "lucide-react";

interface HeaderProps {
  onReset?: () => void;
  hasImage: boolean;
}

export default function Header({ onReset, hasImage }: HeaderProps) {
  const [studentName, setStudentName] = useState("王小明");
  const [studentId, setStudentId] = useState("B110902001");
  const [isEditing, setIsEditing] = useState(false);

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm" id="main-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Left Logos */}
        <div className="flex items-center space-x-3">
          <div className="bg-blue-50 text-blue-600 p-2 rounded-xl flex items-center justify-center shadow-inner">
            <ImageIcon className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-bold text-gray-900 tracking-tight">📸 Google 相簿智慧多媒體修圖系統</span>
              <span className="bg-blue-100 text-blue-700 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                期末專題
              </span>
            </div>
            <p className="text-xs text-gray-400 font-mono">Smart Digital Image Processing Lab Sandbox</p>
          </div>
        </div>

        {/* Student Meta Details & Reset */}
        <div className="flex items-center space-x-4">
          {/* Editable Student Profile */}
          <div className="bg-gray-50/80 px-4 py-1.5 rounded-2xl border border-gray-150 flex items-center space-x-3 shadow-sm transition-all hover:bg-gray-50 relative group">
            <div className="flex items-center space-x-2">
              <div className="bg-gray-200/60 p-1.5 rounded-lg text-gray-500">
                <User className="h-3.5 w-3.5" />
              </div>
              {isEditing ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="bg-white border border-gray-300 text-xs px-2 py-0.5 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 w-20 text-gray-800"
                    placeholder="學生姓名"
                  />
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="bg-white border border-gray-300 text-xs px-2 py-0.5 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 w-24 text-gray-800"
                    placeholder="學號"
                  />
                  <button
                    onClick={() => setIsEditing(false)}
                    className="p-1 hover:text-green-600 text-gray-500"
                    title="儲存"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="text-xs text-gray-700 font-medium">
                  <span className="hover:underline cursor-pointer" onClick={() => setIsEditing(true)}>
                    {studentName}
                  </span>
                  <span className="mx-2 text-gray-300">|</span>
                  <span className="font-mono text-gray-505 hover:underline cursor-pointer" onClick={() => setIsEditing(true)}>
                    {studentId}
                  </span>
                </div>
              )}
            </div>

            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-500 transition-opacity p-0.5"
                title="修改學生資訊"
              >
                <Edit2 className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Quick Action Reset */}
          {hasImage && onReset && (
            <button
              onClick={onReset}
              className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-sm active:scale-95"
              id="header-reset-btn"
            >
              <span>🔄 重新上傳</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
