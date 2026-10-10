'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { BtfDrone } from '@/lib/btf/types'
import type { FlightLimits } from '@/lib/btf/scoring'
import axios from 'axios'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

type Field = { key: keyof FlightLimits; labelKey: string; step: number }

const FIELDS: Field[] = [
  { key: 'maxWindMs', labelKey: 'maxWind', step: 0.5 },
  { key: 'maxGustMs', labelKey: 'maxGust', step: 0.5 },
  { key: 'maxPrecipMmH', labelKey: 'maxRain', step: 0.5 },
  { key: 'minVisibilityM', labelKey: 'minVisibility', step: 100 },
  { key: 'minTempC', labelKey: 'minTemp', step: 1 },
  { key: 'maxTempC', labelKey: 'maxTemp', step: 1 },
]

interface Props {
  /** The drone whose model limits are edited (limits are shared by every drone of that model) */
  drone: BtfDrone | null
  onClose: () => void
  onSaved: (modelId: number, limits: FlightLimits) => void
}

export function BtfLimitsDialog({ drone, onClose, onSaved }: Props) {
  const { t } = useTranslation()
  const [values, setValues] = useState<Record<keyof FlightLimits, string> | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!drone) return
    setValues(Object.fromEntries(Object.entries(drone.limits).map(([k, v]) => [k, String(v)])) as Record<keyof FlightLimits, string>)
  }, [drone])

  const parsed = values
    ? (Object.fromEntries(FIELDS.map((f) => [f.key, values[f.key].trim() === '' ? NaN : Number(values[f.key])])) as unknown as FlightLimits)
    : null
  const valid = parsed !== null && Object.values(parsed).every(Number.isFinite) && parsed.minTempC < parsed.maxTempC

  const save = async () => {
    if (!drone?.modelId || !parsed || !valid) return
    setSaving(true)
    try {
      await axios.put('/api/operation/btf/limits', { modelId: drone.modelId, limits: parsed })
      toast.success(t('operations.calendar.btf.saved'))
      onSaved(drone.modelId, parsed)
      onClose()
    } catch {
      toast.error(t('operations.calendar.btf.saveError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={!!drone} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('operations.calendar.btf.limitsTitle')}</DialogTitle>
          <DialogDescription>
            {t('operations.calendar.btf.limitsDescription', { model: drone?.modelName ?? '' })}
          </DialogDescription>
        </DialogHeader>

        {drone && values && (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-violet-500">
              {t(`operations.calendar.btf.limitSource.${drone.limitsSource}`)}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {FIELDS.map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <Label htmlFor={`btf-${f.key}`} className="text-xs">
                    {t(`operations.calendar.btf.${f.labelKey}`)}
                  </Label>
                  <Input
                    id={`btf-${f.key}`}
                    type="number"
                    inputMode="decimal"
                    step={f.step}
                    value={values[f.key]}
                    onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                  />
                </div>
              ))}
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t('operations.calendar.btf.cancel')}
          </Button>
          <Button onClick={save} disabled={!valid || saving} className="bg-violet-600 text-white hover:bg-violet-700">
            {saving ? t('operations.calendar.btf.saving') : t('operations.calendar.btf.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
