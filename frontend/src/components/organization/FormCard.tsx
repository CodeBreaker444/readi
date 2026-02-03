'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { ReactNode, useState } from 'react';

interface FormCardProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  icon?: ReactNode;
}

export default function FormCard({ title, children, defaultOpen = false, icon }: FormCardProps) {
  const [isVisible, setIsVisible] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-xl">
      <div className="bg-linear-to-r from-blue-600 to-indigo-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm">
                {icon}
              </div>
            )}
            <h4 className="text-xl font-bold text-white tracking-tight">{title}</h4>
          </div>
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all duration-200 backdrop-blur-sm border border-white/20"
            onClick={() => setIsVisible(!isVisible)}
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
      
      <div
        className={`transition-all duration-300 ease-in-out ${
          isVisible ? 'max-h-500 opacity-100' : 'max-h-0 opacity-0'
        } overflow-hidden`}
      >
        <div className="p-6 bg-linear-to-br from-gray-50 to-white">
          {children}
        </div>
      </div>
    </div>
  );
}