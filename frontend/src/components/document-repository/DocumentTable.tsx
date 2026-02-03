import { Download, Edit2, History } from 'lucide-react';
import { Document } from '../../config/types';
interface DocumentTableProps {
  documents: Document[];
  onEdit: (doc: Document) => void;
  onViewHistory: (doc: Document) => void;
  onDownload: (doc: Document) => void;
}

export default function DocumentTable({
  documents,
  onEdit,
  onViewHistory,
  onDownload,
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
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Codice
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Titolo
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipologia
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Area
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Categoria
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stato
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Versione
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Azioni
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {documents.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                  Nessun documento trovato
                </td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr key={doc.document_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {doc.doc_code}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <div className="font-medium">{doc.title}</div>
                    {doc.description && (
                      <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {doc.description}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {doc.type_name || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {doc.area}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {doc.category}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(doc.status)}`}>
                      {doc.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {doc.version_label}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    <div className="space-y-1">
                      <div className="text-xs">
                        <span className="font-medium">Eff:</span> {formatDate(doc.effective_date)}
                      </div>
                      {doc.expiry_date && (
                        <div className="text-xs">
                          <span className="font-medium">Exp:</span> {formatDate(doc.expiry_date)}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onEdit(doc)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onViewHistory(doc)}
                        className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                        title="View History"
                      >
                        <History className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDownload(doc)}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                        title="Download"
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