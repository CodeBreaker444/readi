'use client';
import { FileText, Upload, X } from 'lucide-react';
import React, { useState } from 'react';

interface EvaluationFile {
  id: number;
  description: string;
  version: string;
  filename: string;
  upload_date: string;
}

interface FileUploadProps {
  evaluationId: number;
  clientId: number;
  files: EvaluationFile[];
  onFileAdded: (file: EvaluationFile) => void;
  onFileRemoved: (fileId: number) => void;
  isDark?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({
  evaluationId,
  clientId,
  files,
  onFileAdded,
  onFileRemoved,
  isDark = false
}) => {
  const [description, setDescription] = useState('');
  const [version, setVersion] = useState('1.0');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !description) {
      alert('Please provide a description and select a file');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('description', description);
      formData.append('version', version);
      formData.append('evaluation_id', evaluationId.toString());
      formData.append('client_id', clientId.toString());

      const response = await fetch('/api/evaluation/files/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload file');
      }

      const result = await response.json();
      onFileAdded(result.file);

      setDescription('');
      setVersion('1.0');
      setSelectedFile(null);

      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      alert('File uploaded successfully');

    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async (fileId: number) => {
    if (!confirm('Are you sure you want to remove this file?')) return;

    try {
      const response = await fetch(`/api/evaluation/files/${fileId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to remove file');
      }

      onFileRemoved(fileId);
      alert('File removed successfully');

    } catch (error) {
      console.error('Error removing file:', error);
      alert('Error removing file');
    }
  };



  return (
    <div className="space-y-4">
      {files.length > 0 && (
        <div className={`${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} rounded-lg border p-4`}>
          <h3 className={`text-sm font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Attached Files
          </h3>
          <div className="space-y-2">
            {files.map(file => (
              <div
                key={file.id}
                className={`flex items-center justify-between p-3 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-gray-50'
                  }`}
              >
                <div className="flex items-center space-x-3 flex-1">
                  <FileText className={isDark ? 'text-blue-400' : 'text-blue-600'} size={20} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {file.filename}
                    </p>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {file.description} • v{file.version} • {new Date(file.upload_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(file.id)}
                  className="ml-2 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900 transition-colors"
                  title="Remove file"
                >
                  <X className="text-red-600" size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={`${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} rounded-lg border p-4`}>
        <h3 className={`text-sm font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Add New File
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="file-description" className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              File Description
            </label>
            <input
              type="text"
              id="file-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark
                  ? 'bg-slate-700 border-slate-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
                }`}
              placeholder="Enter description"
            />
          </div>

          <div>
            <label htmlFor="file-version" className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Version
            </label>
            <input
              type="text"
              id="file-version"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark
                  ? 'bg-slate-700 border-slate-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
                }`}
              placeholder="1.0"
            />
          </div>

          <div>
            <label htmlFor="file-input" className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              File
            </label>
            <input
              type="file"
              id="file-input"
              onChange={handleFileChange}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark
                  ? 'bg-slate-700 border-slate-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
                }`}
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading || !selectedFile || !description}
              className={`w-full px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 ${uploading || !selectedFile || !description
                  ? 'bg-gray-400 cursor-not-allowed text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
            >
              <Upload size={16} />
              <span>{uploading ? 'Uploading...' : 'Add File'}</span>
            </button>
          </div>
        </div>

        {selectedFile && (
          <p className={`mt-2 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
          </p>
        )}
      </div>
    </div>
  );
};

export default FileUpload;