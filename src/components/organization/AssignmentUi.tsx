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
import { Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
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
  const [form, setForm] = useState<FormData>(initial)
  const [jsonError, setJsonError] = useState("")

  useEffect(() => {
    setForm(initial)
    setJsonError("")
  }, [initial])

  const set = (k: keyof FormData, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const validateJson = (val: string) => {
    if (!val.trim()) { setJsonError(""); return }
    try { JSON.parse(val); setJsonError("") } 
    catch { setJsonError("Invalid JSON format") }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (form.assignment_json && jsonError) {
      toast.error("Please fix JSON syntax errors")
      return
    }
    onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="code">Code *</Label>
          <Input
            id="code"
            required
            value={form.assignment_code}
            onChange={(e) => set("assignment_code", e.target.value)}
            placeholder="ASSIGN-01"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ver">Version</Label>
          <Input
            id="ver"
            value={form.assignment_ver}
            onChange={(e) => set("assignment_ver", e.target.value)}
            placeholder="1.0"
          />
        </div>
        <div className="space-y-2">
          <Label>Active</Label>
          <Select 
            value={form.assignment_active} 
            onValueChange={(val: 'Y' | 'N') => set("assignment_active", val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Y">Yes</SelectItem>
              <SelectItem value="N">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="desc">Description *</Label>
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
          <Label htmlFor="json">JSON Schema</Label>
          {jsonError && (
            <span className="text-[10px] font-medium text-destructive animate-pulse">{jsonError}</span>
          )}
        </div>
        <Textarea
          id="json"
          rows={8}
          value={form.assignment_json}
          onChange={(e) => {
            set("assignment_json", e.target.value);
            validateJson(e.target.value);
          }}
          className={`font-mono text-xs transition-colors ${jsonError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
          placeholder='{ "type": "inspection" }'
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button 
          type="submit" 
          disabled={loading || !!jsonError}
          className="min-w-[120px]"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  )
}
