'use client';

import { useTheme } from '@/components/useTheme';
import axios from 'axios';
import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  AtSign,
  Bell,
  Bug,
  Calendar,
  ChevronDown,
  Download,
  FileText,
  Filter,
  LayoutGrid,
  Rocket,
  Search,
  Shield,
  ShieldAlert,
  SlidersHorizontal,
  ThumbsDown,
  ThumbsUp,
  Timer,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  HiOutlineBookOpen,
  HiOutlineExclamationCircle,
  HiOutlineInformationCircle,
  HiOutlineLightningBolt,
  HiOutlineShieldCheck,
  HiOutlineTrendingUp,
} from 'react-icons/hi';
import { TbBug } from 'react-icons/tb';


interface HighlightCard { title: string; icon: string; color: string; description?: string }
interface ReleaseLog {
  version: string; date: string; title: string; description: string;
  status: string; releaseType: string; tags: string[];
  highlightCards: HighlightCard[]; body: string;
}
interface SubSection { heading: string; items: string[] }
interface BodySection { heading: string; items: string[]; subSections: SubSection[] }
type TabKey = "What's New" | 'Improvements' | 'Bug Fixes' | 'Details';


const HIGHLIGHT_ICON: Record<string, React.ElementType> = {
  bell: Bell, 'at-sign': AtSign, 'layout-grid': LayoutGrid,
  filter: Filter, shield: Shield, 'shield-alert': ShieldAlert, bug: Bug, rocket: Rocket,
  file: FileText, warning: AlertTriangle, timer: Timer, archive: Archive,
};

const HIGHLIGHT_COLOR: Record<string, { bg: string; text: string }> = {
  red: { bg: 'bg-red-500/10', text: 'text-red-500' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-500' },
  green: { bg: 'bg-emerald-500/10', text: 'text-emerald-600' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-600' },
  violet: { bg: 'bg-violet-500/10', text: 'text-violet-600' },
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-600' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-600' },
  slate: { bg: 'bg-slate-500/10', text: 'text-slate-500' },
};

const SECTION_META: Record<string, {
  icon: React.ElementType;
  bg: string; text: string; border: string;
}> = {
  "What's New": { icon: HiOutlineLightningBolt, bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/20' },
  'Improvements': { icon: HiOutlineTrendingUp, bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/20' },
  'Bug Fixes': { icon: TbBug, bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/20' },
  'Security': { icon: HiOutlineShieldCheck, bg: 'bg-purple-500/10', text: 'text-purple-600', border: 'border-purple-500/20' },
  'Breaking Changes': { icon: HiOutlineExclamationCircle, bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/20' },
  'Documentation': { icon: HiOutlineBookOpen, bg: 'bg-slate-500/10', text: 'text-slate-500', border: 'border-slate-500/20' },
  'Known Issues': { icon: HiOutlineInformationCircle, bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/20' },
};
const FALLBACK_META = { icon: HiOutlineInformationCircle, bg: 'bg-slate-500/10', text: 'text-slate-500', border: 'border-slate-500/20' };

function cleanHeading(h: string) { return h.replace(/^[^a-zA-Z"']+/, '').trim(); }

function stripMd(s: string): string {
  return s
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^['"]+|['"]+$/g, '')
    .trim();
}


function parseBody(body: string): BodySection[] {
  const sections: BodySection[] = [];
  let sec: BodySection | null = null;
  let sub: SubSection | null = null;

  for (const raw of body.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('## ')) {
      if (sub && sec) sec.subSections.push(sub);
      if (sec) sections.push(sec);
      sec = { heading: cleanHeading(line.slice(3).trim()), items: [], subSections: [] };
      sub = null;
    } else if (line.startsWith('### ') && sec) {
      if (sub) sec.subSections.push(sub);
      sub = { heading: line.slice(4).trim(), items: [] };
    } else if (line.startsWith('- ')) {
      const text = line.slice(2).trim();
      if (sub) sub.items.push(text);
      else if (sec) sec.items.push(text);
    }
  }
  if (sub && sec) sec.subSections.push(sub);
  if (sec) sections.push(sec);
  return sections;
}

function getTab(heading: string): TabKey {
  const h = heading.toLowerCase();
  if (h.includes('new')) return "What's New";
  if (h.includes('improve')) return 'Improvements';
  if (h.includes('bug') || h.includes('fix')) return 'Bug Fixes';
  return 'Details';
}


const TABS: TabKey[] = ["What's New", 'Improvements', 'Bug Fixes', 'Details'];
const DM = "'DM Sans', system-ui, sans-serif";
const TYPE_OPTIONS = ['all', 'major', 'minor', 'patch'] as const;

function vDisplay(v: string) { return v.startsWith('v') ? v : `v${v}`; }

function formatDate(d: string) {
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function downloadMd(log: ReleaseLog) {
  const blob = new Blob([log.body], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${vDisplay(log.version)}-${log.title.toLowerCase().replace(/\s+/g, '-')}.md`;
  a.click();
  URL.revokeObjectURL(url);
}


export default function ReleasesPage() {
  const { isDark } = useTheme();

  const [logs, setLogs] = useState<ReleaseLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ReleaseLog | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<TabKey>("What's New");
  const [helpful, setHelpful] = useState<boolean | null>(null);
  const [showVersionDrop, setShowVersionDrop] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');

  const versionDropRef = useRef<HTMLDivElement>(null);
  const filterPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    axios.get('/api/releases').then((res) => {
      if (res.data.code === 1) {
        setLogs(res.data.data);
        setSelected(res.data.data[0] ?? null);
      }
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (versionDropRef.current && !versionDropRef.current.contains(e.target as Node))
        setShowVersionDrop(false);
      if (filterPanelRef.current && !filterPanelRef.current.contains(e.target as Node))
        setShowFilterPanel(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    setHelpful(null);
    if (!selected) return;
    const secs = parseBody(selected.body);
    const tabMap: Record<TabKey, BodySection[]> = { "What's New": [], Improvements: [], 'Bug Fixes': [], Details: [] };
    for (const sec of secs) tabMap[getTab(sec.heading)].push(sec);
    const firstTab = TABS.find((t) => tabMap[t].length > 0) ?? "What's New";
    setActiveTab(firstTab);
  }, [selected?.version]);

  const filteredLogs = useMemo(() => logs.filter((l) => {
    const matchType = typeFilter === 'all' || l.releaseType === typeFilter;
    const q = search.toLowerCase();
    return matchType && (!q || l.title.toLowerCase().includes(q) || l.version.toLowerCase().includes(q));
  }), [logs, search, typeFilter]);

  const sections = useMemo(() => selected ? parseBody(selected.body) : [], [selected]);
  const tabSections = useMemo(() => {
    const map: Record<TabKey, BodySection[]> = { "What's New": [], Improvements: [], 'Bug Fixes': [], Details: [] };
    for (const sec of sections) map[getTab(sec.heading)].push(sec);
    return map;
  }, [sections]);

  const activeTypeLabel = typeFilter === 'all' ? 'All Versions' : `${typeFilter.charAt(0).toUpperCase() + typeFilter.slice(1)} only`;
  const hasActiveFilter = typeFilter !== 'all';

  // ── Loading skeleton ──
  const Skeleton = () => (
    <div className="space-y-2 p-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className={`h-20 rounded-xl animate-pulse ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`} />
      ))}
    </div>
  );

  return (
    <div className={`flex flex-col h-screen overflow-hidden ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`} style={{ fontFamily: DM }}>

      <style>{`
        .releases-scroll::-webkit-scrollbar { width: 3px; }
        .releases-scroll::-webkit-scrollbar-track { background: transparent; }
        .releases-scroll::-webkit-scrollbar-thumb {
          background: ${isDark ? '#334155' : '#e2e8f0'};
          border-radius: 4px;
        }
        .releases-scroll::-webkit-scrollbar-thumb:hover {
          background: ${isDark ? '#475569' : '#cbd5e1'};
        }
      `}</style>

      <div className={`shrink-0 border-b px-6 py-4 flex items-center justify-between ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)]'
        }`}>
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 rounded-full bg-amber-500" />
          <div>
            <h1 className={`font-semibold text-base tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Release Logs
            </h1>
            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Platform changelog and version history
            </p>
          </div>
        </div>
        {!loading && logs.length > 0 && (
          <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}>
            {logs.length} release{logs.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className={`shrink-0 flex-col border-r w-full md:w-64 lg:w-72 ${mobileView === 'list' ? 'flex' : 'hidden'
          } md:flex ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className={`p-3 border-b shrink-0 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}>
              <Search size={13} className={isDark ? 'text-slate-500' : 'text-slate-400'} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search releases..."
                className={`flex-1 bg-transparent text-[12px] outline-none placeholder:text-slate-400 cursor-text ${isDark ? 'text-slate-200' : 'text-slate-700'
                  }`}
              />
              {search && (
                <button onClick={() => setSearch('')} className="cursor-pointer">
                  <X size={11} className={isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'} />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto releases-scroll p-2">
            {loading ? <Skeleton /> : filteredLogs.length === 0 ? (
              <p className={`text-center text-[11px] mt-6 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                No releases match your search.
              </p>
            ) : filteredLogs.map((log, index) => {
              const isActive = selected?.version === log.version;
              const isLatest = log.status === 'latest' || (typeFilter === 'all' && index === 0);
              return (
                <button
                  key={log.version}
                  onClick={() => { setSelected(log); setMobileView('detail'); }}
                  className={`w-full text-left px-3 py-3 rounded-xl mb-1 transition-all duration-150 border cursor-pointer ${isActive
                      ? isDark ? 'bg-violet-500/10 border-violet-500/25' : 'bg-violet-50 border-violet-200'
                      : isDark ? 'hover:bg-slate-800/80 border-transparent' : 'hover:bg-slate-50 border-transparent'
                    }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-3 h-3 rounded-full border-2 shrink-0 flex items-center justify-center ${isActive
                        ? isDark ? 'border-violet-500 bg-violet-500' : 'border-violet-600 bg-violet-600'
                        : isDark ? 'border-slate-600' : 'border-slate-300'
                      }`}>
                      {isActive && <span className="w-1 h-1 rounded-full bg-white" />}
                    </span>
                    <span className={`text-[12px] font-bold ${isActive ? isDark ? 'text-violet-400' : 'text-violet-700' : isDark ? 'text-slate-200' : 'text-slate-800'
                      }`}>
                      {vDisplay(log.version)}
                    </span>
                    {isLatest && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full tracking-wider ${isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                        }`}>Latest</span>
                    )}
                    <span className={`ml-auto text-[10px] tabular-nums ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                      {new Date(log.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <p className={`text-[12px] font-semibold mb-0.5 truncate ${isActive ? isDark ? 'text-white' : 'text-slate-900' : isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                    {log.title}
                  </p>
                  <p className={`text-[11px] line-clamp-2 leading-relaxed ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    {log.description}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Footer count */}
          {!loading && (
            <div className={`shrink-0 px-4 py-2.5 border-t text-[11px] ${isDark ? 'border-slate-800 text-slate-600' : 'border-slate-100 text-slate-400'
              }`}>
              Showing {filteredLogs.length} of {logs.length} release{logs.length !== 1 ? 's' : ''}
            </div>
          )}
        </aside>

        <main className={`flex-1 overflow-y-auto releases-scroll flex-col w-full ${mobileView === 'detail' ? 'flex' : 'hidden'
          } md:flex`}>

          <div className={`shrink-0 flex items-center gap-2 px-4 py-3 border-b ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-100'
            }`}>
            {/* Mobile back button */}
            <button
              onClick={() => setMobileView('list')}
              className={`md:hidden flex items-center gap-1.5 text-[12px] font-medium mr-auto cursor-pointer ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              <ArrowLeft size={14} />
              Releases
            </button>
            <div className="ml-auto flex items-center gap-2">

              <div className="relative" ref={versionDropRef}>
                <button
                  onClick={() => { setShowVersionDrop((p) => !p); setShowFilterPanel(false); }}
                  className={`flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  {activeTypeLabel}
                  <ChevronDown size={13} className={`transition-transform ${showVersionDrop ? 'rotate-180' : ''}`} />
                </button>
                {showVersionDrop && (
                  <div className={`absolute right-0 mt-1.5 w-44 rounded-xl border shadow-lg z-30 overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    }`}>
                    {TYPE_OPTIONS.map((t) => (
                      <button
                        key={t}
                        onClick={() => { setTypeFilter(t); setShowVersionDrop(false); }}
                        className={`w-full text-left px-3 py-2.5 text-[12px] flex items-center justify-between transition-colors cursor-pointer ${typeFilter === t
                            ? isDark ? 'bg-violet-500/15 text-violet-400' : 'bg-violet-50 text-violet-700'
                            : isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-50'
                          }`}
                      >
                        {t === 'all' ? 'All Versions' : `${t.charAt(0).toUpperCase() + t.slice(1)} only`}
                        {typeFilter === t && <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Filters panel */}
              <div className="relative" ref={filterPanelRef}>
                <button
                  onClick={() => { setShowFilterPanel((p) => !p); setShowVersionDrop(false); }}
                  className={`flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${hasActiveFilter
                      ? isDark ? 'bg-violet-500/15 border-violet-500/30 text-violet-400' : 'bg-violet-50 border-violet-200 text-violet-700'
                      : isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  <SlidersHorizontal size={13} />
                  Filters
                  {hasActiveFilter && <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />}
                </button>

                {showFilterPanel && (
                  <div className={`absolute right-0 mt-1.5 w-52 rounded-xl border shadow-lg z-30 overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    }`}>
                    <div className={`flex items-center justify-between px-3 py-2.5 border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                      <span className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Filter by Type
                      </span>
                      {hasActiveFilter && (
                        <button
                          onClick={() => setTypeFilter('all')}
                          className={`text-[10px] cursor-pointer font-medium ${isDark ? 'text-violet-400 hover:text-violet-300' : 'text-violet-600 hover:text-violet-700'}`}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="p-1.5 space-y-0.5">
                      {TYPE_OPTIONS.filter((t) => t !== 'all').map((t) => {
                        const active = typeFilter === t;
                        return (
                          <button
                            key={t}
                            onClick={() => { setTypeFilter(active ? 'all' : t); }}
                            className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-lg text-[12px] transition-colors cursor-pointer ${active
                                ? isDark ? 'bg-violet-500/15 text-violet-400' : 'bg-violet-50 text-violet-700'
                                : isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-50'
                              }`}
                          >
                            <span className="capitalize">{t} release</span>
                            <span className={`w-4 h-4 rounded border flex items-center justify-center ${active
                                ? 'bg-violet-500 border-violet-500'
                                : isDark ? 'border-slate-600' : 'border-slate-300'
                              }`}>
                              {active && <span className="w-2 h-2 rounded-sm bg-white" />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex-1 p-6">
              <div className={`rounded-2xl border p-6 animate-pulse space-y-4 ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className={`h-8 w-48 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`} />
                <div className={`h-4 w-3/4 rounded ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`} />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                  {[1, 2, 3, 4].map(i => <div key={i} className={`h-24 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`} />)}
                </div>
              </div>
            </div>
          ) : !selected ? (
            <div className={`flex-1 flex items-center justify-center text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Select a release to view details.
            </div>
          ) : (
            <div className="flex-1 p-5">
              <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                }`}>

                <div className={`px-6 pt-5 pb-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className={`text-[13px] font-bold px-3 py-1 rounded-full ${isDark ? 'bg-violet-500/15 text-violet-400' : 'bg-violet-50 text-violet-700'
                        }`}>
                        {vDisplay(selected.version)}
                      </span>
                      {selected.status === 'latest' && (
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full tracking-wider ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                          }`}>Latest</span>
                      )}
                      <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {selected.title}
                      </h2>
                    </div>
                    <div className={`flex items-center gap-1.5 text-[12px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      <Calendar size={13} />
                      {formatDate(selected.date)}
                    </div>
                  </div>
                  {selected.description && (
                    <p className={`mt-2 text-[13px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {selected.description}
                    </p>
                  )}
                </div>

                {selected.highlightCards.length > 0 && (
                  <div className={`px-6 py-4 border-b grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 ${isDark ? 'border-slate-800' : 'border-slate-100'
                    }`}>
                    {selected.highlightCards.map((card) => {
                      const Icon = HIGHLIGHT_ICON[card.icon] ?? FileText;
                      const col = HIGHLIGHT_COLOR[card.color] ?? HIGHLIGHT_COLOR.blue;
                      return (
                        <div key={card.title} className={`rounded-xl border p-3.5 flex items-start gap-3 ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                          }`}>
                          <span className={`p-2 rounded-lg shrink-0 ${col.bg}`}>
                            <Icon size={15} className={col.text} />
                          </span>
                          <div>
                            <p className={`text-[12px] font-semibold leading-tight ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                              {card.title}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className={`flex items-center border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                  {TABS.map((tab) => {
                    if (!tabSections[tab].length) return null;
                    const isActive = activeTab === tab;
                    return (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-5 py-3 text-[12.5px] font-medium border-b-2 transition-all duration-150 cursor-pointer ${isActive
                            ? isDark ? 'border-violet-500 text-violet-400' : 'border-violet-600 text-violet-700'
                            : isDark ? 'border-transparent text-slate-500 hover:text-slate-300' : 'border-transparent text-slate-500 hover:text-slate-700'
                          }`}
                      >
                        {tab}
                      </button>
                    );
                  })}
                </div>

                <div className="px-6 py-5 space-y-6">
                  {tabSections[activeTab].map((sec) => {
                    const meta = SECTION_META[sec.heading] ?? FALLBACK_META;
                    const SectionIcon = meta.icon;
                    return (
                      <div key={sec.heading}>
                        <div className="flex items-center gap-3 mb-3">
                          <span className={`inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1.5 rounded-lg border ${meta.bg} ${meta.text} ${meta.border}`}>
                            <SectionIcon size={13} />
                            {sec.heading}
                          </span>
                          <div className={`flex-1 h-px ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`} />
                        </div>

                        {sec.subSections.length > 0 ? (
                          <ul className="space-y-2 pl-1">
                            {sec.subSections.map((sub) => (
                              <li key={sub.heading} className={`flex items-start gap-2.5 text-[13px] leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'
                                }`}>
                                <span className={`mt-1.5 text-[10px] font-bold ${meta.text}`}>+</span>
                                <span>
                                  <span className="font-semibold">{sub.heading}</span>
                                  {sub.items[0] && (
                                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                                      {' – '}{stripMd(sub.items[0])}
                                    </span>
                                  )}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <ul className="space-y-2 pl-1">
                            {sec.items.map((item, idx) => (
                              <li key={idx} className={`flex items-start gap-2.5 text-[13px] leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'
                                }`}>
                                <span className={`mt-2 w-1.5 h-1.5 rounded-full shrink-0 ${isDark ? 'bg-slate-600' : 'bg-slate-300'}`} />
                                {stripMd(item)}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* ── Footer ── */}
                <div className={`px-6 py-4 border-t flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50/60'
                  }`}>
                  <button
                    onClick={() => downloadMd(selected)}
                    className={`flex items-center gap-1.5 text-[12px] font-medium px-3.5 py-2 rounded-md border transition-colors cursor-pointer ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'
                      }`}
                  >
                    <Download size={13} />
                    Download MD
                  </button>

                  <div className={`flex items-center gap-3 text-[12px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    <span>Was this release helpful?</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setHelpful(helpful === true ? null : true)}
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${helpful === true
                            ? isDark ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                            : isDark ? 'border-slate-700 text-slate-500 hover:text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                          }`}
                      >
                        <ThumbsUp size={13} />
                      </button>
                      <button
                        onClick={() => setHelpful(helpful === false ? null : false)}
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${helpful === false
                            ? isDark ? 'bg-red-500/15 border-red-500/30 text-red-400' : 'bg-red-50 border-red-200 text-red-500'
                            : isDark ? 'border-slate-700 text-slate-500 hover:text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                          }`}
                      >
                        <ThumbsDown size={13} />
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
