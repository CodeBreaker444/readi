'use client';
import axios from 'axios';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { useTheme } from '../useTheme';
import AreaTable from './AreaTable';
import EvaluationForm from './EvaluationForm';
import FileUpload from './FileUpload';
import MapDrawing from './MapDrawing';

interface DrawnArea {
  id: string;
  type: 'polygon' | 'circle' | 'rectangle';
  area: number;
  center: { lat: number; lng: number };
  geoJSON: any;
}

interface EvaluationFile {
  id: number;
  description: string;
  version: string;
  filename: string;
  upload_date: string;
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

const EvaluationRequest: React.FC = () => {
  const { isDark } = useTheme();
  const [drawnAreas, setDrawnAreas] = useState<DrawnArea[]>([]);
  const [evaluationId, setEvaluationId] = useState<number | null>(null);
  const [clientId, setClientId] = useState<number | null>(null);
  const [files, setFiles] = useState<EvaluationFile[]>([]);
  const [showFileUpload, setShowFileUpload] = useState(false);

  const handleAreasChange = (areas: DrawnArea[]) => setDrawnAreas(areas);

  const handleFormSubmit = async (formData: EvaluationFormData) => {
    try {
      if (drawnAreas.length === 0) {
        toast.error('Please draw at least one operational area on the map');
        return;
      }

      const areasData = drawnAreas.map(area => ({
        type: area.type,
        area_sqm: area.area,
        center_lat: area.center.lat,
        center_lng: area.center.lng,
        geojson: area.geoJSON,
      }));

      const response = await axios.post('/api/evaluation/create', {
        data: { ...formData, areas: areasData },
      });

      if (!response.data) {
        toast.error(response.data?.message || 'Failed to create evaluation');
        return;
      }

      const result = response.data;
      setEvaluationId(result.evaluation_id);
      setClientId(formData.client_id);
      setShowFileUpload(true);
      toast.success('Evaluation request created successfully');
    } catch (error) {
      console.error('Error creating evaluation:', error);
      toast.error(error instanceof Error ? error.message : 'Error creating evaluation request');
    }
  };

  const handleFileAdded = (file: EvaluationFile) => setFiles(prev => [...prev, file]);
  const handleFileRemoved = (fileId: number) => setFiles(prev => prev.filter(f => f.id !== fileId));
  const handleEditArea = (id: string) => console.log('Edit area:', id);
  const handleDeleteArea = (id: string) => setDrawnAreas(prev => prev.filter(area => area.id !== id));

  const bg = isDark ? 'bg-gray-950' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-gray-900 border-gray-700/60' : 'bg-white border-gray-200';
  const headingColor = isDark ? 'text-gray-100' : 'text-gray-900';
  const subColor = isDark ? 'text-gray-400' : 'text-gray-500';
  const dividerColor = isDark ? 'border-gray-700/60' : 'border-gray-200';

  return (
    <div className={`min-h-screen  ${bg} transition-colors duration-200`}>
      <div className={`top-0 z-10 backdrop-blur-md transition-colors ${isDark
          ? "bg-slate-900/80 border-b border-slate-800 text-white"
          : "bg-white/80 border-b border-slate-200 text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
        } px-6 py-4 mb-8`}>
        <div className="mx-auto max-w-[1800px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 rounded-full bg-violet-600" />
            <div>
              <h1 className={`text-sm font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                Planning · New Evaluation Request
              </h1>
              <p className={`text-[11px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                Create a new operational scenario evaluation request
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className={`rounded-xl shadow-sm border ${cardBg} overflow-hidden`}>
          <div className={`px-5 py-4 border-b ${dividerColor} flex items-center gap-3`}>
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A2 2 0 013 15.382V5.618a2 2 0 012.553-1.894L9 5m0 15l6-3m-6 3V5m6 15l4.447 2.224A2 2 0 0021 18.382V8.618a2 2 0 00-2.553-1.894L15 8m0 12V8m0 0L9 5" />
              </svg>
            </span>
            <div>
              <h2 className={`text-base font-semibold ${headingColor}`}>Operational Scenario</h2>
              <p className={`text-xs ${subColor}`}>Draw your Operation Area on the map</p>
            </div>
          </div>
          <div className="p-4">
            <MapDrawing onAreasChange={handleAreasChange} isDark={isDark} />
            <AreaTable areas={drawnAreas} onEdit={handleEditArea} onDelete={handleDeleteArea} isDark={isDark} />
          </div>
        </div>

        <div className={`rounded-xl shadow-sm border ${cardBg} overflow-hidden`}>
          <div className={`px-5 py-4 border-b ${dividerColor} flex items-center gap-3`}>
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </span>
            <div>
              <h2 className={`text-base font-semibold ${headingColor}`}>New Evaluation Request</h2>
              <p className={`text-xs ${subColor}`}>Fill the form to add a new evaluation request</p>
            </div>
          </div>
          <div className="p-5">
            <EvaluationForm onSubmit={handleFormSubmit} isDark={isDark} />
          </div>
        </div>
      </div>

      {showFileUpload && evaluationId && clientId && (
        <div className={`rounded-xl shadow-sm border ${cardBg} overflow-hidden`}>
          <div className={`px-5 py-4 border-b ${dividerColor} flex items-center gap-3`}>
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-500/10 text-violet-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </span>
            <div>
              <h2 className={`text-base font-semibold ${headingColor}`}>Evaluation Files</h2>
              <p className={`text-xs ${subColor}`}>Upload supporting documents for this evaluation</p>
            </div>
          </div>
          <div className="p-5">
            <FileUpload
              evaluationId={evaluationId}
              clientId={clientId}
              files={files}
              onFileAdded={handleFileAdded}
              onFileRemoved={handleFileRemoved}
              isDark={isDark}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default EvaluationRequest;