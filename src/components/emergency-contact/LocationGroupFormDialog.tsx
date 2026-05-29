'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  EmergencyResponsePlan,
  ERP_TYPES,
  ErpType,
  LocationGroup,
  LocationGroupContact,
  LocationGroupLocation,
} from '@/config/types/erp'
import { cn } from '@/lib/utils'
import { MapPin, Plus, Search, Trash2, UserPlus, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LocationGroupMap } from './LocationGroupMap'

interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

interface PendingNewContact {
  _key: string
  type: ErpType
  contact: string
  description: string
}

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (data: {
    name: string
    notes: string
    is_active: boolean
    locations: LocationGroupLocation[]
    existing_contact_ids: number[]
    new_contacts: { type: ErpType; contact: string; description: string }[]
  }) => Promise<void>
  loading?: boolean
  isDark: boolean
  editRecord?: LocationGroup | null
  allErps: EmergencyResponsePlan[]
}

const DEFAULT_CONTACT: Omit<PendingNewContact, '_key'> = { type: 'GENERAL', contact: '', description: '' }
export function LocationGroupFormDialog({ open, onClose, onSubmit, loading, isDark, editRecord, allErps }: Props) {
  const { t } = useTranslation()
  const isEdit = !!editRecord

  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [locations, setLocations] = useState<LocationGroupLocation[]>([])
  const [selectedErpIds, setSelectedErpIds] = useState<number[]>([])
  const [pendingNewContacts, setPendingNewContacts] = useState<PendingNewContact[]>([])
  const [showNewContactForm, setShowNewContactForm] = useState(false)
  const [newContact, setNewContact] = useState<Omit<PendingNewContact, '_key'>>(DEFAULT_CONTACT)
  const [erpSearch, setErpSearch] = useState('')

  const [locationSearch, setLocationSearch] = useState('')
  const [locationResults, setLocationResults] = useState<NominatimResult[]>([])
  const [searchingLocation, setSearchingLocation] = useState(false)
  const [showLocationResults, setShowLocationResults] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!open) return
    if (editRecord) {
      setName(editRecord.name); setNotes(editRecord.notes ?? ''); setIsActive(editRecord.is_active)
      setLocations(editRecord.locations.map(l => ({ ...l }))); setSelectedErpIds(editRecord.contacts.map(c => c.id))
    } else {
      setName(''); setNotes(''); setIsActive(true); setLocations([]); setSelectedErpIds([])
    }
    setPendingNewContacts([]); setShowNewContactForm(false); setNewContact(DEFAULT_CONTACT)
    setLocationSearch(''); setLocationResults([]); setErpSearch('')
  }, [open, editRecord])

  const searchLocations = useCallback(async (query: string) => {
    if (query.trim().length < 3) { setLocationResults([]); setShowLocationResults(false); return }
    setSearchingLocation(true)
    try {
      let data: NominatimResult[] = []
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`, { headers: { 'Accept-Language': 'en' } })
        data = await res.json()
      } catch {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`, { headers: { 'Accept-Language': 'en' } })
        data = await res.json()
      }
      setLocationResults(data); setShowLocationResults(data.length > 0)
    } catch { setLocationResults([]) }
    finally { setSearchingLocation(false) }
  }, [])

  const handleLocationSearchChange = (val: string) => {
    setLocationSearch(val)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => searchLocations(val), 400)
  }

  const handleAddLocation = (result: NominatimResult) => {
    const lat = parseFloat(result.lat)
    const lng = parseFloat(result.lon)
    setLocations(prev => [...prev, { name: result.display_name, lat, lng }])
    setLocationSearch(''); setLocationResults([]); setShowLocationResults(false)
  }

  const handleSubmit = async () => {
    if (!name.trim()) return
    await onSubmit({
      name: name.trim(), notes: notes.trim(), is_active: isActive, locations,
      existing_contact_ids: selectedErpIds,
      new_contacts: pendingNewContacts.map(({ _key: _k, ...rest }) => rest),
    })
  }

  const bg = isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200'
  const inputCls = isDark ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-200 text-gray-900'
  const labelCls = `text-[10px] uppercase tracking-widest font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`
  const sectionCls = `p-4 rounded-lg border space-y-3 ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50/60'}`

  const ERP_TYPE_LABELS: Record<ErpType, string> = {
    GENERAL: t('erp.types.GENERAL'), MEDICAL: t('erp.types.MEDICAL'),
    FIRE: t('erp.types.FIRE'), SECURITY: t('erp.types.SECURITY'),
    ENVIRONMENTAL: t('erp.types.ENVIRONMENTAL'),
  }

  const filteredErps = allErps.filter(e =>
    !erpSearch.trim() ||
    e.contact.toLowerCase().includes(erpSearch.toLowerCase()) ||
    e.description.toLowerCase().includes(erpSearch.toLowerCase())
  )

  const selectedErpObjects: LocationGroupContact[] = selectedErpIds
    .map(id => { const e = allErps.find(x => x.id === id); return e ? { id: e.id, contact: e.contact, type: e.type, description: e.description } : null })
    .filter(Boolean) as LocationGroupContact[]

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className={cn('max-w-[95vw] sm:max-w-2xl lg:max-w-5xl w-full flex flex-col overflow-hidden p-0 gap-0', bg)}>
        <DialogHeader className="px-6 pt-5 pb-4 shrink-0">
          <DialogTitle className="text-lg font-semibold">
            {isEdit ? t('erp.locationGroup.editTitle') : t('erp.locationGroup.newTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden" style={{ height: '68vh', maxHeight: '75vh' }}>
          <div className="lg:flex-1 px-6 py-4 space-y-5 lg:overflow-y-auto" style={{ minWidth: 0 }}>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className={labelCls}>{t('erp.locationGroup.groupNameLabel')} <span className="text-red-500">*</span></Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder={t('erp.locationGroup.groupNamePlaceholder')} className={`h-10 ${inputCls}`} />
              </div>
              <div className="space-y-1.5">
                <Label className={labelCls}>{t('erp.locationGroup.notesLabel')} <span className={`text-[10px] font-normal ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t('erp.locationGroup.notesOptional')}</span></Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder={t('erp.locationGroup.notesPlaceholder')} className={`${inputCls} resize-none`} />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setIsActive(v => !v)}
                className={cn('relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0', isActive ? 'bg-emerald-500' : isDark ? 'bg-slate-600' : 'bg-slate-300')}>
                <span className={cn('inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform', isActive ? 'translate-x-4' : 'translate-x-0.5')} />
              </button>
              <span className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{isActive ? t('erp.locationGroup.statusActive') : t('erp.locationGroup.statusInactive')}</span>
            </div>

            {/* Locations */}
            <div className={sectionCls}>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-violet-500 shrink-0" />
                <span className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{t('erp.locationGroup.locationsTitle')}</span>
                <span className={`text-xs ml-auto ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t('erp.locationGroup.locationsCount', { count: locations.length })}</span>
              </div>

              <div className="relative">
                <div className="relative">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                  <Input
                    value={locationSearch} onChange={e => handleLocationSearchChange(e.target.value)}
                    onFocus={() => locationResults.length > 0 && setShowLocationResults(true)}
                    onBlur={() => setTimeout(() => setShowLocationResults(false), 200)}
                    placeholder={t('erp.locationGroup.locationSearchPlaceholder')} className={`h-9 pl-8 text-sm ${inputCls}`}
                  />
                  {searchingLocation && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className={`h-3.5 w-3.5 rounded-full border-2 border-t-transparent animate-spin ${isDark ? 'border-slate-500' : 'border-slate-400'}`} />
                    </div>
                  )}
                </div>
                {showLocationResults && locationResults.length > 0 && (
                  <div className={cn('absolute z-50 w-full mt-1 rounded-md border shadow-lg max-h-44 overflow-y-auto', isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200')}>
                    {locationResults.map(r => (
                      <button key={r.place_id} type="button" onMouseDown={() => handleAddLocation(r)}
                        className={cn('cursor-pointer w-full text-left px-3 py-2 text-xs flex items-start gap-2 transition-colors', isDark ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-violet-50 text-slate-700')}>
                        <MapPin className="h-3 w-3 text-violet-500 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{r.display_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {locations.length > 0 && (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {locations.map((loc, idx) => (
                    <div key={idx} className={cn('flex items-start gap-2 px-3 py-2 rounded-md text-xs', isDark ? 'bg-slate-700/60 text-slate-300' : 'bg-white text-slate-600 border border-slate-200')}>
                      <span className="shrink-0 h-4 w-4 rounded-full bg-violet-500 flex items-center justify-center text-[9px] font-bold text-white">{idx + 1}</span>
                      <span className="flex-1 leading-relaxed line-clamp-2">{loc.name}</span>
                      {loc.lat != null && <span className={`font-mono text-[10px] shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{loc.lat.toFixed(3)}, {loc.lng?.toFixed(3)}</span>}
                      <button type="button" onClick={() => setLocations(p => p.filter((_, i) => i !== idx))} className="cursor-pointer shrink-0 text-red-400 hover:text-red-500 transition-colors"><X className="h-3 w-3" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Contacts */}
            <div className={sectionCls}>
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-violet-500 shrink-0" />
                <span className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{t('erp.locationGroup.contactsTitle')}</span>
                <span className={`text-xs ml-auto ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t('erp.locationGroup.contactsCount', { count: selectedErpIds.length + pendingNewContacts.length })}</span>
              </div>

              {allErps.length > 0 && (
                <div className="space-y-2">
                  <Label className={cn(labelCls, 'text-[9px]')}>{t('erp.locationGroup.existingContactsLabel')}</Label>
                  <div className="relative">
                    <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                    <Input value={erpSearch} onChange={e => setErpSearch(e.target.value)} placeholder={t('erp.locationGroup.contactSearchPlaceholder')} className={`h-8 pl-7 text-xs ${inputCls}`} />
                  </div>
                  <div className={cn('rounded-md border overflow-y-auto max-h-32', isDark ? 'border-slate-700' : 'border-slate-200')}>
                    {filteredErps.length === 0
                      ? <p className={`text-xs px-3 py-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t('erp.locationGroup.noContactsFound')}</p>
                      : filteredErps.map(erp => {
                          const checked = selectedErpIds.includes(erp.id)
                          return (
                            <button key={erp.id} type="button" onClick={() => setSelectedErpIds(p => p.includes(erp.id) ? p.filter(x => x !== erp.id) : [...p, erp.id])}
                              className={cn('cursor-pointer w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-colors border-b last:border-b-0', isDark ? 'border-slate-700 hover:bg-slate-700/50' : 'border-slate-100 hover:bg-slate-50', checked && (isDark ? 'bg-violet-900/20' : 'bg-violet-50'))}>
                              <span className={cn('h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0', checked ? 'bg-violet-600 border-violet-600' : isDark ? 'border-slate-600' : 'border-slate-300')}>
                                {checked && <span className="text-white text-[8px] font-bold">✓</span>}
                              </span>
                              <span className={`font-medium flex-1 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{erp.contact}</span>
                              <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>{erp.type}</span>
                            </button>
                          )
                        })}
                  </div>
                </div>
              )}

              {selectedErpObjects.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedErpObjects.map(c => (
                    <span key={c.id} className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium', isDark ? 'bg-violet-900/30 text-violet-300 border border-violet-700/50' : 'bg-violet-100 text-violet-700 border border-violet-200')}>
                      {c.contact}
                      <button type="button" onClick={() => setSelectedErpIds(p => p.filter(x => x !== c.id))} className="cursor-pointer ml-0.5 hover:text-red-400 transition-colors"><X className="h-2.5 w-2.5" /></button>
                    </span>
                  ))}
                </div>
              )}

              {pendingNewContacts.length > 0 && (
                <div className="space-y-1">
                  <Label className={cn(labelCls, 'text-[9px]')}>{t('erp.locationGroup.pendingContactsLabel')}</Label>
                  {pendingNewContacts.map(c => (
                    <div key={c._key} className={cn('flex items-center gap-2 px-3 py-2 rounded-md text-xs', isDark ? 'bg-slate-700/60 text-slate-300' : 'bg-white text-slate-600 border border-slate-200')}>
                      <span className="font-medium">{c.contact}</span>
                      <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>{c.type}</span>
                      <button type="button" onClick={() => setPendingNewContacts(p => p.filter(x => x._key !== c._key))} className="cursor-pointer ml-auto text-red-400 hover:text-red-500 transition-colors"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  ))}
                </div>
              )}

              {showNewContactForm ? (
                <div className={cn('p-3 rounded-md border space-y-2.5', isDark ? 'border-slate-600 bg-slate-800' : 'border-slate-200 bg-white')}>
                  <Label className={cn(labelCls, 'text-[9px]')}>{t('erp.locationGroup.newContactLabel')}</Label>
                  <Select value={newContact.type} onValueChange={v => setNewContact(p => ({ ...p, type: v as ErpType }))}>
                    <SelectTrigger className={`h-8 text-xs ${inputCls}`}><SelectValue /></SelectTrigger>
                    <SelectContent className={isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white'}>
                      {ERP_TYPES.map(tp => <SelectItem key={tp} value={tp} className="text-xs">{ERP_TYPE_LABELS[tp]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input value={newContact.contact} onChange={e => setNewContact(p => ({ ...p, contact: e.target.value }))} placeholder={t('erp.locationGroup.contactNamePlaceholder')} className={`h-8 text-xs ${inputCls}`} />
                  <Input value={newContact.description} onChange={e => setNewContact(p => ({ ...p, description: e.target.value }))} placeholder={t('erp.locationGroup.descriptionPlaceholder')} className={`h-8 text-xs ${inputCls}`} />
                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={() => {
                      if (!newContact.contact.trim() || !newContact.description.trim()) return
                      setPendingNewContacts(p => [...p, { ...newContact, _key: `${Date.now()}-${Math.random()}` }])
                      setNewContact(DEFAULT_CONTACT); setShowNewContactForm(false)
                    }} disabled={!newContact.contact.trim() || !newContact.description.trim()} className="h-7 text-xs bg-violet-600 hover:bg-violet-500 text-white px-3">{t('erp.locationGroup.addContact')}</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => { setShowNewContactForm(false); setNewContact(DEFAULT_CONTACT) }} className={`h-7 text-xs ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500'}`}>{t('erp.locationGroup.cancelContact')}</Button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setShowNewContactForm(true)}
                  className={cn('flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-md border border-dashed transition-colors w-full', isDark ? 'border-slate-600 text-slate-400 hover:border-violet-500 hover:text-violet-400' : 'border-slate-300 text-slate-500 hover:border-violet-400 hover:text-violet-600')}>
                  <Plus className="h-3.5 w-3.5" /> {t('erp.locationGroup.createNewContact')}
                </button>
              )}
            </div>

          </div>

          <div className={cn('w-full lg:w-80 shrink-0 flex flex-col border-t lg:border-t-0 lg:border-l', isDark ? 'border-slate-700' : 'border-slate-200')}>
            <div className={cn('px-3 py-2 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 shrink-0 border-b', isDark ? 'text-slate-400 border-slate-700' : 'text-slate-500 border-slate-200')}>
              <MapPin className="h-3 w-3 text-violet-500" />
              {t('erp.locationGroup.mapPreviewTitle')}
              {locations.length > 0 && (
                <span className={cn('ml-auto font-normal normal-case text-xs', isDark ? 'text-slate-500' : 'text-slate-400')}>
                  {t('erp.locationGroup.mapPinsCount', { count: locations.length })}
                </span>
              )}
            </div>
            <LocationGroupMap locations={locations} isDark={isDark} height={340} />
          </div>

        </div>

        <DialogFooter className={cn('shrink-0 px-6 py-4 border-t', isDark ? 'border-slate-700' : 'border-slate-200')}>
          <Button type="button" variant="ghost" onClick={onClose} className={isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'}>
            {t('erp.locationGroup.cancel')}
          </Button>
          <Button type="button" disabled={loading || !name.trim()} onClick={handleSubmit} className="bg-violet-600 hover:bg-violet-500 text-white px-8 shadow-lg shadow-violet-500/20">
            {loading ? t('erp.locationGroup.saving') : isEdit ? t('erp.locationGroup.updateGroup') : t('erp.locationGroup.createGroup')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
