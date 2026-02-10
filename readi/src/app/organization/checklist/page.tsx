'use client';

import FormCard from '@/src/components/organization/FormCard';
import OrgDataTable from '@/src/components/organization/OrgDataTable';
import { useTheme } from '@/src/components/useTheme';
import { ActiveStatus, Checklist } from '@/src/config/types';
import { dummyChecklists } from '@/src/lib/dummydata';
import { CheckCircle, CheckSquare, Download, Plus, XCircle } from 'lucide-react';
import { useState } from 'react';

export default function ChecklistPage() {
  const { isDark } = useTheme()
  const [checklists, setChecklists] = useState<Checklist[]>(dummyChecklists);
  const [formData, setFormData] = useState({
    code: '',
    version: '',
    active: '' as ActiveStatus | '',
    description: '',
    jsonSchema: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newChecklist: Checklist = {
      id: String(checklists.length + 1),
      code: formData.code,
      version: formData.version,
      active: formData.active as ActiveStatus,
      description: formData.description,
      jsonSchema: formData.jsonSchema,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setChecklists([...checklists, newChecklist]);
    
    // Reset form
    setFormData({
      code: '',
      version: '',
      active: '',
      description: '',
      jsonSchema: ''
    });
  };

  const columns = [
    { 
      key: 'code', 
      label: 'Code',
      render: (value: string) => (
        <span className="font-semibold text-emerald-600">{value}</span>
      )
    },
    { 
      key: 'version', 
      label: 'Version',
      render: (value: string) => (
        <span className="px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs font-mono">
          v{value}
        </span>
      )
    },
    {
      key: 'active',
      label: 'Status',
      render: (value: ActiveStatus) => (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
          value === 'Y' 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : 'bg-gray-100 text-gray-600 border border-gray-200'
        }`}>
          {value === 'Y' ? (
            <>
              <CheckCircle className="w-3.5 h-3.5" />
              Active
            </>
          ) : (
            <>
              <XCircle className="w-3.5 h-3.5" />
              Inactive
            </>
          )}
        </span>
      )
    },
    { key: 'description', label: 'Description' },
    {
      key: 'updatedAt',
      label: 'Last Updated',
      render: (value: string) => (
        <span className="text-gray-600 text-sm">
          {new Date(value).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          })}
        </span>
      )
    }
  ];

  return (
  <div
  className={`min-h-screen p-6 ${
    isDark
      ? 'bg-linear-to-br from-gray-900 via-gray-800 to-gray-900'
      : 'bg-linear-to-br from-gray-50 via-emerald-50 to-teal-50'
  }`}
>
  <div className="max-w-7xl mx-auto space-y-6">

    <div
      className={`rounded-xl shadow-lg border p-6 ${
        isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-linear-to-r from-emerald-600 to-teal-700">
          <CheckSquare className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Checklists
          </h1>
          <p className={`text-sm mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Create and manage operational checklists
          </p>
        </div>
      </div>
    </div>

    <FormCard
      title="Add Checklist"
      icon={<Plus className="w-5 h-5 text-white" />}
      isDark={isDark}
    >
      <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} mb-6`}>
        Create a new checklist with Survey.js compatible JSON schema.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Checklist Code *
            </label>
            <input
              className={`w-full px-4 py-2.5 rounded-lg border outline-none transition-all ${
                isDark
                  ? 'bg-gray-800 border-gray-700 text-white focus:ring-emerald-600'
                  : 'bg-white border-gray-300 text-gray-900 focus:ring-emerald-500'
              }`}
              type="text"
              placeholder="e.g., CHK-001"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              required
            />
          </div>

          <div>
            <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Version *
            </label>
            <input
              className={`w-full px-4 py-2.5 rounded-lg border outline-none transition-all ${
                isDark
                  ? 'bg-gray-800 border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              type="text"
              placeholder="e.g., 1.0"
              value={formData.version}
              onChange={(e) => setFormData({ ...formData, version: e.target.value })}
              required
            />
          </div>

          <div>
            <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Status *
            </label>
            <select
              className={`w-full px-4 py-2.5 rounded-lg border outline-none transition-all ${
                isDark
                  ? 'bg-gray-800 border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              value={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.value as ActiveStatus })}
              required
            >
              <option value="">Select Status</option>
              <option value="Y">Active</option>
              <option value="N">Inactive</option>
            </select>
          </div>
        </div>

        <div>
          <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Description *
          </label>
          <input
            className={`w-full px-4 py-2.5 rounded-lg border outline-none transition-all ${
              isDark
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
            type="text"
            placeholder="Brief description of the checklist"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
          />
        </div>

        <div>
          <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            JSON Schema (Survey.js Format)
          </label>
          <textarea
            rows={12}
            className={`w-full px-4 py-3 rounded-lg border outline-none font-mono text-sm transition-all ${
              isDark
                ? 'bg-gray-800 border-gray-700 text-gray-100'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
            value={formData.jsonSchema}
            onChange={(e) => setFormData({ ...formData, jsonSchema: e.target.value })}
          />
        </div>

        <div className={`flex items-center gap-3 pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-linear-to-r from-emerald-600 to-teal-700 text-white font-semibold hover:shadow-lg transition-all"
          >
            <Plus className="w-5 h-5" />
            Create Checklist
          </button>

          <button
            type="button"
            className={`px-6 py-3 rounded-lg border font-semibold transition-all ${
              isDark
                ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() =>
              setFormData({
                code: '',
                version: '',
                active: '',
                description: '',
                jsonSchema: ''
              })
            }
          >
            Reset Form
          </button>
        </div>
      </form>
    </FormCard>

    <OrgDataTable
      columns={columns}
      data={checklists}
      title="Checklist List"
      isDark={isDark}
      actions={
        <button
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all font-medium ${
            isDark
              ? 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      }
    />
  </div>
</div>
  );
}