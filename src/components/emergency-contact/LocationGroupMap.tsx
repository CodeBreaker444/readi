'use client'

import { LocationGroupLocation } from '@/config/types/erp'
import { cn } from '@/lib/utils'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, ZoomIn, ZoomOut } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

const TILE_LIGHT = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
const TILE_DARK  = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'

function makePinIcon(index: number) {
  return L.divIcon({
    html: `<div style="position:relative;width:24px;height:36px">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
        <path d="M12 0C5.373 0 0 5.373 0 12c0 8.25 12 24 12 24s12-15.75 12-24C24 5.373 18.627 0 12 0z" fill="#8b5cf6"/>
        <circle cx="12" cy="12" r="5" fill="white"/>
      </svg>
      <span style="position:absolute;top:-16px;left:50%;transform:translateX(-50%);background:#8b5cf6;color:white;font-size:9px;font-weight:700;padding:1px 4px;border-radius:3px;white-space:nowrap">${index}</span>
    </div>`,
    className: '',
    iconSize: [24, 36],
    iconAnchor: [12, 36],
  })
}

interface Props {
  locations: LocationGroupLocation[]
  isDark: boolean
  height?: number
}

export function LocationGroupMap({ locations, isDark, height = 320 }: Props) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<L.Map | null>(null)
  const tileRef      = useRef<L.TileLayer | null>(null)
  const markersRef   = useRef<L.Marker[]>([])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current, { center: [20, 0], zoom: 2, zoomControl: false })
    tileRef.current = L.tileLayer(isDark ? TILE_DARK : TILE_LIGHT, {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map)
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
      tileRef.current = null
      markersRef.current = []
    }
  }, []) 

  // Swap tile layer on theme change
  useEffect(() => {
    if (!mapRef.current || !tileRef.current) return
    tileRef.current.remove()
    tileRef.current = L.tileLayer(isDark ? TILE_DARK : TILE_LIGHT, {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapRef.current)
  }, [isDark])

  // Sync numbered markers whenever locations change
  useEffect(() => {
    if (!mapRef.current) return
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    locations.forEach((loc, idx) => {
      if (loc.lat != null && loc.lng != null) {
        markersRef.current.push(
          L.marker([loc.lat!, loc.lng!], { icon: makePinIcon(idx + 1) }).addTo(mapRef.current!)
        )
      }
    })

    const valid = locations.filter(l => l.lat != null && l.lng != null)
    if (valid.length === 1) {
      mapRef.current.setView([valid[0].lat!, valid[0].lng!], Math.max(mapRef.current.getZoom(), 11))
    } else if (valid.length > 1) {
      mapRef.current.fitBounds(
        L.latLngBounds(valid.map(l => [l.lat!, l.lng!] as [number, number])),
        { padding: [40, 40] }
      )
    }
  }, [locations])

  return (
    <div className="relative w-full" style={{ height }}>
      <div ref={containerRef} className="absolute inset-0" />

      <div className="absolute top-2 right-2 z-[400] flex flex-col gap-1">
        <button
          type="button"
          onClick={() => mapRef.current?.zoomIn()}
          className={cn(
            'h-7 w-7 cursor-pointer rounded-md border flex items-center justify-center shadow-sm transition-colors',
            isDark ? 'bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50',
          )}
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => mapRef.current?.zoomOut()}
          className={cn(
            'h-7 w-7 cursor-pointer rounded-md border flex items-center justify-center shadow-sm transition-colors',
            isDark ? 'bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50',
          )}
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
      </div>

      {locations.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-[300]">
          <div className={cn('text-center px-4 py-3 rounded-lg', isDark ? 'bg-slate-800/80' : 'bg-white/80')}>
            <MapPin className={cn('h-6 w-6 mx-auto mb-1', isDark ? 'text-slate-500' : 'text-slate-300')} />
            <p className={cn('text-xs max-w-37.5', isDark ? 'text-slate-500' : 'text-slate-400')}>
              {t('erp.locationGroup.mapEmptyHint')}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
