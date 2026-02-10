'use client';
import React, { useEffect, useState } from 'react';

interface LUCProcedure {
  id: number;
  name: string;
}

interface Evaluation {
  id: number;
  code: string;
  description: string;
}

interface AddPlanningFormData {
  fk_luc_procedure_id: number;
  fk_evaluation_id: number;
  planning_folder: string;
  planning_status: string;
  planning_request_date: string;
  planning_year: number;
  planning_desc: string;
  planning_type: string;
  planning_ver: string;
  planning_result: string;
}

interface AddPlanningFormProps {
  onSubmit: (data: AddPlanningFormData) => Promise<void>;
  isDark?: boolean;
}

const AddPlanningForm: React.FC<AddPlanningFormProps> = ({ onSubmit, isDark = false }) => {
  const currentYear = new Date().getFullYear();
  
  const [formData, setFormData] = useState<AddPlanningFormData>({
    fk_luc_procedure_id: 0,
    fk_evaluation_id: 0,
    planning_folder: '',
    planning_status: 'NEW',
    planning_request_date: new Date().toISOString().split('T')[0],
    planning_year: currentYear,
    planning_desc: '',
    planning_type: '',
    planning_ver: '1.0',
    planning_result: 'PROGRESS'
  });

  const [lucProcedures, setLUCProcedures] = useState<LUCProcedure[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadLUCProcedures();
    loadEvaluations();
  }, []);

  const loadLUCProcedures = async () => {
    try {
      const response = await fetch('/api/luc-procedures?type=PLANNING');
      const data = await response.json();
      setLUCProcedures(data);
    } catch (error) {
      console.error('Error loading LUC procedures:', error);
    }
  };

  const loadEvaluations = async () => {
    try {
      const response = await fetch('/api/evaluations');
      const data = await response.json();
      setEvaluations(data);
    } catch (error) {
      console.error('Error loading evaluations:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('_id') || name === 'planning_year' ? parseInt(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.fk_luc_procedure_id === 0) {
      alert('Please select a LUC procedure');
      return;
    }
    
    if (formData.fk_evaluation_id === 0) {
      alert('Please select an evaluation');
      return;
    }
    
    setLoading(true);
    try {
      await onSubmit(formData);
      
      // Reset form
      setFormData({
        fk_luc_procedure_id: 0,
        fk_evaluation_id: 0,
        planning_folder: '',
        planning_status: 'NEW',
        planning_request_date: new Date().toISOString().split('T')[0],
        planning_year: currentYear,
        planning_desc: '',
        planning_type: '',
        planning_ver: '1.0',
        planning_result: 'PROGRESS'
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

        <div>
          <label htmlFor="fk_evaluation_id" className={labelClass}>
            Evaluation Code
          </label>
          <select
            id="fk_evaluation_id"
            name="fk_evaluation_id"
            value={formData.fk_evaluation_id}
            onChange={handleChange}
            required
            className={inputClass}
          >
            <option value={0}>Select the Evaluation for this Task</option>
            {evaluations.map(evaluation => (
              <option key={evaluation.id} value={evaluation.id}>
                {evaluation.code} - {evaluation.description}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="planning_folder" className={labelClass}>
            Folder Docs
          </label>
          <input
            type="text"
            id="planning_folder"
            name="planning_folder"
            value={formData.planning_folder}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="planning_status" className={labelClass}>
            Status
          </label>
          <select
            id="planning_status"
            name="planning_status"
            value={formData.planning_status}
            onChange={handleChange}
            className={inputClass}
          >
            <option value="NEW">New planning</option>
            <option value="PROCESSING">Under planning</option>
            <option value="REQ_FEEDBACK">Under Manager feedback</option>
            <option value="POSITIVE_RESULT">Completed Positive</option>
            <option value="NEGATIVE_RESULT">Completed Refused</option>
          </select>
        </div>

        <div>
          <label htmlFor="planning_request_date" className={labelClass}>
            Request Date
          </label>
          <input
            type="date"
            id="planning_request_date"
            name="planning_request_date"
            value={formData.planning_request_date}
            onChange={handleChange}
            required
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label htmlFor="planning_year" className={labelClass}>
            Year Reference
          </label>
          <select
            id="planning_year"
            name="planning_year"
            value={formData.planning_year}
            onChange={handleChange}
            className={inputClass}
          >
            <option value={currentYear - 1}>{currentYear - 1}</option>
            <option value={currentYear}>{currentYear}</option>
            <option value={currentYear + 1}>{currentYear + 1}</option>
            <option value={currentYear + 2}>{currentYear + 2}</option>
          </select>
        </div>

        <div>
          <label htmlFor="planning_desc" className={labelClass}>
            Description
          </label>
          <input
            type="text"
            id="planning_desc"
            name="planning_desc"
            value={formData.planning_desc}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="planning_type" className={labelClass}>
            Type
          </label>
          <input
            type="text"
            id="planning_type"
            name="planning_type"
            value={formData.planning_type}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="planning_ver" className={labelClass}>
            Version
          </label>
          <input
            type="text"
            id="planning_ver"
            name="planning_ver"
            value={formData.planning_ver}
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
          {loading ? 'Adding...' : 'Add New Planning'}
        </button>
      </div>
    </form>
  );
};

export default AddPlanningForm;