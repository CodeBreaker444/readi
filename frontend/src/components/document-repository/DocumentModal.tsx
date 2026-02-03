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
}

export default function DocumentModal({
  isOpen,
  onClose,
  onSave,
  document,
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">
            {document ? 'Modifica Documento' : 'Nuovo Documento'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Document Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipologia *
              </label>
              <select
                value={formData.doc_type_id}
                onChange={(e) => handleChange('doc_type_id', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Seleziona...</option>
                {DUMMY_DOCUMENT_TYPES.map((type) => (
                  <option key={type.doc_type_id} value={type.doc_type_id}>
                    {type.type_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Document Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Codice
              </label>
              <input
                type="text"
                value={formData.doc_code}
                onChange={(e) => handleChange('doc_code', e.target.value)}
                placeholder="LUC-XXX-001"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stato
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="DRAFT">DRAFT</option>
                <option value="IN_REVIEW">IN_REVIEW</option>
                <option value="APPROVED">APPROVED</option>
                <option value="OBSOLETE">OBSOLETE</option>
              </select>
            </div>

            {/* Confidentiality */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confidenzialità
              </label>
              <select
                value={formData.confidentiality}
                onChange={(e) => handleChange('confidentiality', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="INTERNAL">INTERNAL</option>
                <option value="PUBLIC">PUBLIC</option>
                <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                <option value="RESTRICTED">RESTRICTED</option>
              </select>
            </div>

            {/* Title */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Titolo *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Owner Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Owner (ruolo)
              </label>
              <input
                type="text"
                value={formData.owner_role}
                onChange={(e) => handleChange('owner_role', e.target.value)}
                placeholder="es. Compliance Manager"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Version */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Versione
              </label>
              <input
                type="text"
                value={formData.version_label}
                onChange={(e) => handleChange('version_label', e.target.value)}
                placeholder="v1.0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Effective Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Effettivo (data)
              </label>
              <input
                type="date"
                value={formData.effective_date}
                onChange={(e) => handleChange('effective_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Expiry Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Scadenza (data)
              </label>
              <input
                type="date"
                value={formData.expiry_date}
                onChange={(e) => handleChange('expiry_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrizione
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Keywords */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Parole chiave (separati da virgola)
              </label>
              <input
                type="text"
                value={formData.keywords}
                onChange={(e) => handleChange('keywords', e.target.value)}
                placeholder="safety, compliance, training"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Tags */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags (JSON opzionale)
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => handleChange('tags', e.target.value)}
                placeholder='["safety", "compliance"]'
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Change Log */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Change log
              </label>
              <input
                type="text"
                value={formData.change_log}
                onChange={(e) => handleChange('change_log', e.target.value)}
                placeholder="Novità di questa versione"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* File Upload */}
            {!document && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  File *
                </label>
                <input
                  type="file"
                  required={!document}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Chiudi
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Salva
          </button>
        </div>
      </div>
    </div>
  );
}