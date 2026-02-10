'use client';
import React, { useState } from 'react';
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

interface EvaluationRequestProps {
  isDark?: boolean;
}

const EvaluationRequest: React.FC<EvaluationRequestProps> = () => {
  const { isDark } = useTheme()
  const [drawnAreas, setDrawnAreas] = useState<DrawnArea[]>([]);
  const [evaluationId, setEvaluationId] = useState<number | null>(null);
  const [clientId, setClientId] = useState<number | null>(null);
  const [files, setFiles] = useState<EvaluationFile[]>([]);
  const [showFileUpload, setShowFileUpload] = useState(false);

  const handleAreasChange = (areas: DrawnArea[]) => {
    setDrawnAreas(areas);
  };

  const handleFormSubmit = async (formData: EvaluationFormData) => {
    try {
      // Prepare the complete payload including drawn areas
      const payload = {
        ...formData,
        areas: drawnAreas.map(area => ({
          type: area.type,
          area_sqm: area.area,
          center_lat: area.center.lat,
          center_lng: area.center.lng,
          geojson: JSON.stringify(area.geoJSON)
        }))
      };

      const response = await fetch('/api/evaluation/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        setEvaluationId(result.evaluation_id);
        setClientId(formData.client_id);
        setShowFileUpload(true);
        
        alert('Evaluation request created successfully!');
      } else {
        const error = await response.json();
        alert(`Error: ${error.message || 'Failed to create evaluation'}`);
      }
    } catch (error) {
      console.error('Error creating evaluation:', error);
      alert('Error creating evaluation request');
    }
  };

  const handleFileAdded = (file: EvaluationFile) => {
    setFiles(prev => [...prev, file]);
  };

  const handleFileRemoved = (fileId: number) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleEditArea = (id: string) => {
    // This would trigger the map to enter edit mode for this specific area
    console.log('Edit area:', id);
  };

  const handleDeleteArea = (id: string) => {
    setDrawnAreas(prev => prev.filter(area => area.id !== id));
  };

  return (
   <>
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
    {/* Left Column - Map */}
    <div>
      <div className={`rounded-lg shadow-sm border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
        <div className={`p-4 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Evaluation - Operational Scenario
          </h2>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Draw your Operation Area
          </p>
        </div>

        <div className="p-4">
          <MapDrawing onAreasChange={handleAreasChange} isDark={isDark} />
          <AreaTable
            areas={drawnAreas}
            onEdit={handleEditArea}
            onDelete={handleDeleteArea}
            isDark={isDark}
          />
        </div>
      </div>
    </div>

    {/* Right Column - Form */}
    <div>
      <div className={`rounded-lg shadow-sm border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
        <div className={`p-4 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            New Evaluation Request
          </h2>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Fill the form for adding a new evaluation request
          </p>
        </div>

        <div className="p-4">
          <EvaluationForm onSubmit={handleFormSubmit} isDark={isDark} />
        </div>
      </div>
    </div>
  </div>

  {/* File Upload Section */}
  {showFileUpload && evaluationId && clientId && (
    <div className="mt-6">
      <div className={`rounded-lg shadow-sm border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
        <div className={`p-4 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Evaluation Files
          </h2>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Upload supporting documents for this evaluation
          </p>
        </div>

        <div className="p-4">
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
    </div>
  )}
</>

  );
};

export default EvaluationRequest;