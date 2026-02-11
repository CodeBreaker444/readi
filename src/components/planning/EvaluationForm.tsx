'use client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Client {
  id: number;
  name: string;
}

interface LUCProcedure {
  id: number;
  name: string;
}

interface EvaluationFormData {
  client_id: number;
  fk_luc_procedure_id: number;
  evaluation_status: string;
  evaluation_request_date: string;
  evaluation_year: number;
  evaluation_desc: string;
  evaluation_offer: string;
  evaluation_sale_manager: string;
  evaluation_result: string;
}

interface EvaluationFormProps {
  onSubmit: (data: EvaluationFormData) => void;
  isDark?: boolean;
}

const EvaluationForm: React.FC<EvaluationFormProps> = ({ onSubmit, isDark }) => {

  const currentYear = new Date().getFullYear();

  const [formData, setFormData] = useState<EvaluationFormData>({
    client_id: 0,
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
      const response = await axios.get('/api/client/list');
      if (!response.data) {
        toast.error('Failed to load clients');
        return;
      }
      const data = await response.data
      setClients(data.clients || []);
    } catch (error) {
      console.error('Error loading clients:', error);
      toast.error('Failed to load clients');
    }
  };

  const loadLUCProcedures = async () => {
    try {
      const response = await axios.get('/api/luc-procedures/list?sector=EVALUATION');
      if (!response.data) {
        toast.error('Failed to load LUC procedures');
        return;
      }
      const data = await response.data;
      setLUCProcedures(data.procedures || []);
    } catch (error) {
      console.error('Error loading LUC procedures:', error);
      toast.error('Failed to load LUC procedures');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('id') || name === 'evaluation_year' ? parseInt(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.client_id === 0) {
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
    } finally {
      setLoading(false);
    }
  };


  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>
            Client <span className="text-red-500">*</span>
          </Label>
          <Select
            value={formData.client_id ? String(formData.client_id) : undefined}
            onValueChange={(value) =>
              setFormData(prev => ({
                ...prev,
                client_id: Number(value),
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Client" />
            </SelectTrigger>
            <SelectContent>
              {clients.map(client => (
                <SelectItem
                  key={client.id}
                  value={String(client.id)}
                >
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>
            LUC Procedure <span className="text-red-500">*</span>
          </Label>
          <Select
            value={formData.fk_luc_procedure_id ? String(formData.fk_luc_procedure_id) : undefined}
            onValueChange={(value) =>
              setFormData(prev => ({
                ...prev,
                fk_luc_procedure_id: Number(value),
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select LUC Procedure" />
            </SelectTrigger>
            <SelectContent>
              {lucProcedures.map(procedure => (
                <SelectItem
                  key={procedure.id}
                  value={String(procedure.id)}
                >
                  {procedure.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={formData.evaluation_status}
            onValueChange={(value) =>
              setFormData(prev => ({
                ...prev,
                evaluation_status: value,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NEW">New Task</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>
            Request Date <span className="text-red-500">*</span>
          </Label>
          <Input
            type="date"
            value={formData.evaluation_request_date}
            onChange={(e) =>
              setFormData(prev => ({
                ...prev,
                evaluation_request_date: e.target.value,
              }))
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Year Reference</Label>
          <Select
            value={String(formData.evaluation_year)}
            onValueChange={(value) =>
              setFormData(prev => ({
                ...prev,
                evaluation_year: Number(value),
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={String(currentYear - 1)}>
                {currentYear - 1}
              </SelectItem>
              <SelectItem value={String(currentYear)}>
                {currentYear}
              </SelectItem>
              <SelectItem value={String(currentYear + 1)}>
                {currentYear + 1}
              </SelectItem>
              <SelectItem value={String(currentYear + 2)}>
                {currentYear + 2}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>
          Description <span className="text-red-500">*</span>
        </Label>
        <Textarea
          rows={4}
          placeholder="Enter evaluation description..."
          value={formData.evaluation_desc}
          onChange={(e) =>
            setFormData(prev => ({
              ...prev,
              evaluation_desc: e.target.value,
            }))
          }
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Offer Reference</Label>
          <Input
            type="text"
            placeholder="Enter offer reference"
            value={formData.evaluation_offer}
            onChange={(e) =>
              setFormData(prev => ({
                ...prev,
                evaluation_offer: e.target.value,
              }))
            }
          />
        </div>

        <div className="space-y-2">
          <Label>Sales Manager</Label>
          <Input
            type="text"
            placeholder="Enter sales manager name"
            value={formData.evaluation_sale_manager}
            onChange={(e) =>
              setFormData(prev => ({
                ...prev,
                evaluation_sale_manager: e.target.value,
              }))
            }
          />
        </div>
      </div>

      <div>
        <Button
          type="submit"
          disabled={loading}
          className="w-full md:w-auto"
        >
          {loading ? "Adding..." : "Add New Evaluation"}
        </Button>
      </div>
    </form>
  )
};

export default EvaluationForm;