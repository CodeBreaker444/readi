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
import { useTranslation } from 'react-i18next';
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

export interface EvaluationFormData {
  client_id: number;
  fk_luc_procedure_id: number;
  evaluation_status: string;
  evaluation_request_date: string;
  evaluation_year: number;
  evaluation_description: string;
  evaluation_offer: string;
  evaluation_sale_manager: string;
  evaluation_result: string;
}

interface EvaluationFormProps {
  onSubmit: (data: EvaluationFormData) => void;
  isDark?: boolean;
}

const EvaluationForm: React.FC<EvaluationFormProps> = ({ onSubmit, isDark }) => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  const [formData, setFormData] = useState<EvaluationFormData>({
    client_id: 0,
    fk_luc_procedure_id: 0,
    evaluation_status: 'NEW',
    evaluation_request_date: new Date().toISOString().split('T')[0],
    evaluation_year: currentYear,
    evaluation_description: '',
    evaluation_offer: '',
    evaluation_sale_manager: '',
    evaluation_result: 'PROCESSING',
  });

  const [clients, setClients] = useState<Client[]>([]);
  const [lucProcedures, setLUCProcedures] = useState<LUCProcedure[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsDataLoading(true);
      await Promise.all([loadClients(), loadLUCProcedures()]);
      setIsDataLoading(false);
    };
    fetchData();
  }, []);

  const loadClients = async () => {
    try {
      const response = await axios.get('/api/client/list');
      if (!response.data) { toast.error(t('planning.validation.loadClientsError')); return; }
      const clientList = (response.data.data || []).map((c: any) => ({
        id: c.client_id,
        name: c.client_name,
      }));
      setClients(clientList);
    } catch (error) {
      console.error('Error loading clients:', error);
      toast.error(t('planning.validation.loadClientsError'));
    }
  };

  const loadLUCProcedures = async () => {
    try {
      const response = await axios.get('/api/luc-procedures/list?sector=EVALUATION');
      if (!response.data) { toast.error(t('planning.validation.loadProceduresError')); return; }
      setLUCProcedures(response.data.procedures || []);
    } catch (error) {
      console.error('Error loading procedures:', error);
      toast.error(t('planning.validation.loadProceduresError'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.client_id === 0) {
      toast.error(t('planning.validation.selectClient'));
      return;
    }
    if (formData.fk_luc_procedure_id === 0) {
      toast.error(t('planning.validation.selectLucProcedure'));
      return;
    }
    if (!formData.evaluation_description.trim()) {
      toast.error(t('planning.validation.enterDescription'));
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
    } finally {
      setLoading(false);
    }
  };

  const labelClass = `text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-700'}`;
  const inputClass = `cursor-text ${isDark ? 'bg-gray-800 border-gray-600 text-gray-100 placeholder:text-gray-500 focus:border-blue-500' : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-blue-500'}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className={labelClass}>
            {t('planning.form.client')} <span className="text-red-500">*</span>
          </Label>
          <Select
            value={formData.client_id ? String(formData.client_id) : undefined}
            onValueChange={(value) => setFormData(prev => ({ ...prev, client_id: Number(value) }))}
            disabled={isDataLoading}
          >
            <SelectTrigger className={`cursor-pointer ${inputClass} ${isDark ? 'bg-gray-800 border-gray-700 text-gray-100' : ''}`}>
              {isDataLoading ? (
                <span className="text-gray-400 animate-pulse">{t('planning.form.loadingClients')}</span>
              ) : (
                <SelectValue placeholder={t('planning.form.selectClient')} />
              )}
            </SelectTrigger>
            <SelectContent className={isDark ? 'bg-gray-800 border-gray-700 text-gray-100' : ''}>
              {clients.map(client => (
                <SelectItem key={client.id} value={String(client.id)} className="cursor-pointer">
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className={labelClass}>
            {t('planning.form.lucProcedure')} <span className="text-red-500">*</span>
          </Label>
          <Select
            value={formData.fk_luc_procedure_id ? String(formData.fk_luc_procedure_id) : undefined}
            onValueChange={(value) => setFormData(prev => ({ ...prev, fk_luc_procedure_id: Number(value) }))}
            disabled={isDataLoading}
          >
            <SelectTrigger className={`cursor-pointer ${inputClass}`}>
              {isDataLoading ? (
                <span className="text-gray-400 animate-pulse">{t('planning.form.loadingProcedures')}</span>
              ) : (
                <SelectValue placeholder={t('planning.form.selectLucProcedure')} />
              )}
            </SelectTrigger>
            <SelectContent className={isDark ? 'bg-gray-800 border-gray-700 text-gray-100' : ''}>
              {lucProcedures.map(procedure => (
                <SelectItem key={procedure.id} value={String(procedure.id)} className="cursor-pointer">
                  {procedure.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className={labelClass}>{t('planning.form.status')}</Label>
          <Select
            value={formData.evaluation_status}
            onValueChange={(value) => setFormData(prev => ({ ...prev, evaluation_status: value }))}
          >
            <SelectTrigger className={`cursor-pointer ${inputClass}`}>
              <SelectValue placeholder={t('planning.form.selectStatus')} />
            </SelectTrigger>
            <SelectContent className={isDark ? 'bg-gray-800 border-gray-700 text-gray-100' : ''}>
              <SelectItem value="NEW" className="cursor-pointer">{t('planning.status.newTask')}</SelectItem>
              <SelectItem value="IN_PROGRESS" className="cursor-pointer">{t('planning.status.inProgress')}</SelectItem>
              <SelectItem value="COMPLETED" className="cursor-pointer">{t('planning.status.done')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className={labelClass}>
            {t('planning.form.requestDate')} <span className="text-red-500">*</span>
          </Label>
          <Input
            type="date"
            className={`cursor-pointer ${inputClass}`}
            value={formData.evaluation_request_date}
            onChange={(e) => setFormData(prev => ({ ...prev, evaluation_request_date: e.target.value }))}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label className={labelClass}>{t('planning.form.yearReference')}</Label>
          <Select
            value={String(formData.evaluation_year)}
            onValueChange={(value) => setFormData(prev => ({ ...prev, evaluation_year: Number(value) }))}
          >
            <SelectTrigger className={`cursor-pointer ${inputClass}`}>
              <SelectValue placeholder={t('planning.form.selectYear')} />
            </SelectTrigger>
            <SelectContent className={isDark ? 'bg-gray-800 border-gray-700 text-gray-100' : ''}>
              {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map(y => (
                <SelectItem key={y} value={String(y)} className="cursor-pointer">{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className={labelClass}>
          {t('planning.form.description')} <span className="text-red-500">*</span>
        </Label>
        <Textarea
          rows={4}
          placeholder={t('planning.form.descriptionPlaceholder')}
          className={`cursor-text resize-none ${inputClass}`}
          value={formData.evaluation_description}
          onChange={(e) => setFormData(prev => ({ ...prev, evaluation_description: e.target.value }))}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className={labelClass}>{t('planning.form.offerReference')}</Label>
          <Input
            type="text"
            placeholder={t('planning.form.offerRefPlaceholder')}
            className={`cursor-text ${inputClass}`}
            value={formData.evaluation_offer}
            onChange={(e) => setFormData(prev => ({ ...prev, evaluation_offer: e.target.value }))}
          />
        </div>

        <div className="space-y-1.5">
          <Label className={labelClass}>{t('planning.form.salesManager')}</Label>
          <Input
            type="text"
            placeholder={t('planning.form.namePlaceholder')}
            className={`cursor-text ${inputClass}`}
            value={formData.evaluation_sale_manager}
            onChange={(e) => setFormData(prev => ({ ...prev, evaluation_sale_manager: e.target.value }))}
          />
        </div>
      </div>

      <div className="pt-1">
        <Button
          type="submit"
          disabled={loading}
          className="cursor-pointer w-full md:w-auto bg-violet-600 hover:bg-violet-500 text-white font-medium px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {t('planning.actions.adding')}
            </span>
          ) : t('planning.actions.addNewEvaluation')}
        </Button>
      </div>
    </form>
  );
};

export default EvaluationForm;