import { Clock, X } from 'lucide-react';
import { HistoryItem } from '../../config/types';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  isDark : boolean
}

export default function HistoryModal({
  isOpen,
  onClose,
  history,
  isDark
}: HistoryModalProps) {
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('it-IT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen) return null;

  return (
   <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black bg-opacity-50">
  <div className={`rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>

    <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
      <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>Revision History</h2>
      <button onClick={onClose} className={`${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-400 hover:text-gray-600'} transition-colors`}>
        <X className="w-6 h-6" />
      </button>
    </div>

    <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
      {history.length === 0 ? (
        <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No revisions available</div>
      ) : (
        <div className="space-y-4">
          {history.map((item, index) => (
            <div key={index} className={`rounded-lg p-4 border transition-colors ${isDark ? 'border-slate-700 hover:bg-slate-700' : 'border-gray-200 hover:bg-gray-50'}`}>

              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${isDark ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'}`}>
                    {item.version_label}
                  </span>
                  {index === 0 && (
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${isDark ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'}`}>
                      Current
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  <span className="font-medium">Changes:</span> {item.change_log || 'No change notes'}
                </div>

                <div className={`flex items-center gap-4 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDateTime(item.created_at)}
                  </div>
                  <div>
                    <span className="font-medium">By:</span> {item.created_by}
                  </div>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>

    <div className={`flex items-center justify-end p-6 border-t ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
      <button onClick={onClose} className={`px-4 py-2 rounded-lg border transition-colors ${isDark ? 'bg-slate-800 text-gray-300 border-slate-600 hover:bg-slate-700' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}>
        Close
      </button>
    </div>

  </div>
</div>
  );
}