'use client';

import DocumentFilters from '@/components/document-repository/DocumentFilters';
import DocumentModal from '@/components/document-repository/DocumentModal';
import DocumentTable from '@/components/document-repository/DocumentTable';
import HistoryModal from '@/components/document-repository/HistoryModal';
import PageHeader from '@/components/document-repository/PageHeader';
import { useTheme } from '@/components/useTheme';
import { Document, FilterState } from '@/config/types';
import { DUMMY_DOCUMENTS } from '@/lib/dummydata';
import { useState } from 'react';

export default function DocumentRepositoryPage() {
  const { isDark } = useTheme()
  const [documents, setDocuments] = useState<Document[]>(DUMMY_DOCUMENTS);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>(DUMMY_DOCUMENTS);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    area: '',
    category: '',
    status: '',
    owner: '',
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [selectedDocumentHistory, setSelectedDocumentHistory] = useState<any[]>([]);

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);

    let filtered = [...documents];

    if (newFilters.search) {
      const search = newFilters.search.toLowerCase();
      filtered = filtered.filter(doc =>
        doc.title.toLowerCase().includes(search) ||
        doc.doc_code.toLowerCase().includes(search) ||
        doc.description?.toLowerCase().includes(search) ||
        doc.keywords?.toLowerCase().includes(search)
      );
    }

    if (newFilters.area) {
      filtered = filtered.filter(doc => doc.area === newFilters.area);
    }

    if (newFilters.category) {
      filtered = filtered.filter(doc => doc.category === newFilters.category);
    }

    if (newFilters.status) {
      filtered = filtered.filter(doc => doc.status === newFilters.status);
    }

    if (newFilters.owner) {
      filtered = filtered.filter(doc => doc.owner_role === newFilters.owner);
    }

    setFilteredDocuments(filtered);
  };

  const handleResetFilters = () => {
    const resetFilters: FilterState = {
      search: '',
      area: '',
      category: '',
      status: '',
      owner: '',
    };
    setFilters(resetFilters);
    setFilteredDocuments(documents);
  };

  const handleNewDocument = () => {
    setSelectedDocument(null);
    setIsModalOpen(true);
  };

  const handleEditDocument = (doc: Document) => {
    setSelectedDocument(doc);
    setIsModalOpen(true);
  };

  const handleViewHistory = (doc: Document) => {
    // Mock history data
    setSelectedDocumentHistory([
      {
        version_label: 'v1.0',
        change_log: 'Initial version',
        created_at: '2024-01-15T10:30:00',
        created_by: 'John Doe',
      },
      {
        version_label: 'v1.1',
        change_log: 'Updated compliance requirements',
        created_at: '2024-02-01T14:20:00',
        created_by: 'Jane Smith',
      },
    ]);
    setIsHistoryModalOpen(true);
  };

  const handleDownload = (doc: Document) => {
    // Mock download
    console.log('Downloading:', doc.title);
    alert(`Downloading: ${doc.title}`);
  };

  const handleSaveDocument = (formData: any) => {
    if (selectedDocument) {
      // Update existing document
      const updatedDocs = documents.map(doc =>
        doc.document_id === selectedDocument.document_id
          ? { ...doc, ...formData }
          : doc
      );
      setDocuments(updatedDocs);
      setFilteredDocuments(updatedDocs);
    } else {
      // Add new document
      const newDoc: Document = {
        document_id: documents.length + 1,
        ...formData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setDocuments([...documents, newDoc]);
      setFilteredDocuments([...documents, newDoc]);
    }
    setIsModalOpen(false);
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
      <div className="container mx-auto px-4 py-6">
        <PageHeader onNewDocument={handleNewDocument} />

        <DocumentFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onReset={handleResetFilters}
          isDark={isDark}
        />

        <DocumentTable
          documents={filteredDocuments}
          onEdit={handleEditDocument}
          onViewHistory={handleViewHistory}
          onDownload={handleDownload}
          isDark={isDark}
        />

        <DocumentModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveDocument}
          document={selectedDocument}
          isDark={isDark}
        />

        <HistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          history={selectedDocumentHistory}
          isDark={isDark}
        />
      </div>
    </div>
  );
}