'use client';

import { ProcedureDocument } from '@/backend/services/docs/doc-service';
import { useTheme } from '@/components/useTheme';
import { ArrowLeft, BookOpen, Calendar, FileText, Hash } from 'lucide-react';
import Link from 'next/link';

interface DocViewerClientProps {
    doc: ProcedureDocument;
}

export default function DocViewerClient({ doc }: DocViewerClientProps) {
    const { isDark } = useTheme();

    const formattedDate = new Date(doc.created_at).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
    });

    return (
        <div className={`min-h-screen transition-colors duration-200 ${isDark ? 'dark-doc bg-[#07090f]' : 'light-doc bg-[#f0f2f7]'}`}>
            <div className={`top-0 z-20 border-b backdrop-blur-xl transition-colors duration-200 ${isDark
                ? 'border-white/[0.05] bg-[#07090f]/90'
                : 'border-gray-200/80 bg-white/90 shadow-[0_1px_3px_rgba(0,0,0,0.05)]'
            }`}>
                <div className="px-6 h-12 flex items-center gap-2">
                    <Link
                        href="/knowledge-config"
                        className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors ${isDark
                            ? 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                    >
                        <ArrowLeft size={13} />
                        Knowledge Base
                    </Link>
                    <span className={`text-xs ${isDark ? 'text-slate-700' : 'text-gray-300'}`}>/</span>
                    <span className={`text-xs font-medium truncate max-w-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                        {doc.source_file}
                    </span>
                    <span className={`text-xs ${isDark ? 'text-slate-700' : 'text-gray-300'}`}>/</span>
                    <span className={`text-xs truncate max-w-xs ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
                        {doc.section_title}
                    </span>
                </div>
            </div>

            <div className="px-6 py-10 space-y-5">
                <div className={`relative rounded-2xl border overflow-hidden ${isDark
                    ? 'border-white/[0.06] bg-[#0c1020]'
                    : 'border-gray-200 bg-white shadow-sm'
                }`}>
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-violet-600 via-indigo-500 to-violet-600" />

                    <div className="px-8 pt-8 pb-7">
                        <div className="flex flex-wrap items-center gap-2 mb-5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border ${isDark
                                ? 'border-violet-500/25 bg-violet-500/[0.08] text-violet-400'
                                : 'border-violet-200 bg-violet-50 text-violet-600'
                            }`}>
                                <FileText size={9} />
                                {doc.source_file}
                            </span>

                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium border ${isDark
                                ? 'border-white/[0.07] bg-white/[0.03] text-slate-500'
                                : 'border-gray-200 bg-gray-50 text-gray-500'
                            }`}>
                                <Hash size={9} />
                                Section {doc.section_number}
                            </span>

                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium border ml-auto ${isDark
                                ? 'border-white/[0.07] bg-white/[0.03] text-slate-500'
                                : 'border-gray-200 bg-gray-50 text-gray-500'
                            }`}>
                                <Calendar size={9} />
                                {formattedDate}
                            </span>
                        </div>

                        <h1 className={`text-[22px] font-bold leading-snug tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {doc.section_title}
                        </h1>
                    </div>

                    <div className={`px-8 py-3 border-t flex items-center gap-2 ${isDark
                        ? 'border-white/[0.04] bg-white/[0.015]'
                        : 'border-gray-100 bg-gray-50/60'
                    }`}>
                        <BookOpen size={11} className={isDark ? 'text-slate-600' : 'text-gray-400'} />
                        <span className={`text-[11px] ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
                            From knowledge base document
                        </span>
                        <code className={`ml-auto text-[10px] font-mono px-2 py-0.5 rounded border ${isDark
                            ? 'bg-white/[0.04] border-white/[0.06] text-slate-600'
                            : 'bg-white border-gray-200 text-gray-400'
                        }`}>
                            {doc.doc_key}
                        </code>
                    </div>
                </div>

                <div className={`rounded-2xl border px-8 py-8 doc-body text-[15px] leading-[1.8] transition-colors duration-200 ${isDark
                    ? 'border-white/[0.06] bg-[#0c1020] text-slate-300'
                    : 'border-gray-200 bg-white shadow-sm text-gray-700'
                }`}
                    dangerouslySetInnerHTML={{ __html: doc.html_content }}
                />

                <div className={`flex items-center justify-between py-4 pb-12 text-[11px] border-t ${isDark
                    ? 'text-slate-700 border-white/[0.04]'
                    : 'text-gray-400 border-gray-200'
                }`}>
                    <span>
                        Source: <span className={isDark ? 'text-slate-500' : 'text-gray-500'}>{doc.source_file}</span>
                    </span>
                    <Link
                        href="/knowledge-config"
                        className={`flex items-center gap-1.5 font-medium transition-colors ${isDark
                            ? 'text-slate-600 hover:text-slate-400'
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        <ArrowLeft size={11} />
                        Back to Knowledge Base
                    </Link>
                </div>
            </div>

            <style>{`
                /* Hide the duplicate h1 that mirrors the header card title */
                .doc-body article > h1:first-child,
                .doc-body > h1:first-child { display: none; }

                /* ── Headings ── */
                .doc-body h1 { font-size: 22px; font-weight: 700; margin: 36px 0 12px; }
                .doc-body h2 { font-size: 17px; font-weight: 600; margin: 32px 0 10px; padding-bottom: 8px; }
                .doc-body h3 { font-size: 15px; font-weight: 600; margin: 24px 0 8px; }
                .doc-body h4 { font-size: 13px; font-weight: 600; margin: 20px 0 6px; text-transform: uppercase; letter-spacing: 0.05em; }

                /* ── Body ── */
                .doc-body p { margin: 10px 0; }
                .doc-body strong { font-weight: 600; }
                .doc-body em { font-style: italic; }

                /* ── Links ── */
                .doc-body a { text-decoration: underline; text-underline-offset: 3px; transition: opacity 0.15s; }
                .doc-body a:hover { opacity: 0.7; }

                /* ── Lists ── */
                .doc-body ul, .doc-body ol { padding-left: 22px; margin: 10px 0; }
                .doc-body li { margin: 5px 0; padding-left: 3px; line-height: 1.7; }
                .doc-body ul li::marker { color: #7c3aed; }
                .doc-body ol li::marker { color: #7c3aed; font-weight: 600; font-size: 13px; }

                /* ── Inline code ── */
                .doc-body :not(pre) > code {
                    font-family: ui-monospace, 'Cascadia Code', Menlo, monospace;
                    font-size: 13px;
                    padding: 2px 6px;
                    border-radius: 5px;
                }

                /* ── Code blocks ── */
                .doc-body pre {
                    font-family: ui-monospace, 'Cascadia Code', Menlo, monospace;
                    font-size: 13px;
                    padding: 16px 20px;
                    border-radius: 12px;
                    overflow-x: auto;
                    margin: 18px 0;
                    line-height: 1.6;
                }
                .doc-body pre code { padding: 0; background: transparent !important; border: none !important; font-size: inherit; }

                /* ── Blockquote ── */
                .doc-body blockquote {
                    border-left: 3px solid #7c3aed;
                    padding: 10px 18px;
                    margin: 18px 0;
                    border-radius: 0 10px 10px 0;
                    font-style: italic;
                }

                /* ── HR ── */
                .doc-body hr { margin: 28px 0; border: none; height: 1px; }

                /* ── Table ── */
                .doc-body table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 22px 0;
                    font-size: 13.5px;
                    border-radius: 12px;
                    overflow: hidden;
                }
                .doc-body table td, .doc-body table th { padding: 10px 16px; text-align: left; vertical-align: top; }
                .doc-body table td:first-child { font-weight: 500; }
                .doc-body table tr:not(:has(td:not(:empty))) { display: none; }
                .doc-body table td:empty { padding: 2px 16px; }

                /* ════ DARK ════ */
                .dark-doc .doc-body h1,
                .dark-doc .doc-body h2,
                .dark-doc .doc-body h3 { color: #f1f5f9; }
                .dark-doc .doc-body h2 { border-bottom: 1px solid rgba(255,255,255,0.06); }
                .dark-doc .doc-body h4 { color: #64748b; }
                .dark-doc .doc-body strong { color: #e2e8f0; }
                .dark-doc .doc-body a { color: #a78bfa; }

                .dark-doc .doc-body :not(pre) > code {
                    background: rgba(139,92,246,0.12);
                    color: #c4b5fd;
                    border: 1px solid rgba(139,92,246,0.2);
                }
                .dark-doc .doc-body pre {
                    background: rgba(0,0,0,0.4);
                    border: 1px solid rgba(255,255,255,0.06);
                    color: #cbd5e1;
                }
                .dark-doc .doc-body blockquote {
                    background: rgba(124,58,237,0.06);
                    color: #94a3b8;
                    border-color: rgba(124,58,237,0.5);
                }
                .dark-doc .doc-body hr { background: rgba(255,255,255,0.06); }

                .dark-doc .doc-body table { border: 1px solid rgba(255,255,255,0.07); }
                .dark-doc .doc-body table tr:first-child td,
                .dark-doc .doc-body table tr:first-child th {
                    background: rgba(99,102,241,0.08);
                    color: #a5b4fc;
                    font-size: 11px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .dark-doc .doc-body table td,
                .dark-doc .doc-body table th { border-bottom: 1px solid rgba(255,255,255,0.04); }
                .dark-doc .doc-body table tr:nth-child(even) { background: rgba(255,255,255,0.015); }
                .dark-doc .doc-body table tr:hover { background: rgba(255,255,255,0.03); }
                .dark-doc .doc-body table td:first-child { color: #e2e8f0; }

                /* ════ LIGHT ════ */
                .light-doc .doc-body h1,
                .light-doc .doc-body h2,
                .light-doc .doc-body h3 { color: #111827; }
                .light-doc .doc-body h2 { border-bottom: 1px solid #e5e7eb; }
                .light-doc .doc-body h4 { color: #6b7280; }
                .light-doc .doc-body strong { color: #111827; }
                .light-doc .doc-body a { color: #7c3aed; }

                .light-doc .doc-body :not(pre) > code {
                    background: #f3f0ff;
                    color: #6d28d9;
                    border: 1px solid #ddd6fe;
                }
                .light-doc .doc-body pre {
                    background: #f8f9fc;
                    border: 1px solid #e5e7eb;
                    color: #374151;
                }
                .light-doc .doc-body blockquote {
                    background: #faf5ff;
                    color: #6b7280;
                    border-color: #7c3aed;
                }
                .light-doc .doc-body hr { background: #e5e7eb; }

                .light-doc .doc-body table { border: 1px solid #e5e7eb; }
                .light-doc .doc-body table tr:first-child td,
                .light-doc .doc-body table tr:first-child th {
                    background: #f5f3ff;
                    color: #7c3aed;
                    font-size: 11px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .light-doc .doc-body table td,
                .light-doc .doc-body table th { border-bottom: 1px solid #f3f4f6; }
                .light-doc .doc-body table tr:nth-child(even) { background: #fafafa; }
                .light-doc .doc-body table tr:hover { background: #f5f3ff; }
                .light-doc .doc-body table td:first-child { color: #111827; }
            `}</style>
        </div>
    );
}
