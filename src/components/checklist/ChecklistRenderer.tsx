'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Model } from 'survey-core';
import 'survey-core/survey-core.min.css';
import { Survey } from 'survey-react-ui';

interface ChecklistRendererProps {
  checklistJson: string | object;
  userFullname?: string;
  userEmail?: string;
  onComplete?: (survey: Model) => void;
  isDark?: boolean;
}

export function ChecklistRenderer({
  checklistJson,
  userFullname = '',
  userEmail = '',
  onComplete,
  isDark = false,
}: ChecklistRendererProps) {
  const [surveyModel, setSurveyModel] = useState<Model | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    try {
      const jsonSchema = typeof checklistJson === 'string' 
        ? JSON.parse(checklistJson) 
        : checklistJson;

      const survey = new Model(jsonSchema);

      survey.applyTheme({
        colorPalette: isDark ? 'dark' : 'light',
        isPanelless: false,
      });

      if (userFullname) survey.setValue('user_fullname', userFullname);
      if (userEmail) survey.setValue('email', userEmail);

      if (onComplete) {
        survey.onComplete.add((sender) => onComplete(sender));
      }

      setSurveyModel(survey);
    } catch (error) {
      console.error('Error rendering checklist:', error);
    }
  }, [checklistJson, userFullname, userEmail, onComplete, isDark]);

  if (!surveyModel) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6 space-y-6 animate-pulse">
        <div className="space-y-3">
          <div className="h-8 bg-gray-200 rounded-md w-3/4"></div>
          <div className="h-4 bg-gray-100 rounded-md w-1/2"></div>
        </div>

        {[1, 2, 3].map((i) => (
          <div key={i} className="p-6 border border-gray-100 rounded-lg space-y-4">
            <div className="h-5 bg-gray-200 rounded w-1/3"></div>
            <div className="space-y-2">
              <div className="h-10 bg-gray-50 rounded w-full"></div>
            </div>
          </div>
        ))}

        <div className="flex justify-end">
          <div className="h-10 bg-gray-200 rounded-md w-24"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`checklist-container ${isDark ? 'survey-dark' : ''}`}>
      <Survey model={surveyModel} />
    </div>
  );
}