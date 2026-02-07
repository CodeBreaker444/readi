'use client';

import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Document } from '../../config/types';
import { DUMMY_DOCUMENT_TYPES } from '../../lib/dummydata';

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  document: Document | null;
  isDark: boolean
}

export default function DocumentModal({
  isOpen,
  onClose,
  onSave,
  document,
  isDark
}: DocumentModalProps) {
  const [formData, setFormData] = useState({
    doc_type_id: '',
    doc_code: '',
    title: '',
    description: '',
    status: 'DRAFT',
    confidentiality: 'INTERNAL',
    owner_role: '',
    effective_date: '',
    expiry_date: '',
    keywords: '',
    tags: '',
    version_label: '',
    change_log: '',
  });

  useEffect(() => {
    if (document) {
      setFormData({
        doc_type_id: document.doc_type_id.toString(),
        doc_code: document.doc_code,
        title: document.title,
        description: document.description || '',
        status: document.status,
        confidentiality: document.confidentiality,
        owner_role: document.owner_role,
        effective_date: document.effective_date || '',
        expiry_date: document.expiry_date || '',
        keywords: document.keywords || '',
        tags: document.tags || '',
        version_label: document.version_label,
        change_log: document.change_log || '',
      });
    } else {
      setFormData({
        doc_type_id: '',
        doc_code: '',
        title: '',
        description: '',
        status: 'DRAFT',
        confidentiality: 'INTERNAL',
        owner_role: '',
        effective_date: '',
        expiry_date: '',
        keywords: '',
        tags: '',
        version_label: '',
        change_log: '',
      });
    }
  }, [document]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedType = DUMMY_DOCUMENT_TYPES.find(
      (t) => t.doc_type_id.toString() === formData.doc_type_id
    );
    
    onSave({
      ...formData,
      doc_type_id: parseInt(formData.doc_type_id),
      area: selectedType?.area || '',
      category: selectedType?.category || '',
      type_name: selectedType?.type_name || '',
    });
  };

  if (!isOpen) return null;

  return (
<div className={`fixed inset-0 flex items-center justify-center z-50 p-4 bg-black bg-opacity-50`}>
  <div className={`rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
    
    <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
      <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
        {document ? 'Edit Document' : 'New Document'}
      </h2>
      <button onClick={onClose} className={`${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-400 hover:text-gray-600'} transition-colors`}>
        <X className="w-6 h-6" />
      </button>
    </div>

    <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <div>
          <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Type *</label>
          <select value={formData.doc_type_id} onChange={e => handleChange('doc_type_id', e.target.value)} required className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDark ? 'bg-slate-900 text-white border-slate-600' : 'bg-white text-gray-900 border-gray-300'}`}>
            <option value="">Select...</option>
            {DUMMY_DOCUMENT_TYPES.map(type => <option key={type.doc_type_id} value={type.doc_type_id}>{type.type_name}</option>)}
          </select>
        </div>

        <div>
          <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Code</label>
          <input type="text" value={formData.doc_code} onChange={e => handleChange('doc_code', e.target.value)} placeholder="LUC-XXX-001" className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDark ? 'bg-slate-900 text-white border-slate-600' : 'bg-white text-gray-900 border-gray-300'}`} />
        </div>

        <div>
          <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Status</label>
          <select value={formData.status} onChange={e => handleChange('status', e.target.value)} className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDark ? 'bg-slate-900 text-white border-slate-600' : 'bg-white text-gray-900 border-gray-300'}`}>
            <option value="DRAFT">DRAFT</option>
            <option value="IN_REVIEW">IN REVIEW</option>
            <option value="APPROVED">APPROVED</option>
            <option value="OBSOLETE">OBSOLETE</option>
          </select>
        </div>

        <div>
          <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Confidentiality</label>
          <select value={formData.confidentiality} onChange={e => handleChange('confidentiality', e.target.value)} className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDark ? 'bg-slate-900 text-white border-slate-600' : 'bg-white text-gray-900 border-gray-300'}`}>
            <option value="INTERNAL">INTERNAL</option>
            <option value="PUBLIC">PUBLIC</option>
            <option value="CONFIDENTIAL">CONFIDENTIAL</option>
            <option value="RESTRICTED">RESTRICTED</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Title *</label>
          <input type="text" value={formData.title} onChange={e => handleChange('title', e.target.value)} required className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDark ? 'bg-slate-900 text-white border-slate-600' : 'bg-white text-gray-900 border-gray-300'}`} />
        </div>

        <div className="md:col-span-2">
          <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Description</label>
          <textarea rows={3} value={formData.description} onChange={e => handleChange('description', e.target.value)} className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDark ? 'bg-slate-900 text-white border-slate-600' : 'bg-white text-gray-900 border-gray-300'}`} />
        </div>

        {!document && (
          <div className="md:col-span-2">
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>File *</label>
            <input type="file" required className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-slate-900 text-white border-slate-600' : 'bg-white text-gray-900 border-gray-300'}`} />
          </div>
        )}

      </div>
    </form>

    <div className={`flex items-center justify-end gap-3 p-6 border-t ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
      <button type="button" onClick={onClose} className={`px-4 py-2 rounded-lg border transition-colors ${isDark ? 'bg-slate-800 text-gray-300 border-slate-600 hover:bg-slate-700' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}>Close</button>
      <button onClick={handleSubmit} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">Save</button>
    </div>

  </div>
</div>

  );
}