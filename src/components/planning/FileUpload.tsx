'use client';
import axios from 'axios';
import { FileText, Upload, X } from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

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
  disabled?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({
  evaluationId,
  clientId,
  files,
  onFileAdded,
  onFileRemoved,
  isDark = false,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const [description, setDescription] = useState('');
  const [version, setVersion] = useState('1.0');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) {
      e.preventDefault();
      toast.error(t('planning.files.pleaseCreateFirst'));
      e.target.value = '';
      return;
    }
    if (e.target.files && e.target.files[0]) setSelectedFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (disabled) {
      toast.error(t('planning.files.pleaseCreateFirst'));
      return;
    }
    if (!selectedFile || !description) {
      toast.error(t('planning.files.provideDescFile'));
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

      const response = await axios.post('/api/evaluation/new-req/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (!response.data.success) throw new Error(t('planning.files.uploadFailed'));

      onFileAdded(response.data.file);
      setDescription('');
      setVersion('1.0');
      setSelectedFile(null);
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      toast.success(t('planning.files.fileUploadSuccess'));
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(t('planning.files.fileUploadError'));
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async (fileId: number) => {
    try {
      const response = await axios.delete(`/api/evaluation/new-req/files/${fileId}`);
      if (!response.data.success) throw new Error(t('planning.files.deleteFailed'));
      onFileRemoved(fileId);
      toast.success(t('planning.files.fileRemoveSuccess'));
    } catch (error) {
      console.error('Error removing file:', error);
      toast.error(t('planning.files.fileRemoveError'));
    }
  };

  const inputClass = `w-full px-3 py-2 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
    isDark
      ? 'bg-gray-800 border-gray-600 text-gray-100 placeholder:text-gray-500'
      : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'
  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`;

  const labelClass = `block text-xs font-semibold uppercase tracking-wider mb-1.5 ${
    isDark ? 'text-gray-400' : 'text-gray-500'
  }`;

  const canUpload = !uploading && !disabled && !!selectedFile && !!description;

  return (
    <div className="space-y-5">
      {files.length > 0 && (
        <div className={`rounded-xl border ${isDark ? 'border-gray-700/60 bg-gray-900/50' : 'border-gray-200 bg-gray-50'} p-4`}>
          <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
            <FileText size={15} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
            {t('planning.files.attached')}
            <span className={`ml-auto text-xs font-normal px-2 py-0.5 rounded-full ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'}`}>
              {files.length}
            </span>
          </h3>
          <div className="space-y-2">
            {files.map(file => (
              <div
                key={file.id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  isDark ? 'bg-gray-800 border-gray-700/60' : 'bg-white border-gray-200'
                }`}
              >
                <div className={`flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg ${
                  isDark ? 'bg-blue-500/15' : 'bg-blue-50'
                }`}>
                  <FileText size={16} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                    {file.filename}
                  </p>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    {file.description} · v{file.version} · {new Date(file.upload_date).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleRemove(file.id)}
                  className={`cursor-pointer flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                    isDark ? 'text-gray-500 hover:text-red-400 hover:bg-red-500/15' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                  }`}
                  title={t('planning.files.removeFile')}
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={`rounded-xl border ${isDark ? 'border-gray-700/60' : 'border-gray-200'} p-4`}>
        <h3 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
          <Upload size={15} className={isDark ? 'text-violet-400' : 'text-violet-600'} />
          {t('planning.files.addNew')}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="file-description" className={labelClass}>{t('planning.files.description')}</label>
            <input
              type="text"
              id="file-description"
              value={description}
              onChange={(e) => {
                if (disabled) {
                  toast.error(t('planning.files.pleaseCreateFirst'));
                  return;
                }
                setDescription(e.target.value);
              }}
              onFocus={() => {
                if (disabled) toast.error(t('planning.files.pleaseCreateFirst'));
              }}
              className={`${inputClass} cursor-text`}
              placeholder={t('planning.files.enterDesc')}
              readOnly={disabled}
            />
          </div>

          <div>
            <label htmlFor="file-version" className={labelClass}>{t('planning.files.version')}</label>
            <input
              type="text"
              id="file-version"
              value={version}
              onChange={(e) => {
                if (disabled) return;
                setVersion(e.target.value);
              }}
              className={`${inputClass} cursor-text`}
              placeholder="1.0"
              readOnly={disabled}
            />
          </div>

          <div>
            <label htmlFor="file-input" className={labelClass}>{t('planning.files.file')}</label>
            <input
              type="file"
              id="file-input"
              onChange={handleFileChange}
              onClick={(e) => {
                if (disabled) {
                  e.preventDefault();
                  toast.error(t('planning.files.pleaseCreateFirst'));
                }
              }}
              className={`${inputClass} cursor-pointer file:mr-3 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-medium ${
                isDark
                  ? 'file:bg-gray-700 file:text-gray-300 hover:file:bg-gray-600'
                  : 'file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200'
              }`}
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleUpload}
              disabled={!canUpload}
              className={`cursor-pointer w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                canUpload
                  ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm hover:shadow'
                  : isDark
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {uploading ? (
                <>
                  <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t('planning.files.uploading')}
                </>
              ) : (
                <>
                  <Upload size={15} />
                  {t('planning.files.addFile')}
                </>
              )}
            </button>
          </div>
        </div>

        {selectedFile && !disabled && (
          <p className={`mt-3 text-xs flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            <FileText size={12} />
            {selectedFile.name} <span className="opacity-60">({(selectedFile.size / 1024).toFixed(2)} KB)</span>
          </p>
        )}
      </div>
    </div>
  );
};

export default FileUpload;