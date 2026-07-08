import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Check, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

export type FormData = {
  assignment_code: string
  assignment_ver: string
  assignment_active: "Y" | "N"
  assignment_desc: string
  assignment_json: string
}

export function StatusBadge({ active }: { active: string | null }) {
  const isActive = active === "Y"
  return (
    <Badge
      variant={isActive ? "default" : "secondary"}
      className={isActive ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10 border-emerald-500/20" : ""}
    >
      {isActive ? "Active" : "Inactive"}
    </Badge>
  )
}

export function AssignmentModal({
  open,
  title,
  onClose,
  children,
  isDark,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
  isDark: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden border-slate-800">
        <DialogHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
        </DialogHeader>
        <div className="p-6 max-h-[80vh] overflow-y-auto">{children}</div>
      </DialogContent>
    </Dialog>
  )
}

export function AssignmentForm({
  initial,
  onSubmit,
  loading,
  submitLabel,
  isDark,
}: {
  initial: FormData
  onSubmit: (f: FormData) => void
  loading: boolean
  submitLabel: string
  isDark: boolean
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState<FormData>(initial)
  const [jsonError, setJsonError] = useState("")
  const [jsonValid, setJsonValid] = useState(false)

  useEffect(() => {
    setForm(initial)
    setJsonError("")
    setJsonValid(false)
  }, [initial])

  const set = (k: keyof FormData, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const validateJson = (val: string) => {
    if (!val.trim()) { setJsonError(""); setJsonValid(false); return }
    try { 
      JSON.parse(val); 
      setJsonError(t('organization.assignments.validJsonSchema'))
      setJsonValid(true)
    } 
    catch { 
      setJsonError(t('organization.common.invalidJsonFormat'))
      setJsonValid(false)
    }
  }

  const handleJsonCheck = () => {
    validateJson(form.assignment_json)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (form.assignment_json && jsonError) {
      toast.error(t('organization.assignments.invalidJsonError'))
      return
    }
    onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="code">{t('organization.common.code')} *</Label>
          <Input
            id="code"
            required
            value={form.assignment_code}
            onChange={(e) => set("assignment_code", e.target.value)}
            placeholder="ASSIGN-01"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ver">{t('organization.common.version')}</Label>
          <Input
            id="ver"
            value={form.assignment_ver}
            onChange={(e) => set("assignment_ver", e.target.value)}
            placeholder="1.0"
          />
        </div>
        <div className="space-y-2">
          <Label>{t('organization.common.status')}</Label>
          <Select 
            value={form.assignment_active} 
            onValueChange={(val: 'Y' | 'N') => set("assignment_active", val)}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('organization.common.selectStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Y">{t('organization.common.yes')}</SelectItem>
              <SelectItem value="N">{t('organization.common.no')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="desc">{t('organization.common.description')} *</Label>
        <Input
          id="desc"
          required
          value={form.assignment_desc}
          onChange={(e) => set("assignment_desc", e.target.value)}
          placeholder="Main task description"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="json">{t('organization.assignments.jsonSchema')}</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleJsonCheck}
            className={`h-7 px-3 text-xs gap-1.5 ${
              isDark
                ? "border-gray-700 bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
                : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700"
            }`}
          >
            <Check size={12} />
            {t('organization.checklist.validateJson')}
          </Button>
        </div>
        {jsonError && (
          <span className={`text-[10px] font-medium ${jsonValid ? 'text-emerald-500' : 'text-destructive'} animate-pulse`}>{jsonError}</span>
        )}
        <Textarea
          id="json"
          rows={8}
          value={form.assignment_json}
          onChange={(e) => {
            set("assignment_json", e.target.value);
            setJsonError("");
            setJsonValid(false);
          }}
          className={`font-mono text-xs transition-colors resize-none ${
            jsonError 
              ? jsonValid 
                ? 'border-emerald-500/50 focus-visible:ring-emerald-500/30' 
                : 'border-destructive focus-visible:ring-destructive' 
              : ''
          }`}
          placeholder='{ "type": "inspection" }'
          style={{ minHeight: '200px', maxHeight: '200px' }}
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button 
          type="submit" 
          disabled={loading || !!jsonError}
          className="min-w-[120px] bg-violet-600 hover:bg-violet-500"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('organization.common.saving')}
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  )
}
