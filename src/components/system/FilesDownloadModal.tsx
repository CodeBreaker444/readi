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
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';


export interface SystemFile {
    filename: string;
    filekey: string;
    fileurl: string;
    filesize: number;
    uploaded_at: string;
    download_url: string;
}

interface ComponentDoc {
    document_id: number;
    title: string;
    file_name?: string | null;
    version_label?: string | null;
    component_code?: string | null;
    component_name?: string | null;
    rev_id?: number | null;
}

interface FilesDownloadModalProps {
    open: boolean;
    onClose: () => void;
    toolCode: string;
    files: SystemFile[];
    toolId?: number;
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
    toolId,
}: FilesDownloadModalProps) {
    const { isDark } = useTheme();
    const { t } = useTranslation();
    const [downloading, setDownloading] = useState<string | null>(null);
    const [componentDocs, setComponentDocs] = useState<ComponentDoc[]>([]);
    const [docsLoading, setDocsLoading] = useState(false);

    useEffect(() => {
        if (!open || !toolId) { setComponentDocs([]); return; }
        setDocsLoading(true);
        fetch('/api/system/component/list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tool_id: toolId }),
        })
            .then(r => r.json())
            .then(async (compData) => {
                if (compData.code !== 1 || !compData.data?.length) return;
                const compIds: number[] = compData.data.map((c: any) => c.tool_component_id);
                const docResults = await Promise.all(
                    compIds.map((id) =>
                        fetch('/api/document/list', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ fk_component_id: id }),
                        })
                            .then(r => r.json())
                            .then(d => (d.items ?? []).map((doc: any) => ({
                                ...doc,
                                component_code: compData.data.find((c: any) => c.tool_component_id === id)?.component_code,
                                component_name: compData.data.find((c: any) => c.tool_component_id === id)?.component_name,
                            })))
                            .catch(() => [])
                    )
                );
                const seen = new Set<number>();
                const unique = docResults.flat().filter((doc) => {
                    if (seen.has(doc.document_id)) return false;
                    seen.add(doc.document_id);
                    return true;
                });
                setComponentDocs(unique);
            })
            .catch(() => {})
            .finally(() => setDocsLoading(false));
    }, [open, toolId]);

    async function handleDownload(file: SystemFile) {
        if (!file.download_url || file.download_url === '#') return;
        setDownloading(file.filekey);
        try {
            window.open(file.download_url, '_blank', 'noopener,noreferrer');
        } finally {
            setTimeout(() => setDownloading(null), 800);
        }
    }

    async function handleDocDownload(doc: ComponentDoc) {
        if (!doc.rev_id) return;
        setDownloading(`doc-${doc.document_id}`);
        try {
            const res = await fetch('/api/document/presign-download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rev_id: doc.rev_id }),
            });
            const data = await res.json();
            if (data?.url) window.open(data.url, '_blank', 'noopener,noreferrer');
        } finally {
            setTimeout(() => setDownloading(null), 800);
        }
    }

    const totalCount = files.length + componentDocs.length;

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent
                className={cn(
                    'max-w-lg w-full h-[600px] flex flex-col',
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
                                {t('systems.maintenanceLogbook.actions.downloadFiles')} — {toolCode}
                            </DialogTitle>
                            <p
                                className={cn(
                                    'text-xs mt-0.5',
                                    isDark ? 'text-slate-400' : 'text-slate-500',
                                )}
                            >
                                {totalCount} {t('systems.files.totalFiles', { count: totalCount })}
                            </p>
                        </div>
                    </div>
                </DialogHeader>

                <div className="py-2 space-y-3 flex-1 overflow-y-auto pr-1">
                    {/* System files */}
                    {files.length > 0 && (
                        <div className="space-y-1.5">
                            <p className={cn('text-[10px] uppercase tracking-widest font-bold px-1', isDark ? 'text-slate-500' : 'text-slate-400')}>
                                {t('systems.files.systemFiles')}
                            </p>
                            {files.map((file, idx) => (
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
                                            <span className={cn('text-[10px]', isDark ? 'text-slate-500' : 'text-slate-400')}>
                                                {formatBytes(file.filesize)}
                                            </span>
                                            <span className={cn('text-[10px]', isDark ? 'text-slate-600' : 'text-slate-300')}>•</span>
                                            <span className={cn('text-[10px]', isDark ? 'text-slate-500' : 'text-slate-400')}>
                                                {formatDate(file.uploaded_at)}
                                            </span>
                                            {idx === 0 && (
                                                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">Primary</Badge>
                                            )}
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className={cn(
                                            'h-7 px-2.5 text-xs gap-1.5 flex-shrink-0',
                                            isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-600 hover:text-white' : 'border-slate-200 text-slate-600 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700',
                                            (!file.download_url || file.download_url === '#') && 'opacity-40 pointer-events-none',
                                        )}
                                        onClick={() => handleDownload(file)}
                                        disabled={downloading === file.filekey || !file.download_url || file.download_url === '#'}
                                    >
                                        {downloading === file.filekey ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Component documents */}
                    {toolId && (
                        <div className="space-y-1.5">
                            <p className={cn('text-[10px] uppercase tracking-widest font-bold px-1', isDark ? 'text-slate-500' : 'text-slate-400')}>
                                {t('systems.files.componentDocs')}
                            </p>
                            {docsLoading ? (
                                <div className={cn('text-xs text-center py-4', isDark ? 'text-slate-500' : 'text-slate-400')}>
                                    <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1" />
                                    {t('systems.files.loadingDocs')}
                                </div>
                            ) : componentDocs.length === 0 ? (
                                <div className={cn('text-xs text-center py-4', isDark ? 'text-slate-600' : 'text-slate-400')}>
                                    {t('systems.files.noComponentDocs')}
                                </div>
                            ) : (
                                componentDocs.map((doc) => (
                                    <div
                                        key={doc.document_id}
                                        className={cn(
                                            'flex items-center gap-3 rounded-lg px-3 py-2.5 group transition-colors',
                                            isDark ? 'bg-slate-700/50 hover:bg-slate-700' : 'bg-slate-50 hover:bg-slate-100 border border-slate-200',
                                        )}
                                    >
                                        <div className={cn('flex items-center justify-center w-8 h-8 rounded-md flex-shrink-0', isDark ? 'bg-slate-600' : 'bg-white border border-slate-200')}>
                                            {getFileIcon(doc.file_name ?? '')}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={cn('text-xs font-medium truncate', isDark ? 'text-slate-200' : 'text-slate-800')} title={doc.title}>
                                                {doc.title}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                {(doc.component_code || doc.component_name) && (
                                                    <span className={cn('text-[10px] font-mono', isDark ? 'text-slate-500' : 'text-slate-400')}>
                                                        {doc.component_code || doc.component_name}
                                                    </span>
                                                )}
                                                {doc.version_label && (
                                                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">v{doc.version_label}</Badge>
                                                )}
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className={cn(
                                                'h-7 px-2.5 text-xs gap-1.5 flex-shrink-0',
                                                isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-600 hover:text-white' : 'border-slate-200 text-slate-600 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700',
                                                !doc.rev_id && 'opacity-40 pointer-events-none',
                                            )}
                                            onClick={() => handleDocDownload(doc)}
                                            disabled={downloading === `doc-${doc.document_id}` || !doc.rev_id}
                                        >
                                            {downloading === `doc-${doc.document_id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {files.length === 0 && !toolId && (
                        <div className={cn('flex flex-col items-center justify-center py-12 gap-2', isDark ? 'text-slate-500' : 'text-slate-400')}>
                            <File className="w-8 h-8 opacity-30" />
                            <p className="text-xs">{t('systems.components.systemsTable.noResults')}</p>
                        </div>
                    )}
                </div>

                <div className={cn('flex justify-end pt-3 border-t', isDark ? 'border-slate-700/60' : 'border-gray-100')}>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onClose}
                        className={isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : ''}
                    >
                        {t('systems.maintenanceLogbook.modals.eventHistory.close')}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
