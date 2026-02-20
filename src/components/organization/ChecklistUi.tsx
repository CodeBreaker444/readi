import { useEffect, useState } from "react";
import { HiX } from "react-icons/hi";
 
export function Modal({ open, title, onClose, children, isDark }: {
  open: boolean; title: string; onClose: () => void; children: React.ReactNode, isDark: boolean
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className={`${isDark ? 'bg-[#0f1117] border-slate-800' : 'bg-white border-slate-200'} border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`px-6 py-4 border-b ${isDark ? 'border-slate-800 bg-slate-900/20 text-slate-200' : 'border-slate-100 bg-slate-50 text-slate-900'} flex items-center justify-between`}>
          <h3 className="font-semibold text-base tracking-tight">{title}</h3>
          <button onClick={onClose} className={`p-2 ${isDark ? 'hover:bg-slate-800 text-slate-500' : 'hover:bg-slate-200 text-slate-400'} rounded-lg transition-colors`}>
            <HiX className="text-xl" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">{children}</div>
      </div>
    </div>
  )
}

 
export function Badge({ active }: { active: string | null }) {
  const isActive = active === 'Y'
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-widest uppercase border transition-colors ${isActive
        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
        : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
      }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse' : 'bg-slate-600'}`} />
      {isActive ? 'Active' : 'Inactive'}
    </span>
  )
}

 type FormData = {
  checklist_code: string
  checklist_ver: string
  checklist_active: 'Y' | 'N'
  checklist_desc: string
  checklist_json: string
}

export function ChecklistForm({ initial, onSubmit, loading, submitLabel, isDark }: {
  initial: FormData; onSubmit: (f: FormData) => void; loading: boolean; submitLabel: string; isDark: boolean
}) {
  const [form, setForm] = useState<FormData>(initial)
  const [jsonError, setJsonError] = useState<string | null>(null)

  useEffect(() => { setForm(initial) }, [initial])

  const setField = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [k]: e.target.value }))
    if (k === 'checklist_json') setJsonError(null)
  }

  const validateJsonSchema = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString)
      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { valid: false, error: 'JSON must be an object' }
      }
      return { valid: true, error: null }
    } catch (e) {
      return { valid: false, error: (e as Error).message }
    }
  }

  const handleJsonCheck = () => {
    const { valid, error } = validateJsonSchema(form.checklist_json)
    if (valid) setJsonError('✓ Valid JSON Schema')
    else setJsonError(error ?? 'Invalid JSON Format')
  }

  const inputClass = `w-full border rounded-xl px-4 py-2.5 font-mono text-sm outline-none transition-all ${
    isDark 
      ? 'bg-[#070a12] border-slate-800 text-slate-200 placeholder:text-slate-700 focus:border-blue-500/50' 
      : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500'
  }`
  const labelClass = `block mb-2 font-mono text-[10px] uppercase tracking-widest font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`

  return (
    <form onSubmit={(e) => { e.preventDefault(); const { valid, error } = validateJsonSchema(form.checklist_json); if (!valid) { setJsonError(error); return; } onSubmit(form); }} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Protocol Code *</label>
          <input className={inputClass} value={form.checklist_code} onChange={setField('checklist_code')} placeholder="PRE-FLIGHT-01" required />
        </div>
        <div>
          <label className={labelClass}>Version</label>
          <input className={inputClass} value={form.checklist_ver} onChange={setField('checklist_ver')} placeholder="1.0" />
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <select className={inputClass} value={form.checklist_active} onChange={setField('checklist_active')}>
            <option value="Y">Active (Y)</option>
            <option value="N">Inactive (N)</option>
          </select>
        </div>
      </div>
      <div>
        <label className={labelClass}>Description *</label>
        <input className={inputClass} value={form.checklist_desc} onChange={setField('checklist_desc')} placeholder="Task description..." required />
      </div>
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className={labelClass}>JSON Schema (SurveyJS)</label>
          <button type="button" onClick={handleJsonCheck} className={`px-3 py-1 rounded-md border text-[10px] transition-colors uppercase ${isDark ? 'border-slate-800 text-slate-500 hover:bg-slate-800' : 'border-slate-200 text-slate-400 hover:bg-slate-50'}`}>
            Validate
          </button>
        </div>
        <textarea className={`${inputClass} h-48 resize-none leading-relaxed`} value={form.checklist_json} onChange={setField('checklist_json')} />
        {jsonError && <p className={`mt-2 text-[11px] font-mono ${jsonError.startsWith('✓') ? 'text-emerald-500' : 'text-rose-500'}`}>{jsonError}</p>}
      </div>
      <button type="submit" disabled={loading} className={`w-full py-3 rounded-xl text-white font-mono text-sm font-bold uppercase tracking-widest transition-all ${loading ? 'bg-slate-800 opacity-50 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:shadow-blue-500/20 active:scale-95'}`}>
        {loading ? 'Processing...' : submitLabel}
      </button>
    </form>
  )
}
