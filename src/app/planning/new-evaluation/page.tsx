'use client'

import EvaluationRequest from "@/components/planning/EvaluationRequest"
import { useTheme } from "@/components/useTheme"

export default function Page() {
  const {isDark} = useTheme()
  return (
    <div className={`p-4 sm:p-6 lg:p-8 ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
        <div className="mb-6">
        <h1 className={`text-2xl sm:text-3xl font-bold  ${isDark ? 'text-white' :'text-gray-900'}`}>
          Planning | New Evaluation Request
        </h1>
        <p className={`mt-1 text-sm ${isDark ? 'text-white' :'text-gray-900'}`}>
          Create a new operational scenario evaluation request
        </p>
      </div>
        <EvaluationRequest isDark={false} />;
    </div>
  )
}