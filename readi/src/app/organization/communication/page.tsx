'use client';

import FormCard from '@/components/organization/FormCard';
import OrgDataTable from '@/components/organization/OrgDataTable';
import { useTheme } from '@/components/useTheme';
import { ActiveStatus, Communication } from '@/config/types';
import { dummyCommunications } from '@/lib/dummydata';
import { useState } from 'react';

export default function CommunicationPage() {
  const { isDark } = useTheme()
  const [communications, setCommunications] = useState<Communication[]>(dummyCommunications);
  const [formData, setFormData] = useState({
    code: '',
    version: '',
    active: '' as ActiveStatus | '',
    description: '',
    jsonSchema: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newCommunication: Communication = {
      id: String(communications.length + 1),
      code: formData.code,
      version: formData.version,
      active: formData.active as ActiveStatus,
      description: formData.description,
      jsonSchema: formData.jsonSchema,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setCommunications([...communications, newCommunication]);
    
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
    { key: 'code', label: 'Code' },
    { key: 'version', label: 'Version' },
    {
      key: 'active',
      label: 'Active',
      render: (value: ActiveStatus) => (
        <span className={`badge ${value === 'Y' ? 'bg-success' : 'bg-secondary'}`}>
          {value === 'Y' ? 'Yes' : 'No'}
        </span>
      )
    },
    { key: 'description', label: 'Description' },
    {
      key: 'updatedAt',
      label: 'Last Updated',
      render: (value: string) => new Date(value).toLocaleDateString()
    }
  ];

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-md-12 col-lg-12">
          <FormCard title="Add Communication" isDark={isDark}>
            <p className="card-text form-label text-start mt-2 mb-4">
              Fill the form for adding a new Communication protocol.
            </p>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label
                    htmlFor="code"
                    className={`block text-sm font-semibold mb-2
                      ${isDark ? 'text-slate-300' : 'text-gray-700'}`}
                  >
                    Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    className={`w-full px-4 py-2.5 rounded-lg border outline-none transition-all focus:ring-2
                      ${isDark
                        ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-400 focus:ring-blue-500 focus:border-blue-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'}`}
                    type="text"
                    id="code"
                    placeholder="Enter assignment code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="version"
                    className={`block text-sm font-semibold mb-2
                      ${isDark ? 'text-slate-300' : 'text-gray-700'}`}
                  >
                    Version <span className="text-red-500">*</span>
                  </label>
                  <input
                    className={`w-full px-4 py-2.5 rounded-lg border outline-none transition-all focus:ring-2
                      ${isDark
                        ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-400 focus:ring-blue-500 focus:border-blue-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'}`}
                    type="text"
                    id="version"
                    placeholder="e.g., 1.0.0"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="active"
                    className={`block text-sm font-semibold mb-2
                      ${isDark ? 'text-slate-300' : 'text-gray-700'}`}
                  >
                    Active <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="active"
                    className={`w-full px-4 py-2.5 rounded-lg border outline-none transition-all focus:ring-2 cursor-pointer
                      ${isDark
                        ? 'bg-slate-700 border-slate-600 text-slate-200 focus:ring-blue-500 focus:border-blue-500'
                        : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500'}`}
                    value={formData.active}
                    onChange={(e) =>
                      setFormData({ ...formData, active: e.target.value as ActiveStatus })
                    }
                    required
                  >
                    <option value="">Select status</option>
                    <option value="Y">Yes</option>
                    <option value="N">No</option>
                  </select>
                </div>
              </div>

              <div className="mb-6">
                <label
                  htmlFor="description"
                  className={`block text-sm font-semibold mb-2
                    ${isDark ? 'text-slate-300' : 'text-gray-700'}`}
                >
                  Description <span className="text-red-500">*</span>
                </label>
                <input
                  className={`w-full px-4 py-2.5 rounded-lg border outline-none transition-all focus:ring-2
                    ${isDark
                      ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-400 focus:ring-blue-500 focus:border-blue-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'}`}
                  type="text"
                  id="description"
                  placeholder="Enter a detailed description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  required
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8">
                  <label
                    htmlFor="jsonSchema"
                    className={`block text-sm font-semibold mb-2
                      ${isDark ? 'text-slate-300' : 'text-gray-700'}`}
                  >
                    JSON Schema
                  </label>
                  <textarea
                    className={`w-full px-4 py-3 rounded-lg border outline-none transition-all focus:ring-2 font-mono text-sm resize-none
                      ${isDark
                        ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-400 focus:ring-blue-500 focus:border-blue-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'}`}
                    rows={20}
                    id="jsonSchema"
                    value={formData.jsonSchema}
                    onChange={(e) =>
                      setFormData({ ...formData, jsonSchema: e.target.value })
                    }
                    placeholder={`{
  "type": "object",
  "properties": {
    "name": {
      "type": "string"
    }
  }
}`}
                  />
                </div>

                <div className="lg:col-span-4 flex items-end">
                  <button
                    type="submit"
                    className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    <span className="flex items-center justify-center gap-2">
                      Add New Communication
                    </span>
                  </button>
                </div>
              </div>
            </form>
          </FormCard>
        </div>
      </div>

      <div className="row">
        <div className="col-md-12 col-lg-12">
          <OrgDataTable
            columns={columns}
            data={communications}
            title="Communication List"
            isDark={isDark}
            actions={
              <button className="btn btn-sm btn-outline-primary">
                Export
              </button>
            }
          />
        </div>
      </div>
    </div>
  );
}