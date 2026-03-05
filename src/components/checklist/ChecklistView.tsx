'use client';

import axios from 'axios';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ChecklistRenderer } from './ChecklistRenderer';

interface ChecklistViewProps {
  checklistCode: string;
  ownerId: number;
  userFullname?: string;
  userEmail?: string;
  onComplete?: (data: any) => void;
  isDark?: boolean;
}

export function ChecklistView({
  checklistCode,
  ownerId,
  userFullname = '',
  userEmail = '',
  onComplete,
  isDark = false,
}: ChecklistViewProps) {
  const [checklistJson, setChecklistJson] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadChecklist();
  }, [checklistCode, ownerId]);

  const loadChecklist = async () => {
    setLoading(true);
    try {
      const res = await axios.post('/api/organization/checklist/data', {
        o_id: ownerId,
        checklist_code: checklistCode,
      });

      if (res.data.code === 1 && res.data.data) {
        const json = typeof res.data.data.checklist_json === 'string'
          ? res.data.data.checklist_json
          : JSON.stringify(res.data.data.checklist_json);
        setChecklistJson(json);
      } else {
        toast.error('Checklist not found');
      }
    } catch (error) {
      console.error('Error loading checklist:', error);
      toast.error('Failed to load checklist');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (survey: any) => {
    setSubmitting(true);
    try {
      const result = {
        checklist_data: survey.data,
        checklist_code: checklistCode,
      };

      const res = await axios.post('/api/organization/checklist/result', result);
      
      if (res.data.code === 1) {
        toast.success('Checklist completed successfully');
        if (onComplete) {
          onComplete(survey.data);
        }
      } else {
        toast.error('Failed to save checklist result');
      }
    } catch (error) {
      console.error('Error saving checklist:', error);
      toast.error('Failed to save checklist result');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">Loading checklist...</span>
      </div>
    );
  }

  if (!checklistJson) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-sm text-gray-500">No checklist data available</p>
      </div>
    );
  }

  return (
    <div className="checklist-view">
      <ChecklistRenderer
        checklistJson={checklistJson}
        userFullname={userFullname}
        userEmail={userEmail}
        onComplete={handleComplete}
        isDark={isDark}
      />
    </div>
  );
}