'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface FormCardProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  icon?: React.ReactNode;
  isDark: boolean;
}

export default function FormCard({ 
  title, 
  children, 
  defaultOpen = false, 
  icon, 
  isDark 
}: FormCardProps) {
  const [isVisible, setIsVisible] = useState(defaultOpen);

  return (
    <div
      className={`rounded-xl shadow-lg border overflow-hidden transition-all duration-300 hover:shadow-2xl
        ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}
    >
      {/* Header */}
      <div
        className={`px-6 py-4 bg-linear-to-r from-slate-700 to-slate-900
          ${isDark
            ? 'from-slate-700 to-slate-900'
            : 'from-blue-600 to-indigo-700'}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon && (
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-lg backdrop-blur-sm
                  ${isDark ? 'bg-white/10' : 'bg-white/20'}`}
              >
                {icon}
              </div>
            )}
            <h4 className="text-xl font-bold text-white tracking-tight">
              {title}
            </h4>
          </div>

          <button
            type="button"
            onClick={() => setIsVisible(!isVisible)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-all duration-200 backdrop-blur-sm border
              ${isDark
                ? 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20'
                : 'bg-white/10 hover:bg-white/20 border-white/20 hover:border-white/30'}`}
            aria-label={isVisible ? 'Hide form' : 'Show form'}
          >
            <span className="text-sm font-medium">
              {isVisible ? 'Hide' : 'Show'}
            </span>
            {isVisible ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden
          ${isVisible ? 'max-h-500 opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div
          className={`p-6 bg-linear-to-br
            ${isDark
              ? 'from-slate-800 to-slate-900 text-slate-200'
              : 'from-gray-50 to-white text-gray-800'}`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}