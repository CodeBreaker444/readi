'use client';

import FormCard from '@/src/components/organization/FormCard';
import OrgDataTable from '@/src/components/organization/OrgDataTable';
import { useTheme } from '@/src/components/useTheme';
import { Download, FileText } from 'lucide-react';
import { useState } from 'react';

type ActiveStatus = 'Y' | 'N' | '';

interface Assignment {
  id: string;
  code: string;
  version: string;
  active: string;
  description: string;
  jsonSchema: string;
}

interface FormData {
  code: string;
  version: string;
  active: ActiveStatus;
  description: string;
  jsonSchema: string;
}

export default function AssignmentPage() {
  const { isDark } = useTheme();
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const [formData, setFormData] = useState<FormData>({
    code: '',
    version: '',
    active: '',
    description: '',
    jsonSchema: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newAssignment: Assignment = {
      id: Date.now().toString(),
      ...formData,
    };

    setAssignments([...assignments, newAssignment]);

    // Reset form
    setFormData({
      code: '',
      version: '',
      active: '',
      description: '',
      jsonSchema: '',
    });
  };

  const columns = [
    { key: 'code', label: 'Code' },
    { key: 'version', label: 'Version' },
    {
      key: 'active',
      label: 'Active',
      render: (value: string) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold
          ${value === 'Y'
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}
        >
          {value === 'Y' ? 'Yes' : 'No'}
        </span>
      )
    },
    { key: 'description', label: 'Description' },
  ];

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className={`text-3xl font-bold mb-2
            ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
            Assignment Management
          </h1>
          <p className={`text-sm
            ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
            Create and manage assignments with custom JSON schemas
          </p>
        </div>

        <div className="mb-8">
          <FormCard
            title="Add Assignment"
            isDark={isDark}
            defaultOpen={true}
            icon={<FileText className="w-5 h-5 text-white" />}
          >
            <p className={`text-sm mb-6
              ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
              Fill out the form below to create a new assignment with a custom JSON schema configuration.
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
                      <FileText className="w-5 h-5" />
                      Add New Assignment
                    </span>
                  </button>
                </div>
              </div>
            </form>
          </FormCard>
        </div>

        <div>
          <OrgDataTable
            columns={columns}
            data={assignments}
            title="Assignment List"
            isDark={isDark}
            actions={
              <button
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all
                  ${isDark
                    ? 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            }
          />
        </div>
      </div>
    </div>
  );
}