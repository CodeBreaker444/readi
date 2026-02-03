'use client';

import OrganizationTree from "@/src/components/organization/OrganizationTree";
import { dummyOrganizationTree } from "@/src/lib/dummydata";
import { Building2, Download, Maximize2, Minimize2 } from "lucide-react";
import { useState } from "react";


export default function OrganizationChartPage() {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-linear-to-r from-blue-600 to-indigo-700">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Organization Chart</h1>
                <p className="text-gray-600 text-sm mt-0.5">Visual hierarchy of your organization structure</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <>
                    <Minimize2 className="w-4 h-4" />
                    Collapse
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-4 h-4" />
                    Expand
                  </>
                )}
              </button>
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-linear-to-r from-blue-600 to-indigo-700 text-white hover:shadow-lg transition-all duration-200 font-medium">
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Organization Tree */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-linear-to-r from-slate-700 to-slate-800 px-6 py-4">
            <h2 className="text-lg font-bold text-white">Organizational Hierarchy</h2>
          </div>
          <div className="bg-linear-to-br from-gray-50 to-white">
            <OrganizationTree data={dummyOrganizationTree} />
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-linear-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Departments</p>
                <p className="text-3xl font-bold mt-2">8</p>
              </div>
              <Building2 className="w-12 h-12 text-blue-200" />
            </div>
          </div>
          <div className="bg-linear-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium">Team Members</p>
                <p className="text-3xl font-bold mt-2">15</p>
              </div>
              <Building2 className="w-12 h-12 text-emerald-200" />
            </div>
          </div>
          <div className="bg-linear-to-br from-violet-500 to-violet-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-violet-100 text-sm font-medium">Hierarchy Levels</p>
                <p className="text-3xl font-bold mt-2">4</p>
              </div>
              <Building2 className="w-12 h-12 text-violet-200" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}