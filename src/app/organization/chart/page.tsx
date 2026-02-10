'use client';

import OrganizationTree from "@/components/organization/OrganizationTree";
import { useTheme } from "@/components/useTheme";
import { dummyOrganizationTree } from "@/lib/dummydata";
import { Building2, Download, Maximize2, Minimize2 } from "lucide-react";
import { useState } from "react";


export default function OrganizationChartPage() {
  const { isDark } = useTheme()
  const [isExpanded, setIsExpanded] = useState(true);

  return (
   <div className={`min-h-screen p-6 transition-colors duration-300 ${
  isDark
    ? 'bg-linear-to-br from-gray-900 via-slate-900 to-indigo-950'
    : 'bg-linear-to-br from-gray-50 via-blue-50 to-indigo-50'
}`}>
  <div className="max-w-7xl mx-auto space-y-6">

    <div className={`rounded-xl shadow-lg border p-6 ${
      isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-linear-to-r from-blue-600 to-indigo-700">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Organization Chart
            </h1>
            <p className={`text-sm mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Visual hierarchy of your organization structure
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border font-medium transition-all ${
              isDark
                ? 'bg-gray-800 border-gray-600 text-gray-200 hover:bg-gray-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>

          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-linear-to-r from-blue-600 to-indigo-700 text-white hover:shadow-lg transition-all font-medium">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>
    </div>

    <div className={`rounded-xl shadow-lg border overflow-hidden ${
      isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <div className="bg-linear-to-r from-slate-700 to-slate-800 px-6 py-4">
        <h2 className="text-lg font-bold text-white">Organizational Hierarchy</h2>
      </div>
      <div className={`${isDark ? 'bg-gray-900' : 'bg-linear-to-br from-gray-50 to-white'}`}>
        <OrganizationTree data={dummyOrganizationTree} isDark={isDark} />
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[
        { label: 'Total Departments', value: 8, from: 'from-blue-500', to: 'to-blue-600' },
        { label: 'Team Members', value: 15, from: 'from-emerald-500', to: 'to-emerald-600' },
        { label: 'Hierarchy Levels', value: 4, from: 'from-violet-500', to: 'to-violet-600' }
      ].map((card, i) => (
        <div
          key={i}
          className={`rounded-xl shadow-lg p-6 text-white bg-linear-to-br ${card.from} ${card.to}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-90">{card.label}</p>
              <p className="text-3xl font-bold mt-2">{card.value}</p>
            </div>
            <Building2 className="w-12 h-12 opacity-70" />
          </div>
        </div>
      ))}
    </div>

  </div>
</div>

  );
}