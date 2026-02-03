import { HelpCircle, Plus } from 'lucide-react';

interface PageHeaderProps {
  onNewDocument: () => void;
}

export default function PageHeader({ onNewDocument }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold text-gray-800">
          Repository Documentale LUC
        </h1>
        <button
          className="text-gray-500 hover:text-gray-700 transition-colors"
          title="Help"
        >
          <HelpCircle className="w-6 h-6" />
        </button>
      </div>
      
      <button
        onClick={onNewDocument}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
      >
        <Plus className="w-5 h-5" />
        New Document
      </button>
    </div>
  );
}