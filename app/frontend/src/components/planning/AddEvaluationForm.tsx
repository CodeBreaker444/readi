'use client';
import React, { useEffect, useState } from 'react';

interface Client {
  id: number;
  name: string;
}

interface LUCProcedure {
  id: number;
  name: string;
}

interface AddEvaluationFormData {
  fk_client_id: number;
  fk_luc_procedure_id: number;
  evaluation_status: string;
  evaluation_request_date: string;
  evaluation_year: number;
  evaluation_desc: string;
  evaluation_offer: string;
  evaluation_sale_manager: string;
  evaluation_result: string;
}

interface AddEvaluationFormProps {
  onSubmit: (data: AddEvaluationFormData) => Promise<void>;
  isDark?: boolean;
}

const AddEvaluationForm: React.FC<AddEvaluationFormProps> = ({ onSubmit, isDark = false }) => {
  const currentYear = new Date().getFullYear();
  
  const [formData, setFormData] = useState<AddEvaluationFormData>({
    fk_client_id: 0,
    fk_luc_procedure_id: 0,
    evaluation_status: 'NEW',
    evaluation_request_date: new Date().toISOString().split('T')[0],
    evaluation_year: currentYear,
    evaluation_desc: '',
    evaluation_offer: '',
    evaluation_sale_manager: '',
    evaluation_result: 'PROCESSING'
  });

  const [clients, setClients] = useState<Client[]>([]);
  const [lucProcedures, setLUCProcedures] = useState<LUCProcedure[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadClients();
    loadLUCProcedures();
  }, []);

  const loadClients = async () => {
    try {
      const response = await fetch('/api/clients');
      const data = await response.json();
      setClients(data);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadLUCProcedures = async () => {
    try {
      const response = await fetch('/api/luc-procedures?type=EVALUATION');
      const data = await response.json();
      setLUCProcedures(data);
    } catch (error) {
      console.error('Error loading LUC procedures:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('_id') || name === 'evaluation_year' ? parseInt(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.fk_client_id === 0) {
      alert('Please select a client');
      return;
    }
    
    if (formData.fk_luc_procedure_id === 0) {
      alert('Please select a LUC procedure');
      return;
    }
    
    setLoading(true);
    try {
      await onSubmit(formData);
      
      // Reset form
      setFormData({
        fk_client_id: 0,
        fk_luc_procedure_id: 0,
        evaluation_status: 'NEW',
        evaluation_request_date: new Date().toISOString().split('T')[0],
        evaluation_year: currentYear,
        evaluation_desc: '',
        evaluation_offer: '',
        evaluation_sale_manager: '',
        evaluation_result: 'PROCESSING'
      });
    } finally {
      setLoading(false);
    }
  };

  const inputClass = `w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    isDark 
      ? 'bg-slate-700 border-slate-600 text-white' 
      : 'bg-white border-gray-300 text-gray-900'
  }`;

  const labelClass = `block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="fk_client_id" className={labelClass}>
            Client
          </label>
          <select
            id="fk_client_id"
            name="fk_client_id"
            value={formData.fk_client_id}
            onChange={handleChange}
            required
            className={inputClass}
          >
            <option value={0}>Select Client</option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="fk_luc_procedure_id" className={labelClass}>
            LUC Procedure
          </label>
          <select
            id="fk_luc_procedure_id"
            name="fk_luc_procedure_id"
            value={formData.fk_luc_procedure_id}
            onChange={handleChange}
            required
            className={inputClass}
          >
            <option value={0}>Select LUC Procedure for this Task</option>
            {lucProcedures.map(procedure => (
              <option key={procedure.id} value={procedure.id}>
                {procedure.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="evaluation_status" className={labelClass}>
            Status
          </label>
          <select
            id="evaluation_status"
            name="evaluation_status"
            value={formData.evaluation_status}
            onChange={handleChange}
            className={inputClass}
          >
            <option value="NEW">New Task</option>
          </select>
        </div>

        <div>
          <label htmlFor="evaluation_request_date" className={labelClass}>
            Request Date
          </label>
          <input
            type="date"
            id="evaluation_request_date"
            name="evaluation_request_date"
            value={formData.evaluation_request_date}
            onChange={handleChange}
            required
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="evaluation_year" className={labelClass}>
            Year Reference
          </label>
          <select
            id="evaluation_year"
            name="evaluation_year"
            value={formData.evaluation_year}
            onChange={handleChange}
            className={inputClass}
          >
            <option value={currentYear - 1}>{currentYear - 1}</option>
            <option value={currentYear}>{currentYear}</option>
            <option value={currentYear + 1}>{currentYear + 1}</option>
            <option value={currentYear + 2}>{currentYear + 2}</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="evaluation_desc" className={labelClass}>
            Description
          </label>
          <input
            type="text"
            id="evaluation_desc"
            name="evaluation_desc"
            value={formData.evaluation_desc}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="evaluation_offer" className={labelClass}>
            Offer Ref
          </label>
          <input
            type="text"
            id="evaluation_offer"
            name="evaluation_offer"
            value={formData.evaluation_offer}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="evaluation_sale_manager" className={labelClass}>
            Sales Manager
          </label>
          <input
            type="text"
            id="evaluation_sale_manager"
            name="evaluation_sale_manager"
            value={formData.evaluation_sale_manager}
            onChange={handleChange}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex justify-start">
        <button
          type="submit"
          disabled={loading}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            loading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {loading ? 'Adding...' : 'Add New Evaluation'}
        </button>
      </div>
    </form>
  );
};

export default AddEvaluationForm;