'use client';

import type { DocumentRevision, RepositoryDocument } from '@/config/types/repository';
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
  const [revisions, setRevisions] = useState<DocumentRevision[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!document?.document_id) return;
    setLoading(true);
    try {
      const res = await axios.post<{ items: DocumentRevision[] }>(
        '/api/document/history',
        { document_id: document.document_id }
      );
      setRevisions(res.data.items);
    } catch (error) {
      console.error("Error fetching document history:", error);
      toast.error("Failed to load history");
    } finally {
      setLoading(false);
    }
  }, [document?.document_id]);

  useEffect(() => {
    if (open && document) {
      fetchHistory();
    }
  }, [open, document, fetchHistory]);

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="w-[95vw] sm:max-w-xl p-0 overflow-hidden flex flex-col max-h-[90vh] rounded-lg">
        <DialogHeader className="px-4 py-4 sm:px-6 border-b">
          <DialogTitle className="text-lg sm:text-xl">Revision History</DialogTitle>
          <DialogDescription className="truncate text-xs sm:text-sm">
            {document ? `Tracking history for: ${document.title}` : 'Loading document details...'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="px-4 py-4 sm:px-6">
            {loading ? (
              <div className="space-y-4">
                {[...Array(1)].map((_, i) => (
                  <div key={i} className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 rounded-xl border p-3 sm:p-4">
                    <div className="flex items-center justify-between w-full sm:w-auto">
                      <Skeleton className="h-8 w-8 sm:h-10 sm:w-10 rounded-full" />
                    </div>
                    <div className="flex-1 space-y-2 w-full">
                      <div className="flex gap-2">
                        <Skeleton className="h-5 w-12" />
                        <Skeleton className="h-5 w-16" />
                      </div>
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-12 w-full rounded-md" />
                      <div className="flex gap-4">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <Skeleton className="h-9 w-9 rounded-md hidden sm:block" />
                  </div>
                ))}
              </div>
            ) : revisions.length === 0 ? (
              <div className="py-12 text-center">
                <Clock className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No revisions found.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {revisions.map((rev, i) => (
                  <div
                    key={rev.rev_id}
                    className="group flex flex-col sm:flex-row items-start gap-3 sm:gap-4 rounded-xl border border-border bg-card p-3 sm:p-4 transition-all hover:shadow-md"
                  >
                    <div className="flex items-center justify-between w-full sm:w-auto">
                      <div className="flex h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 font-bold border border-blue-100 shadow-sm text-xs sm:text-sm">
                        {revisions.length - i}
                      </div>
                      {i === 0 && (
                        <Badge className="sm:hidden bg-green-500/10 text-green-600 border-green-500/20 rounded-full text-[10px]">
                          Current
                        </Badge>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 w-full">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Badge variant="secondary" className="font-mono font-bold tracking-tighter text-[10px] sm:text-xs">
                          {rev.version_label || 'v1.0'}
                        </Badge>
                        {i === 0 && (
                          <Badge className="hidden sm:inline-flex bg-green-500/10 text-green-600 border-green-500/20 px-2 rounded-full font-semibold text-xs">
                            Current
                          </Badge>
                        )}
                      </div>

                      {rev.file_name && (
                        <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-foreground">
                          <FileText className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground" />
                          <p className="truncate">{rev.file_name}</p>
                        </div>
                      )}

                      {rev.change_log && (
                        <div className="mt-2 rounded bg-muted/50 p-2 border-l-2 border-primary/30">
                          <p className="text-[10px] sm:text-xs text-muted-foreground italic">
                            &ldquo;{rev.change_log}&rdquo;
                          </p>
                        </div>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-3 sm:gap-4 text-[10px] sm:text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(rev.uploaded_at), 'MMM dd, HH:mm')}
                        </span>
                        {rev.file_size != null && (
                          <span className="bg-muted px-1.5 py-0.5 rounded italic">
                            {rev.file_size < 1024 * 1024
                              ? `${(rev.file_size / 1024).toFixed(1)} KB`
                              : `${(rev.file_size / (1024 * 1024)).toFixed(1)} MB`}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="w-full sm:w-auto pt-2 sm:pt-0">
                      <RevDownloadButton filePath={rev.file_path} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t bg-muted/30">
          <Button variant="outline" onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}