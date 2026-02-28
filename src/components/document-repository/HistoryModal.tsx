'use client';

import type { RepositoryDocument } from '@/config/types/repository';
import { format } from 'date-fns';
import { Clock, Download, FileText, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { getDownloadUrl } from '@/actions/repository';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import axios from 'axios';
import { toast } from 'sonner';
import { Skeleton } from '../ui/skeleton';
import { useTheme } from '../useTheme';

interface Props {
  open: boolean;
  onClose: () => void;
  document: RepositoryDocument | null;
}

function RevDownloadButton({ filePath }: { filePath: string }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const url = await getDownloadUrl(filePath);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      toast.error('Download failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={handleClick}
      disabled={loading}
      title="Download this revision"
      className="flex-shrink-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-100"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
    </Button>
  );
}
 

export default function HistoryModal({ open, onClose, document }: Props) {
  const { isDark } = useTheme();
  const [revisions, setRevisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!document?.document_id) return;
    setLoading(true);
    try {
      const res = await axios.post<{ items: any[] }>(
        '/api/document/history',
        { document_id: document.document_id }
      );
      setRevisions(res.data.items);
    } catch (error) {
      console.error('Error fetching document history:', error);
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  }, [document?.document_id]);

  useEffect(() => {
    if (open && document) fetchHistory();
  }, [open, document, fetchHistory]);

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className={`w-[95vw] sm:max-w-xl p-0 overflow-hidden flex flex-col max-h-[90vh] rounded-xl
        ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>

        <DialogHeader className={`px-6 py-4 border-b ${isDark ? 'border-slate-700/60' : 'border-gray-100'}`}>
          <DialogTitle className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Revision History
          </DialogTitle>
          <DialogDescription className={`truncate text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            {document ? `Tracking history for: ${document.title}` : 'Loading document details...'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-5 space-y-3">

            {loading && Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={`flex items-start gap-4 rounded-xl border p-4
                ${isDark ? 'border-slate-700/60 bg-slate-700/30' : 'border-gray-100 bg-gray-50/50'}`}>
                <Skeleton className={`h-10 w-10 rounded-full shrink-0 ${isDark ? 'bg-slate-600' : 'bg-gray-200'}`} />
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <Skeleton className={`h-5 w-12 rounded ${isDark ? 'bg-slate-600' : 'bg-gray-200'}`} />
                    <Skeleton className={`h-5 w-16 rounded ${isDark ? 'bg-slate-600' : 'bg-gray-200'}`} />
                  </div>
                  <Skeleton className={`h-4 w-3/4 rounded ${isDark ? 'bg-slate-600' : 'bg-gray-200'}`} />
                  <Skeleton className={`h-10 w-full rounded-md ${isDark ? 'bg-slate-600' : 'bg-gray-200'}`} />
                  <div className="flex gap-4">
                    <Skeleton className={`h-3 w-20 rounded ${isDark ? 'bg-slate-600' : 'bg-gray-200'}`} />
                    <Skeleton className={`h-3 w-16 rounded ${isDark ? 'bg-slate-600' : 'bg-gray-200'}`} />
                  </div>
                </div>
              </div>
            ))}

            {!loading && revisions.length === 0 && (
              <div className="py-14 text-center">
                <Clock className={`h-10 w-10 mx-auto mb-3 opacity-20 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
                <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>No revisions found.</p>
              </div>
            )}

            {!loading && revisions.map((rev, i) => (
              <div
                key={rev.rev_id}
                className={`flex flex-col sm:flex-row items-start gap-4 rounded-xl border p-4 transition-all
                  ${isDark
                    ? 'border-slate-700/60 bg-slate-700/30 hover:bg-slate-700/50'
                    : 'border-gray-100 bg-white hover:shadow-sm'
                  }`}
              >
                <div className="flex items-center justify-between w-full sm:w-auto">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full
                    font-bold text-sm border shadow-sm
                    ${isDark
                      ? 'bg-slate-600 border-slate-500 text-slate-200'
                      : 'bg-blue-50 border-blue-100 text-blue-600'
                    }`}>
                    {revisions.length - i}
                  </div>
                  {i === 0 && (
                    <Badge className="sm:hidden bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 rounded-full text-[10px] font-semibold">
                      Current
                    </Badge>
                  )}
                </div>

                <div className="flex-1 min-w-0 w-full">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge variant="secondary" className={`font-mono font-bold tracking-tighter text-xs
                      ${isDark ? 'bg-slate-600 text-slate-200 border-slate-500' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                      {rev.version_label || 'v1.0'}
                    </Badge>
                    {i === 0 && (
                      <Badge className="hidden sm:inline-flex bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 px-2 rounded-full font-semibold text-xs">
                        Current
                      </Badge>
                    )}
                  </div>

                  {rev.file_name && (
                    <div className={`flex items-center gap-1.5 text-sm font-medium
                      ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                      <FileText className={`h-3.5 w-3.5 shrink-0 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
                      <p className="truncate">{rev.file_name}</p>
                    </div>
                  )}

                  {rev.change_log && (
                    <div className={`mt-2 rounded px-3 py-2 border-l-2 border-violet-500/40
                      ${isDark ? 'bg-slate-600/40' : 'bg-gray-50'}`}>
                      <p className={`text-xs italic ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        &ldquo;{rev.change_log}&rdquo;
                      </p>
                    </div>
                  )}

                  <div className={`mt-3 flex flex-wrap items-center gap-3 text-[11px] font-medium uppercase tracking-wider
                    ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(rev.uploaded_at), 'MMM dd, HH:mm')}
                    </span>
                    {rev.file_size != null && (
                      <span className={`px-1.5 py-0.5 rounded italic
                        ${isDark ? 'bg-slate-600 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>
                        {rev.file_size < 1024 * 1024
                          ? `${(rev.file_size / 1024).toFixed(1)} KB`
                          : `${(rev.file_size / (1024 * 1024)).toFixed(1)} MB`}
                      </span>
                    )}
                  </div>
                </div>

                <div className="w-full sm:w-auto pt-1 sm:pt-0">
                  <RevDownloadButton filePath={rev.file_path} />
                </div>
              </div>
            ))}

          </div>
        </ScrollArea>

        <div className={`px-6 py-4 border-t ${isDark ? 'border-slate-700/60 bg-slate-800/60' : 'border-gray-100 bg-gray-50/50'}`}>
          <Button
            variant="outline"
            onClick={onClose}
            className={`w-full
              ${isDark
                ? 'border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-slate-100'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
          >
            Close
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}