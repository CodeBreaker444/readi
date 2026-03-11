'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useTheme } from '@/components/useTheme';
import { cn } from '@/lib/utils';
import {
    Download,
    File,
    FileImage,
    FileText,
    FileType,
    Loader2
} from 'lucide-react';
import { useState } from 'react';


export interface SystemFile {
    filename: string;
    filekey: string;
    fileurl: string;
    filesize: number;
    uploaded_at: string;
    download_url: string;
}

interface FilesDownloadModalProps {
    open: boolean;
    onClose: () => void;
    toolCode: string;
    files: SystemFile[];
}


function getFileIcon(filename: string) {
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext))
        return <FileImage className="w-4 h-4 text-blue-400" />;
    if (['pdf'].includes(ext))
        return <FileType className="w-4 h-4 text-red-400" />;
    if (['doc', 'docx', 'txt', 'md'].includes(ext))
        return <FileText className="w-4 h-4 text-sky-400" />;
    return <File className="w-4 h-4 text-slate-400" />;
}

function formatBytes(bytes: number): string {
    if (!bytes || bytes === 0) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(iso: string): string {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    } catch {
        return iso;
    }
}


export function FilesDownloadModal({
    open,
    onClose,
    toolCode,
    files,
}: FilesDownloadModalProps) {
    const { isDark } = useTheme();
    const [downloading, setDownloading] = useState<string | null>(null);

    async function handleDownload(file: SystemFile) {
        if (!file.download_url || file.download_url === '#') return;
        setDownloading(file.filekey);
        try {
            window.open(file.download_url, '_blank', 'noopener,noreferrer');
        } finally {
            setTimeout(() => setDownloading(null), 800);
        }
    }

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent
                className={cn(
                    'max-w-lg w-full',
                    isDark ? 'bg-slate-800 border-slate-700' : '',
                )}
            >
                <DialogHeader
                    className={cn(
                        'border-b pb-3',
                        isDark ? 'border-slate-700/60' : 'border-gray-100',
                    )}
                >
                    <div className="flex items-center gap-2">
                        <div
                            className={cn(
                                'flex items-center justify-center w-7 h-7 rounded-md',
                                isDark ? 'bg-slate-700' : 'bg-slate-100',
                            )}
                        >
                            <Download
                                className={cn(
                                    'w-3.5 h-3.5',
                                    isDark ? 'text-slate-300' : 'text-slate-600',
                                )}
                            />
                        </div>
                        <div>
                            <DialogTitle
                                className={cn(
                                    'text-sm font-semibold',
                                    isDark ? 'text-white' : '',
                                )}
                            >
                                Files — {toolCode}
                            </DialogTitle>
                            <p
                                className={cn(
                                    'text-xs mt-0.5',
                                    isDark ? 'text-slate-400' : 'text-slate-500',
                                )}
                            >
                                {files.length} file{files.length !== 1 ? 's' : ''} attached
                            </p>
                        </div>
                    </div>
                </DialogHeader>

                <div className="py-2 space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
                    {files.length === 0 ? (
                        <div
                            className={cn(
                                'flex flex-col items-center justify-center py-12 gap-2',
                                isDark ? 'text-slate-500' : 'text-slate-400',
                            )}
                        >
                            <File className="w-8 h-8 opacity-30" />
                            <p className="text-xs">No files attached to this system.</p>
                        </div>
                    ) : (
                        files.map((file, idx) => (
                            <div
                                key={file.filekey || idx}
                                className={cn(
                                    'flex items-center gap-3 rounded-lg px-3 py-2.5 group transition-colors',
                                    isDark
                                        ? 'bg-slate-700/50 hover:bg-slate-700'
                                        : 'bg-slate-50 hover:bg-slate-100 border border-slate-200',
                                )}
                            >
                                <div
                                    className={cn(
                                        'flex items-center justify-center w-8 h-8 rounded-md flex-shrink-0',
                                        isDark ? 'bg-slate-600' : 'bg-white border border-slate-200',
                                    )}
                                >
                                    {getFileIcon(file.filename)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p
                                        className={cn(
                                            'text-xs font-medium truncate',
                                            isDark ? 'text-slate-200' : 'text-slate-800',
                                        )}
                                        title={file.filename}
                                    >
                                        {file.filename}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span
                                            className={cn(
                                                'text-[10px]',
                                                isDark ? 'text-slate-500' : 'text-slate-400',
                                            )}
                                        >
                                            {formatBytes(file.filesize)}
                                        </span>
                                        <span
                                            className={cn(
                                                'text-[10px]',
                                                isDark ? 'text-slate-600' : 'text-slate-300',
                                            )}
                                        >
                                            •
                                        </span>
                                        <span
                                            className={cn(
                                                'text-[10px]',
                                                isDark ? 'text-slate-500' : 'text-slate-400',
                                            )}
                                        >
                                            {formatDate(file.uploaded_at)}
                                        </span>
                                        {idx === 0 && (
                                            <Badge
                                                variant="secondary"
                                                className="text-[9px] px-1.5 py-0 h-4"
                                            >
                                                Primary
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                <Button
                                    size="sm"
                                    variant="outline"
                                    className={cn(
                                        'h-7 px-2.5 text-xs gap-1.5 flex-shrink-0 transition-all',
                                        isDark
                                            ? 'border-slate-600 text-slate-300 hover:bg-slate-600 hover:text-white'
                                            : 'border-slate-200 text-slate-600 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700',
                                        (!file.download_url || file.download_url === '#') &&
                                            'opacity-40 pointer-events-none',
                                    )}
                                    onClick={() => handleDownload(file)}
                                    disabled={
                                        downloading === file.filekey ||
                                        !file.download_url ||
                                        file.download_url === '#'
                                    }
                                >
                                    {downloading === file.filekey ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                        <Download className="w-3 h-3" />
                                    )}
                                    Download
                                </Button>
                            </div>
                        ))
                    )}
                </div>

                <div
                    className={cn(
                        'flex justify-end pt-3 border-t',
                        isDark ? 'border-slate-700/60' : 'border-gray-100',
                    )}
                >
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onClose}
                        className={
                            isDark
                                ? 'border-slate-600 text-slate-300 hover:bg-slate-700'
                                : ''
                        }
                    >
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}