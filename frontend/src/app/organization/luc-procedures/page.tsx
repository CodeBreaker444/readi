'use client';

import DataTable from '@/components/organization/DataTable';
import FormCard from '@/components/organization/FormCard';
import { dummyLUCProcedures } from '@/data/organizationData';
import { ActiveStatus, LUCProcedure, SectorType } from '@/types/organization';
import { useState } from 'react';

export default function LUCProceduresPage() {
  const [procedures, setProcedures] = useState<LUCProcedure[]>(dummyLUCProcedures);
  const [formData, setFormData] = useState({
    code: '',
    sector: '' as SectorType | '',
    version: '',
    active: '' as ActiveStatus | '',
    description: '',
    jsonSchema: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newProcedure: LUCProcedure = {
      id: String(procedures.length + 1),
      code: formData.code,
      sector: formData.sector as SectorType,
      version: formData.version,
      active: formData.active as ActiveStatus,
      description: formData.description,
      jsonSchema: formData.jsonSchema,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setProcedures([...procedures, newProcedure]);
    
    // Reset form
    setFormData({
      code: '',
      sector: '',
      version: '',
      active: '',
      description: '',
      jsonSchema: ''
    });
  };

  const columns = [
    { key: 'code', label: 'Code' },
    { key: 'sector', label: 'Sector' },
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
          <FormCard title="Add LUC Procedure">
            <p className="card-text form-label text-start mt-2 mb-4">
              Fill the form for adding a new LUC Procedure.
            </p>
            <form onSubmit={handleSubmit}>
              <div className="row mb-3">
                <div className="col-md-3">
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
                <div className="col-md-3">
                  <label htmlFor="sector" className="form-label">Sector</label>
                  <select
                    id="sector"
                    className="form-select"
                    value={formData.sector}
                    onChange={(e) => setFormData({ ...formData, sector: e.target.value as SectorType })}
                    required
                  >
                    <option value="">Select</option>
                    <option value="EVALUATION">Evaluation</option>
                    <option value="PLANNING">Planning</option>
                    <option value="MISSION">Mission</option>
                  </select>
                </div>
                <div className="col-md-3">
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
                <div className="col-md-3">
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
                    placeholder="Enter JSON schema..."
                  />
                </div>
                <div className="col-md-4 d-flex align-items-end">
                  <button type="submit" className="btn btn-primary w-100">
                    Add New Procedure
                  </button>
                </div>
              </div>
            </form>
          </FormCard>
        </div>
      </div>

      <div className="row">
        <div className="col-md-12 col-lg-12">
          <DataTable
            columns={columns}
            data={procedures}
            title="LUC Procedure List"
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