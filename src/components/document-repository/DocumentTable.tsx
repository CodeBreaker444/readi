import { Download, Edit2, History } from 'lucide-react';
import { Document } from '../../config/types/types';
interface DocumentTableProps {
  documents: Document[];
  onEdit: (doc: Document) => void;
  onViewHistory: (doc: Document) => void;
  onDownload: (doc: Document) => void;
  isDark : boolean;
}

export default function DocumentTable({
  documents,
  onEdit,
  onViewHistory,
  onDownload,
  isDark
}: DocumentTableProps) {
  const getStatusBadge = (status: string) => {
    const statusColors = {
      DRAFT: 'bg-gray-100 text-gray-800',
      IN_REVIEW: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      OBSOLETE: 'bg-red-100 text-red-800',
    };
    return statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('it-IT');
  };

  return (
  <div
  className={`rounded-lg shadow-sm overflow-hidden border ${
    isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
  }`}
>
  <div className="overflow-x-auto">
    <table
      className={`min-w-full divide-y ${
        isDark ? 'divide-slate-700' : 'divide-gray-200'
      }`}
    >
      <thead className={isDark ? 'bg-slate-900' : 'bg-gray-50'}>
        <tr>
          {[
            'Code',
            'Title',
            'Type',
            'Area',
            'Category',
            'Status',
            'Version',
            'Dates',
            'Actions',
          ].map((header, i) => (
            <th
              key={i}
              className={`px-4 py-3 text-xs font-medium uppercase tracking-wider ${
                header === 'Actions' ? 'text-right' : 'text-left'
              } ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>

      <tbody
        className={`divide-y ${
          isDark
            ? 'bg-slate-800 divide-slate-700'
            : 'bg-white divide-gray-200'
        }`}
      >
        {documents.length === 0 ? (
          <tr>
            <td
              colSpan={9}
              className={`px-4 py-8 text-center ${
                isDark ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              No documents found
            </td>
          </tr>
        ) : (
          documents.map((doc) => (
            <tr
              key={doc.document_id}
              className={`transition-colors ${
                isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-50'
              }`}
            >
              <td
                className={`px-4 py-3 text-sm font-medium ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}
              >
                {doc.doc_code}
              </td>

              <td
                className={`px-4 py-3 text-sm ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}
              >
                <div className="font-medium">{doc.title}</div>
                {doc.description && (
                  <div
                    className={`text-xs mt-1 line-clamp-2 ${
                      isDark ? 'text-gray-400' : 'text-gray-500'
                    }`}
                  >
                    {doc.description}
                  </div>
                )}
              </td>

              <td
                className={`px-4 py-3 text-sm ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`}
              >
                {doc.type_name || '-'}
              </td>

              <td className="px-4 py-3 text-sm">
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    isDark
                      ? 'bg-blue-900 text-blue-300'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {doc.area}
                </span>
              </td>

              <td
                className={`px-4 py-3 text-sm ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`}
              >
                {doc.category}
              </td>

              <td className="px-4 py-3 text-sm">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(
                    doc.status
                  )}`}
                >
                  {doc.status.replace('_', ' ')}
                </span>
              </td>

              <td
                className={`px-4 py-3 text-sm ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`}
              >
                {doc.version_label}
              </td>

              <td
                className={`px-4 py-3 text-sm ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`}
              >
                <div className="space-y-1">
                  <div className="text-xs">
                    <span className="font-medium">Eff:</span>{' '}
                    {formatDate(doc.effective_date)}
                  </div>
                  {doc.expiry_date && (
                    <div className="text-xs">
                      <span className="font-medium">Exp:</span>{' '}
                      {formatDate(doc.expiry_date)}
                    </div>
                  )}
                </div>
              </td>

              <td className="px-4 py-3 text-sm text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => onEdit(doc)}
                    title="Edit"
                    className={`p-1.5 rounded transition-colors ${
                      isDark
                        ? 'text-blue-400 hover:bg-blue-900'
                        : 'text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onViewHistory(doc)}
                    title="View history"
                    className={`p-1.5 rounded transition-colors ${
                      isDark
                        ? 'text-purple-400 hover:bg-purple-900'
                        : 'text-purple-600 hover:bg-purple-50'
                    }`}
                  >
                    <History className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onDownload(doc)}
                    title="Download"
                    className={`p-1.5 rounded transition-colors ${
                      isDark
                        ? 'text-green-400 hover:bg-green-900'
                        : 'text-green-600 hover:bg-green-50'
                    }`}
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
</div>
  );
}