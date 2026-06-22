'use client';
import { Operation } from "@/app/operations/table/page";
import { useTimezone } from "@/components/TimezoneProvider";
import { cn, formatDateInTz } from "@/lib/utils";
import axios from "axios";
import { Download, FileText, Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Skeleton } from "../ui/skeleton";

export function formatBytes(bytes?: number) {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(iso?: string, tz?: string) {
    return formatDateInTz(iso, tz);
}

interface Attachment {
    attachment_id: number;
    file_name: string;
    file_type?: string;
    file_size?: number;
    s3_url: string;
    uploaded_at?: string;
}

export function AttachmentsDialog({ open, onClose, operationId, operationName }: {
    open: boolean;
    onClose: () => void;
    operationId: number;
    operationName: string;
}) {
    const { t } = useTranslation();
    const { timezone } = useTimezone();
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const loadAttachments = useCallback(async () => {
        if (!operationId) return;
        setLoading(true);
        try {
            const { data } = await axios.get(`/api/operation/${operationId}/attachment`);
            setAttachments(data);
        } catch (error) {
            console.error("Failed to fetch attachments:", error);
        } finally {
            setLoading(false);
        }
    }, [operationId]);

    useEffect(() => {
        if (open) loadAttachments();
    }, [open, loadAttachments]);

    async function handleUpload(files: FileList | null) {
        if (!files || files.length === 0) return;
        setUploading(true);
        try {
            const uploaded: Attachment[] = [];
            for (const file of Array.from(files)) {
                const fd = new FormData();
                fd.append('file', file);
                const res = await fetch(`/api/operation/${operationId}/attachment`, {
                    method: 'POST',
                    body: fd,
                });
                if (!res.ok) {
                    const json = await res.json();
                    throw new Error(json.error ?? 'Upload failed');
                }
                const json = await res.json();
                uploaded.push(json.attachment);
            }
            setAttachments((prev) => [...uploaded, ...prev]);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setUploading(false);
        }
    }

    async function handleDownload(attachment: Attachment) {
        try {
            const { data } = await axios.get(
                `/api/operation/${operationId}/attachment/${attachment.attachment_id}/download`
            );
            window.open(data.url, '_blank');
        } catch {
            toast.error('Failed to get download link');
        }
    }

    async function handleDeleteAttachment(attachmentId: number) {
        try {
            await axios.delete(`/api/operation/${operationId}/attachment/${attachmentId}`);
            setAttachments((prev) => prev.filter((a) => a.attachment_id !== attachmentId));
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Delete failed');
        }
    }

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-150">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Paperclip className="h-4 w-4" />
                        {t('operations.dialog.attachments.title')}
                    </DialogTitle>
                    <DialogDescription className="truncate">{operationName}</DialogDescription>
                </DialogHeader>

                <div
                    className={cn(
                        'relative rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors cursor-pointer',
                        dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/40',
                    )}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files); }}
                    onClick={() => fileRef.current?.click()}
                >
                    <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
                    {uploading ? (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-sm">{t('operations.dialog.attachments.uploading')}</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Upload className="h-8 w-8" />
                            <p className="text-sm font-medium">{t('operations.dialog.attachments.dropFiles')}</p>
                            <p className="text-xs">{t('operations.dialog.attachments.fileLimit')}</p>
                        </div>
                    )}
                </div>

                <div className="h-60 overflow-y-auto scrollbar-thin space-y-1.5">
                    {loading && (
                        Array.from({ length: 2 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-3 rounded-md border px-3 py-2">
                                <Skeleton className="h-8 w-8 rounded" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-[60%]" />
                                    <Skeleton className="h-3 w-[40%]" />
                                </div>
                                <Skeleton className="h-4 w-4 rounded-full" />
                            </div>
                        ))
                    )}
                    {!loading && attachments.length === 0 && (
                        <p className="py-4 text-center text-sm text-muted-foreground">{t('operations.dialog.attachments.noAttachments')}</p>
                    )}
                    {attachments.map((a) => (
                        <div key={a.attachment_id} className="flex items-center gap-3 rounded-md border bg-muted/30 px-3 py-2">
                            <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                            <div className="min-w-0 flex-1">
                                <a href={a.s3_url} target="_blank" rel="noopener noreferrer" className="block truncate text-sm font-medium text-primary hover:underline">
                                    {a.file_name}
                                </a>
                                <p className="text-xs text-muted-foreground">{formatBytes(a.file_size)} · {formatDate(a.uploaded_at, timezone)}</p>
                            </div>
                            <button onClick={() => handleDeleteAttachment(a.attachment_id)} className="cursor-pointer ml-auto shrink-0 text-sm hover:text-destructive transition-colors">
                                <Trash2 className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => handleDownload(a)}
                                className="cursor-pointer block truncate text-sm font-medium text-primary hover:underline"
                            >
                                <Download className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>{t('operations.dialog.attachments.close')}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function DeleteDialog({ open, onClose, operation, onDeleted }: {
    open: boolean;
    onClose: () => void;
    operation: Operation | null;
    onDeleted: (id: number) => void;
}) {
    const { t } = useTranslation();
    const [isPending, startTransition] = useTransition();

    function handleDelete() {
        if (!operation) return;
        startTransition(async () => {
            try {
                await axios.delete(`/api/operation/${operation.pilot_mission_id}`);
                onDeleted(operation.pilot_mission_id);
                toast.success(t('operations.dialog.delete.success'));
                onClose();
            } catch (err) {
                toast.error(err instanceof Error ? err.message : t('operations.dialog.delete.error'));
            }
        });
    }

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-105">
                <DialogHeader>
                    <DialogTitle>{t('operations.dialog.delete.title')}</DialogTitle>
                    <DialogDescription>
                        {t('operations.dialog.delete.description')}{' '}
                        <span className="font-medium text-foreground">{operation?.mission_name}</span>. {t('operations.dialog.delete.undone')}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isPending}>{t('operations.dialog.delete.cancel')}</Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('operations.dialog.delete.delete')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}