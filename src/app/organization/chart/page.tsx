"use client";

import { OrgNode } from "@/backend/services/organization/organizatio-service";
import OrganizationTree, { countDepth, countVisible } from "@/components/organization/OrganizationTree";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/useTheme";
import { useEffect, useState } from "react";
import { MdErrorOutline, MdOutlineAccountTree, MdRefresh } from "react-icons/md";
import { toast } from "sonner";

export default function OrganizationPage() {
  const { isDark } = useTheme();
  const [treeData, setTreeData] = useState<OrgNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchTree() {
      try {
        const res = await fetch("/api/organization");
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        const json = await res.json();
        if (json.message !== "success") throw new Error(json.error ?? "Unexpected response");
        if (!cancelled) {
          setTreeData(json.data as OrgNode);
          setErrMsg(null);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Network error";
        if (!cancelled) { setErrMsg(msg); toast.error(msg); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchTree();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
      
      <header className={`border-b px-8 py-7 transition-colors duration-300 ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-white border-slate-200'}`}>
        <p className="text-[11px] font-mono font-medium tracking-[0.12em] uppercase text-indigo-500 mb-1.5">
          AIView Group · Operations
        </p>
        <h1 className={`text-3xl font-extrabold tracking-tight transition-colors ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
          Organization Chart
        </h1>
        <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Accountability structure & reporting lines
        </p>

        {treeData && (
          <div className="flex flex-wrap gap-2.5 mt-5">
            <StatPill label={`${countVisible(treeData)} Members`} isDark={isDark} />
            <StatPill label={`${countDepth(treeData)} Levels`} color="cyan" isDark={isDark} />
            <StatPill label="Active" color="green" pulse isDark={isDark} />
          </div>
        )}
      </header>

      <div className={`mx-8 my-7 rounded-2xl border shadow-2xl overflow-hidden transition-colors duration-300 ${
        isDark ? 'bg-[#111827] border-slate-800 shadow-black/40' : 'bg-white border-slate-200 shadow-slate-200/60'
      }`}>
        
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          isDark ? 'bg-white/5 border-slate-800' : 'bg-slate-50/50 border-slate-100'
        }`}>
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
              <MdOutlineAccountTree size={18} />
            </div>
            <div>
              <p className={`text-sm font-bold tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Reporting Structure</p>
            </div>
          </div>
         
        </div>

        <div className="p-6 min-h-[640px] relative">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <div className="w-9 h-9 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
              <span className="text-xs font-mono text-slate-500 tracking-wider">Fetching org data…</span>
            </div>
          ) : errMsg ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-8">
              <div className={`p-3 rounded-2xl border ${isDark ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-100'}`}>
                <MdErrorOutline size={32} className="text-red-500" />
              </div>
              <p className="text-sm font-bold text-red-500">Failed to load chart</p>
              <pre className={`text-[10px] font-mono p-4 rounded-lg max-w-lg border ${
                isDark ? 'bg-red-500/5 border-red-500/20 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>{errMsg}</pre>
              <Button onClick={() => window.location.reload()} className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white flex gap-2">
                <MdRefresh size={18} /> Retry
              </Button>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <OrganizationTree data={treeData} isDark={isDark} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatPill({ label, color = 'indigo', pulse = false, isDark }: { label: string, color?: string, pulse?: boolean, isDark: boolean }) {
  const colorMap: any = {
    indigo: 'bg-indigo-500',
    cyan: 'bg-cyan-400',
    green: 'bg-emerald-500',
  };

  return (
    <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-medium transition-colors ${
      isDark 
        ? 'bg-indigo-500/10 border-indigo-500/20 text-slate-200' 
        : 'bg-indigo-500/5 border-indigo-500/10 text-slate-700'
    }`}>
      <span className={`w-2 h-2 rounded-full ${colorMap[color]} ${pulse ? 'animate-pulse' : ''}`} />
      {label}
    </div>
  );
}