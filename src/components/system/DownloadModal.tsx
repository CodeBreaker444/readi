"use client";

import { useEffect, useState } from "react";

interface Attachment {
  attachment_id: number;
  file_name: string;
  file_type: string;
  file_size: number;
  file_description: string | null;
  uploaded_at: string;
  download_url: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  ticketId: number | null;
  isDark: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileIcon(type: string): string {
  if (type.startsWith("image/")) return "🖼️";
  if (type.includes("pdf")) return "📄";
  if (type.includes("word") || type.includes("document")) return "📝";
  if (type.includes("sheet") || type.includes("excel")) return "📊";
  if (type.includes("zip") || type.includes("archive")) return "📦";
  if (type.includes("video")) return "🎬";
  return "📎";
}

export function DownloadModal({ open, onClose, ticketId, isDark }: Props) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !ticketId) return;

    const fetchAttachments = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/system/maintenance/tickets/attachment?ticket_id=${ticketId}`);
        const json = await res.json();
        if (json.code === 1) {
          setAttachments(json.data ?? []);
        } else {
          setError(json.message ?? "Failed to load attachments");
        }
      } catch {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    };

    fetchAttachments();
  }, [open, ticketId]);

  if (!open) return null;

  const bg = isDark ? "bg-slate-800" : "bg-white";
  const overlay = "fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm";
  const border = isDark ? "border-slate-700" : "border-slate-200";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";

  return (
    <div className={overlay} onClick={onClose}>
      <div
        className={`${bg} rounded-xl border ${border} shadow-2xl w-full max-w-lg mx-4 animate-slide-up flex flex-col`}
        style={{ height: 'min(90vh, 580px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between px-5 py-4 border-b ${border}`}>
          <div>
            <h3 className={`text-sm font-semibold ${textPrimary}`}>
              Attachments
            </h3>
            <p className={`text-xs ${textSecondary}`}>
              Ticket #{ticketId}
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark ? "hover:bg-slate-700 text-slate-400" : "hover:bg-slate-100 text-slate-500"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className={`h-14 rounded-lg animate-pulse ${
                    isDark ? "bg-slate-700" : "bg-slate-100"
                  }`}
                />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-sm text-rose-500">{error}</p>
            </div>
          ) : attachments.length === 0 ? (
            <div className="text-center py-8">
              <svg
                className={`w-10 h-10 mx-auto mb-3 ${isDark ? "text-slate-600" : "text-slate-300"}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <p className={`text-sm ${textSecondary}`}>No attachments found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {attachments.map((att) => (
                <div
                  key={att.attachment_id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    isDark
                      ? "border-slate-700 hover:bg-slate-700/50"
                      : "border-slate-100 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium truncate ${textPrimary}`}>
                      {att.file_name}
                    </p>
                    <div className={`flex items-center gap-2 text-[11px] ${textSecondary}`}>
                      <span>{formatFileSize(att.file_size)}</span>
                      <span>·</span>
                      <span>{new Date(att.uploaded_at).toLocaleDateString("en-GB")}</span>
                    </div>
                    {att.file_description && (
                      <p className={`text-[11px] mt-0.5 truncate ${textSecondary}`}>
                        {att.file_description}
                      </p>
                    )}
                  </div>

                  <a
                    href={att.download_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={att.file_name}
                    className={`inline-flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-colors ${
                      isDark
                        ? "text-blue-400 hover:bg-blue-900/30"
                        : "text-blue-500 hover:bg-blue-50"
                    }`}
                    title={`Download ${att.file_name}`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={`flex justify-end px-5 py-3 border-t ${border}`}>
          <button
            onClick={onClose}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              isDark
                ? "border-slate-600 text-slate-300 hover:bg-slate-700"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}