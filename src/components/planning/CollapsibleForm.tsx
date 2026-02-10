'use client';
import { ChevronDown, ChevronUp } from 'lucide-react';
import React, { useState } from 'react';

interface CollapsibleFormProps {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  isDark?: boolean;
}

const CollapsibleForm: React.FC<CollapsibleFormProps> = ({
  title,
  subtitle,
  defaultOpen = false,
  children,
  isDark = false
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border`}>
      <div 
        className={`p-4 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'} cursor-pointer`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h4 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {title}
            </h4>
            {subtitle && (
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            className={`ml-4 p-2 rounded-lg transition-colors ${
              isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'
            }`}
          >
            {isOpen ? (
              <ChevronUp className={isDark ? 'text-gray-400' : 'text-gray-600'} size={20} />
            ) : (
              <ChevronDown className={isDark ? 'text-gray-400' : 'text-gray-600'} size={20} />
            )}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="p-4">
          {children}
        </div>
      )}
    </div>
  );
};

export default CollapsibleForm;