'use client';
import { HelpCircle, Plus } from 'lucide-react';
import { useTheme } from '../useTheme';

interface PageHeaderProps {
  onNewDocument: () => void;
}

export default function PageHeader({ onNewDocument }: PageHeaderProps) {
  const { isDark } = useTheme()
 return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-2">
        <h1 className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Repository Documentale LUC
        </h1>
        <button
          title="Help"
          className={`transition-colors ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <HelpCircle className="w-6 h-6" />
        </button>
      </div>
      <button
        onClick={onNewDocument}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-sm transition-colors text-white ${isDark ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-600 hover:bg-blue-700'}`}
      >
        <Plus className="w-5 h-5" />
        New Document
      </button>
    </div>
  )
}