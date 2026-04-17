'use client';

import { useTheme } from '@/components/useTheme';
import { AlertCircle, ArrowLeft, CheckCircle2, ExternalLink, FileText, HardDrive, Loader2, RefreshCw, Search, Trash2, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

const MAX_PDF_SIZE_MB = 10;
const MAX_PDF_FILES = 10;

interface DocumentRecord {
    doc_key: string;
    section_title: string;
    source_file: string;
    created_at: string;
}

export default function KnowledgeConfigPage() {
    const { isDark } = useTheme();
    const { t } = useTranslation();
    const router = useRouter();

    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
    const [documents, setDocuments] = useState<DocumentRecord[]>([]);
    const [totalFiles, setTotalFiles] = useState(0);
    const [isLoadingDocs, setIsLoadingDocs] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        fetch('/api/agent/opm-users')
            .then((r) => {
                setIsAuthorized(r.status !== 403 && r.status !== 401);
            })
            .catch(() => setIsAuthorized(false));
    }, []);

    const fetchDocuments = useCallback(async () => {
        setIsLoadingDocs(true);
        try {
            const res = await fetch('/api/agent/ingest');
            if (res.ok) {
                const data = await res.json();
                setDocuments(data.documents ?? []);
                setTotalFiles(data.totalFiles ?? 0);
            }
        } catch {
            toast.error(t('knowledge.errors.loadDocuments'));
        } finally {
            setIsLoadingDocs(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthorized) fetchDocuments();
    }, [isAuthorized, fetchDocuments]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;

        const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');

        if (isPdf && file.size > MAX_PDF_SIZE_MB * 1024 * 1024) {
            setUploadStatus('error');
            setErrorMsg(t('knowledge.errors.fileTooLarge', { size: (file.size / 1024 / 1024).toFixed(1), max: MAX_PDF_SIZE_MB }));
            return;
        }

        setIsUploading(true);
        setUploadStatus('processing');
        setErrorMsg('');

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/agent/ingest', { method: 'POST', body: formData });
            if (res.ok) {
                setUploadStatus('success');
                toast.success(t('knowledge.success.ingested'));
                fetchDocuments();
                setTimeout(() => setUploadStatus('idle'), 3000);
            } else {
                const data = await res.json();
                setUploadStatus('error');
                setErrorMsg(data.error || t('knowledge.errors.uploadFailed'));
            }
        } catch {
            setUploadStatus('error');
            setErrorMsg(t('knowledge.errors.networkUpload'));
        } finally {
            setIsUploading(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/agent/ingest?source=${encodeURIComponent(deleteTarget)}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success(t('knowledge.success.deleted', { name: deleteTarget }));
                fetchDocuments();
                setDeleteTarget(null);
            } else {
                toast.error(t('knowledge.errors.deleteFailed'));
            }
        } catch {
            toast.error(t('knowledge.errors.networkDelete'));
        } finally {
            setIsDeleting(false);
        }
    };

    const groupedDocs = documents.reduce<Record<string, DocumentRecord[]>>((acc, doc) => {
        (acc[doc.source_file] ??= []).push(doc);
        return acc;
    }, {});

    const filteredSources = Object.keys(groupedDocs).filter(
        (src) =>
            src.toLowerCase().includes(searchQuery.toLowerCase()) ||
            groupedDocs[src].some((d) => d.section_title.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const limitReached = totalFiles >= MAX_PDF_FILES;

    if (isAuthorized === null) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-slate-950' : 'bg-gray-50'}`}>
                <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
            </div>
        );
    }

    if (!isAuthorized) {
        return (
            <div className={`min-h-screen flex flex-col items-center justify-center gap-6 ${isDark ? 'bg-slate-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
                <div className={`p-4 rounded-2xl ${isDark ? 'bg-red-500/10 ring-1 ring-red-500/30' : 'bg-red-50 ring-1 ring-red-200'}`}>
                    <AlertCircle className="w-10 h-10 text-red-400" />
                </div>
                <div className="text-center">
                    <h1 className="text-xl font-bold mb-1">{t('knowledge.accessDenied.title')}</h1>
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        {t('knowledge.accessDenied.description')}
                    </p>
                </div>
                <button
                    onClick={() => router.back()}
                    className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-white hover:bg-gray-100 text-gray-800 border border-gray-200'}`}
                >
                    {t('knowledge.goBack')}
                </button>
            </div>
        );
    }

    return (
        <div className={`min-h-screen ${isDark ? 'bg-slate-950' : 'bg-gray-50'}`}>
            <div className={`border-b px-6 py-4 ${isDark ? 'bg-slate-900/80 border-slate-700/60 backdrop-blur' : 'bg-white/80 border-gray-200 backdrop-blur'}`}>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'}`}
                    >
                        <ArrowLeft size={18} />
                    </button>

                    <div className={`p-2 rounded-lg ${isDark ? 'bg-violet-500/15' : 'bg-violet-50'}`}>
                        <RefreshCw size={18} className="text-violet-500" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <h1 className={`font-bold text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('knowledge.title')}</h1>
                        <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{t('knowledge.subtitle')}</p>
                    </div>

                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${limitReached
                        ? (isDark ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-red-50 border-red-200 text-red-600')
                        : (isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-gray-200 text-gray-500')}`}>
                        <HardDrive size={13} />
                        <span>{t('knowledge.filesCount', { total: totalFiles, max: MAX_PDF_FILES })}</span>
                    </div>
                </div>
            </div>

            <main className="px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left: upload panel */}
                    <div className="space-y-4">
                        <div className={`rounded-2xl border p-5 ${isDark ? 'bg-slate-900 border-slate-700/60' : 'bg-white border-gray-200'}`}>
                            <h2 className={`text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                <Upload size={13} /> {t('knowledge.ingestNewDocument')}
                            </h2>

                            <label className={`relative block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${limitReached
                                ? 'opacity-40 pointer-events-none border-red-400/30'
                                : isUploading
                                    ? 'pointer-events-none opacity-60'
                                    : (isDark ? 'border-slate-700 hover:border-violet-500/50 hover:bg-violet-500/5' : 'border-gray-200 hover:border-violet-400/50 hover:bg-violet-50/50')
                            }`}>
                                <input type="file" className="hidden" accept=".pdf,.txt" onChange={handleFileUpload} disabled={limitReached} />
                                <Upload size={22} className={`mx-auto mb-3 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
                                <p className={`text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                                    {limitReached ? t('knowledge.storageFull') : t('knowledge.dropPdfOrTxt')}
                                </p>
                                <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                                    {limitReached ? t('knowledge.deleteToUploadMore') : t('knowledge.maxPerFile', { max: MAX_PDF_SIZE_MB })}
                                </p>

                                {uploadStatus !== 'idle' && (
                                    <div className={`mt-4 p-3 rounded-lg ${isDark ? 'bg-black/30' : 'bg-gray-50'}`}>
                                        {uploadStatus === 'processing' && (
                                            <div className="flex items-center justify-center gap-2 text-violet-400 text-xs font-semibold">
                                                <Loader2 size={13} className="animate-spin" /> {t('knowledge.processing')}
                                            </div>
                                        )}
                                        {uploadStatus === 'success' && (
                                            <div className="flex items-center justify-center gap-2 text-emerald-400 text-xs font-semibold">
                                                <CheckCircle2 size={13} /> {t('knowledge.ingestedSuccessfully')}
                                            </div>
                                        )}
                                        {uploadStatus === 'error' && (
                                            <div className="flex flex-col items-center gap-1 text-red-400">
                                                <div className="flex items-center gap-2 text-xs font-semibold">
                                                    <AlertCircle size={13} /> {t('common.error')}
                                                </div>
                                                <p className="text-[10px] opacity-70 italic">{errorMsg}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </label>

                            {/* Limits info box */}
                            <div className={`mt-4 p-3 rounded-xl border text-xs space-y-1 ${isDark ? 'bg-red-500/5 border-red-500/15 text-slate-400' : 'bg-red-50/50 border-red-100 text-gray-500'}`}>
                                <p className={`font-bold uppercase tracking-wider text-[9px] mb-1.5 ${isDark ? 'text-red-400/70' : 'text-red-400'}`}>{t('knowledge.hardLimits')}</p>
                                <p>{t('knowledge.limitPdf', { max: MAX_PDF_SIZE_MB })}</p>
                                <p>{t('knowledge.limitFiles', { max: MAX_PDF_FILES })}</p>
                                <p>{t('knowledge.adminOnly')}</p>
                            </div>

                            <div className={`mt-3 p-3 rounded-xl border text-xs space-y-1 ${isDark ? 'bg-slate-800/50 border-slate-700/50 text-slate-400' : 'bg-gray-50 border-gray-100 text-gray-500'}`}>
                                <p className={`font-bold uppercase tracking-wider text-[9px] mb-1.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{t('knowledge.howItWorks')}</p>
                                <p>{t('knowledge.how.chunked')}</p>
                                <p>{t('knowledge.how.searchable')}</p>
                                <p>{t('knowledge.how.reupload')}</p>
                            </div>
                        </div>
                    </div>

                    {/* Right: document list */}
                    <div className="lg:col-span-2">
                        <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-900 border-slate-700/60' : 'bg-white border-gray-200'}`}>
                            <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? 'border-slate-700/60' : 'border-gray-100'}`}>
                                <h2 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                    <FileText size={13} /> {t('knowledge.activeStore')}
                                </h2>
                                <div className="relative">
                                    <Search size={12} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
                                    <input
                                        type="text"
                                        placeholder={t('common.search')}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className={`pl-8 pr-3 py-1.5 rounded-lg border text-xs outline-none transition-colors w-48 ${isDark
                                            ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500 focus:border-violet-500/50'
                                            : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-violet-400/50'}`}
                                    />
                                </div>
                            </div>

                            <div className="overflow-y-auto" style={{ maxHeight: '60vh' }}>
                                {isLoadingDocs ? (
                                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                                        <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
                                        <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{t('knowledge.loading')}</p>
                                    </div>
                                ) : filteredSources.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                                        <FileText size={36} className={isDark ? 'text-slate-700' : 'text-gray-300'} />
                                        <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                                            {searchQuery ? t('knowledge.emptySearch') : t('knowledge.empty')}
                                        </p>
                                    </div>
                                ) : (
                                    <div className={`divide-y ${isDark ? 'divide-slate-700/50' : 'divide-gray-100'}`}>
                                        {filteredSources.map((source) => (
                                            <div key={source} className={`group p-5 transition-colors ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-gray-50'}`}>
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex items-start gap-3 min-w-0">
                                                        <div className={`p-2.5 rounded-xl shrink-0 transition-colors ${isDark ? 'bg-violet-500/10 group-hover:bg-violet-500/20' : 'bg-violet-50 group-hover:bg-violet-100'}`}>
                                                            <FileText size={16} className="text-violet-500" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className={`text-sm font-semibold truncate ${isDark ? 'text-slate-200 group-hover:text-white' : 'text-gray-800 group-hover:text-gray-900'}`}>
                                                                {source}
                                                            </p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-md border ${isDark ? 'bg-slate-800 border-slate-600 text-slate-400' : 'bg-gray-100 border-gray-200 text-gray-500'}`}>
                                                                    {t('knowledge.sectionsCount', { count: groupedDocs[source].length })}
                                                                </span>
                                                                <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                                                                    {new Date(groupedDocs[source][0].created_at).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => setDeleteTarget(source)}
                                                        className={`opacity-0 group-hover:opacity-100 p-2 rounded-lg transition-all ${isDark ? 'hover:bg-red-500/10 text-slate-500 hover:text-red-400' : 'hover:bg-red-50 text-gray-400 hover:text-red-500'}`}
                                                        title={t('knowledge.deleteFromBase')}
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>

                                                {/* Section previews */}
                                                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-11">
                                                    {groupedDocs[source].slice(0, 4).map((doc) => (
                                                        <a
                                                            key={doc.doc_key}
                                                            href={`/docs/${doc.doc_key}`}
                                                            target="_blank"
                                                            className={`group/item flex items-center justify-between px-3 py-2 rounded-lg border text-[11px] transition-colors no-underline ${isDark
                                                                ? 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-500 hover:text-white'
                                                                : 'bg-gray-50 border-gray-100 text-gray-500 hover:border-gray-200 hover:text-gray-800'}`}
                                                        >
                                                            <span className="truncate pr-2">{doc.section_title || t('knowledge.untitledSection')}</span>
                                                            <ExternalLink size={10} className="shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                                                        </a>
                                                    ))}
                                                    {groupedDocs[source].length > 4 && (
                                                        <p className={`px-3 py-2 text-[10px] italic ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
                                                            {t('knowledge.moreSections', { count: groupedDocs[source].length - 4 })}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Delete confirmation dialog */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div
                        className={`relative w-full max-w-md rounded-2xl border p-8 shadow-2xl ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 ${isDark ? 'bg-red-500/10 ring-1 ring-red-500/30' : 'bg-red-50 ring-1 ring-red-200'}`}>
                            <Trash2 size={24} className="text-red-400" />
                        </div>
                        <h2 className={`text-lg font-bold text-center mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('knowledge.removeTitle')}</h2>
                        <p className={`text-sm text-center mb-6 leading-relaxed ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                            <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>"{deleteTarget}"</span> and its{' '}
                            {t('knowledge.removeDescription', { count: groupedDocs[deleteTarget]?.length ?? 0 })}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${isDark ? 'border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-300' : 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700'}`}
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={isDeleting}
                                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                            >
                                {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                {isDeleting ? t('knowledge.deleting') : t('common.delete')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
