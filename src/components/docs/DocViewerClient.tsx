'use client';

import { ProcedureDocument } from '@/backend/services/docs/doc-service';
import { useTheme } from '@/components/useTheme';
import { ArrowLeft, Hash } from 'lucide-react';
import Link from 'next/link';

interface DocViewerClientProps {
    doc: ProcedureDocument;
}

export default function DocViewerClient({ doc }: DocViewerClientProps) {
    const { isDark } = useTheme();

    return (
        <div className={`min-h-screen transition-colors duration-200 ${isDark ? 'dark-doc bg-[#0a0e1a] text-slate-200' : 'light-doc bg-[#f4f6f9] text-gray-800'}`}>
            {/* Top bar */}
            <div className={`top-0 z-10 border-b backdrop-blur-xl transition-colors duration-200 ${isDark
                ? 'border-white/[0.06] bg-slate-900/80'
                : 'border-gray-200/80 bg-white/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
            }`}>
                <div className="px-6 py-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <Link
                            href="/knowledge-config"
                            className={`p-2 rounded-lg transition-colors ${isDark
                                ? 'text-slate-400 hover:text-white hover:bg-slate-700/60'
                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                            }`}
                        >
                            <ArrowLeft size={18} />
                        </Link>
                        <div className="flex items-center gap-2 min-w-0">
                             <div className="w-1 h-6 rounded-full bg-violet-600" />
                            <span className={`text-md font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {doc.source_file}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-6 py-10 space-y-6">
                {/* Header card */}
                <div className={`rounded-xl border p-8 transition-colors duration-200 ${isDark
                    ? 'border-white/[0.06] bg-[#0f1320] shadow-[0_0_0_1px_rgba(255,255,255,0.02)]'
                    : 'border-gray-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
                }`}>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-semibold uppercase tracking-wider mb-4 ${isDark
                        ? 'border-blue-400/20 bg-blue-400/10 text-blue-400'
                        : 'border-blue-200 bg-blue-50 text-blue-600'
                    }`}>
                        {doc.source_file}
                    </span>
                    <h1 className={`text-2xl font-bold leading-snug mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {doc.section_title}
                    </h1>
                    <div className={`flex items-center gap-1.5 text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                        <Hash size={13} />
                        <span>Section {doc.section_number}</span>
                    </div>
                </div>

                {/* Content card */}
                <div className={`rounded-xl border px-8 py-7 text-[15px] leading-relaxed transition-colors duration-200 doc-body ${isDark
                    ? 'border-white/[0.06] bg-[#0f1320] shadow-[0_0_0_1px_rgba(255,255,255,0.02)] text-slate-300'
                    : 'border-gray-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] text-gray-700'
                }`}
                    dangerouslySetInnerHTML={{ __html: doc.html_content }}
                />

                {/* Footer */}
                <div className={`flex items-center justify-between pt-2 pb-8 text-xs border-t transition-colors duration-200 ${isDark
                    ? 'text-slate-600 border-white/[0.04]'
                    : 'text-gray-400 border-gray-100'
                }`}>
                    <span>Source: {doc.source_file}</span>
                    <code className={`px-2 py-0.5 rounded font-mono border ${isDark
                        ? 'bg-white/[0.04] border-white/[0.06]'
                        : 'bg-gray-50 border-gray-200'
                    }`}>
                        {doc.doc_key}
                    </code>
                </div>
            </div>

            <style>{`
                .doc-body article > h1 { display: none; }

                .doc-body h2 {
                    font-size: 18px;
                    font-weight: 600;
                    margin: 28px 0 10px;
                    padding-bottom: 8px;
                }

                .doc-body p { margin: 10px 0; }

                .doc-body strong { font-weight: 600; }

                .doc-body ul,
                .doc-body ol {
                    padding-left: 20px;
                    margin: 8px 0;
                }

                .doc-body li {
                    margin: 6px 0;
                    padding-left: 4px;
                }

                .doc-body li::marker { color: #6366f1; }

                .doc-body table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                    font-size: 13px;
                    border-radius: 10px;
                    overflow: hidden;
                }

                .doc-body table td,
                .doc-body table th {
                    padding: 10px 16px;
                    text-align: left;
                    vertical-align: top;
                }

                .doc-body table td:first-child { font-weight: 500; }

                .doc-body table tr:not(:has(td:not(:empty))) { display: none; }
                .doc-body table td:empty { padding: 2px 16px; }

                /* Dark theme table */
                .dark-doc .doc-body h2 {
                    color: #f1f5f9;
                    border-bottom: 1px solid rgba(255,255,255,0.06);
                }
                .dark-doc .doc-body strong { color: #f1f5f9; }
                .dark-doc .doc-body table {
                    border: 1px solid rgba(255,255,255,0.08);
                }
                .dark-doc .doc-body table tr:first-child td,
                .dark-doc .doc-body table tr:first-child th {
                    background: rgba(99,102,241,0.08);
                    color: #a5b4fc;
                    font-size: 11px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .dark-doc .doc-body table td,
                .dark-doc .doc-body table th {
                    border-bottom: 1px solid rgba(255,255,255,0.04);
                }
                .dark-doc .doc-body table tr:nth-child(even) { background: rgba(255,255,255,0.015); }
                .dark-doc .doc-body table tr:hover { background: rgba(255,255,255,0.03); }
                .dark-doc .doc-body table td:first-child { color: #e2e8f0; }

                /* Light theme table */
                .light-doc .doc-body h2 {
                    color: #111827;
                    border-bottom: 1px solid #e5e7eb;
                }
                .light-doc .doc-body strong { color: #111827; }
                .light-doc .doc-body table {
                    border: 1px solid #e5e7eb;
                }
                .light-doc .doc-body table tr:first-child td,
                .light-doc .doc-body table tr:first-child th {
                    background: #eff6ff;
                    color: #3b82f6;
                    font-size: 11px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .light-doc .doc-body table td,
                .light-doc .doc-body table th {
                    border-bottom: 1px solid #f3f4f6;
                }
                .light-doc .doc-body table tr:nth-child(even) { background: #f9fafb; }
                .light-doc .doc-body table tr:hover { background: #f3f4f6; }
                .light-doc .doc-body table td:first-child { color: #111827; }
            `}</style>
        </div>
    );
}
