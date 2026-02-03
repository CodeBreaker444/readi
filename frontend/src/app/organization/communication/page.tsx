'use client';

import FormCard from '@/src/components/organization/FormCard';
import OrgDataTable from '@/src/components/organization/OrgDataTable';
import { ActiveStatus, Communication } from '@/src/config/types';
import { dummyCommunications } from '@/src/lib/dummydata';
import { useState } from 'react';

export default function CommunicationPage() {
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
          <FormCard title="Add Communication">
            <p className="card-text form-label text-start mt-2 mb-4">
              Fill the form for adding a new Communication protocol.
            </p>
            <form onSubmit={handleSubmit}>
              <div className="row mb-3">
                <div className="col-md-4">
                  <label htmlFor="code" className="form-label">Code</label>
                  <input
                    className="form-control"
                    type="text"
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    required
                  />
                </div>
                <div className="col-md-4">
                  <label htmlFor="version" className="form-label">Version</label>
                  <input
                    className="form-control"
                    type="text"
                    id="version"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    required
                  />
                </div>
                <div className="col-md-4">
                  <label htmlFor="active" className="form-label">Active</label>
                  <select
                    id="active"
                    className="form-select"
                    value={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.value as ActiveStatus })}
                    required
                  >
                    <option value="">Select</option>
                    <option value="Y">Yes</option>
                    <option value="N">No</option>
                  </select>
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-12">
                  <label htmlFor="description" className="form-label">Description</label>
                  <input
                    className="form-control"
                    type="text"
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-8">
                  <label htmlFor="jsonSchema" className="form-label">JSON Schema</label>
                  <textarea
                    className="form-control"
                    rows={20}
                    id="jsonSchema"
                    value={formData.jsonSchema}
                    onChange={(e) => setFormData({ ...formData, jsonSchema: e.target.value })}
                    placeholder="Enter JSON schema for communication protocol..."
                  />
                </div>
                <div className="col-md-4 d-flex align-items-end">
                  <button type="submit" className="btn btn-primary w-100">
                    Add New Communication
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