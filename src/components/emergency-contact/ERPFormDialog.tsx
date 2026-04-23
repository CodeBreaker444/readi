'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ERP_TYPES, ErpType } from '@/config/types/erp'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface FormState {
  description: string
  contact: string
  type: ErpType
}

interface FormErrors {
  description?: string
  contact?: string
  type?: string
}

const DEFAULT_STATE: FormState = {
  description: '',
  contact: '',
  type: 'GENERAL',
}

function validate(values: FormState): FormErrors {
  const errors: FormErrors = {}
  if (!values.description || values.description.trim().length < 1)
    errors.description = 'Description is required'
  if (!values.contact || values.contact.trim().length < 1)
    errors.contact = 'Contact is required'
  return errors
}

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (values: FormState) => Promise<void>
  loading?: boolean
  isDark: boolean
}

export function ERPFormDialog({ open, onClose, onSubmit, loading, isDark }: Props) {
  const { t } = useTranslation()
  const [form, setForm] = useState<FormState>(DEFAULT_STATE)
  const [errors, setErrors] = useState<FormErrors>({})

  useEffect(() => {
    if (open) {
      setForm(DEFAULT_STATE)
      setErrors({})
    }
  }, [open])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate(form)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    await onSubmit(form)
  }

  const bgClass = isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-gray-900'
  const inputClass = isDark ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-200 text-gray-900'
  const labelClass = isDark ? 'text-slate-400' : 'text-slate-500'

  const typeLabels: Record<ErpType, string> = {
    GENERAL: t('erp.types.GENERAL'),
    MEDICAL: t('erp.types.MEDICAL'),
    FIRE: t('erp.types.FIRE'),
    SECURITY: t('erp.types.SECURITY'),
    ENVIRONMENTAL: t('erp.types.ENVIRONMENTAL'),
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className={`max-w-lg transition-colors duration-300 ${bgClass}`}>
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {t('erp.form.title')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">

            <div className="space-y-1.5">
              <Label className={`text-[10px] uppercase tracking-widest font-bold ${labelClass}`}>
                {t('erp.form.type')}
              </Label>
              <Select value={form.type} onValueChange={(v) => set('type', v as ErpType)}>
                <SelectTrigger className={`h-10 ${inputClass}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white'}>
                  {ERP_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {typeLabels[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className={`text-[10px] uppercase tracking-widest font-bold ${labelClass}`}>
                {t('erp.form.contact')}
              </Label>
              <Input
                value={form.contact}
                onChange={(e) => set('contact', e.target.value)}
                placeholder={t('erp.form.contactPlaceholder')}
                className={`h-10 ${inputClass}`}
              />
              {errors.contact && <p className="text-red-500 text-xs font-medium">{errors.contact}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className={`text-[10px] uppercase tracking-widest font-bold ${labelClass}`}>
                {t('erp.form.description')}
              </Label>
              <Textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                rows={4}
                placeholder={t('erp.form.descriptionPlaceholder')}
                className={`${inputClass} resize-none`}
              />
              {errors.description && <p className="text-red-500 text-xs font-medium">{errors.description}</p>}
            </div>

          </div>

          <DialogFooter className="pt-4 border-t border-slate-700/50 mt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className={`${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              {t('erp.form.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-violet-600 hover:bg-violet-500 text-white px-8 shadow-lg shadow-violet-500/20"
            >
              {loading ? t('erp.form.processing') : t('erp.form.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
