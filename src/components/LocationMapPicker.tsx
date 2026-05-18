'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Crosshair, MapPin, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface LocationMapPickerProps {
  latitude: string;
  longitude: string;
  onLatChange: (v: string) => void;
  onLonChange: (v: string) => void;
  isDark?: boolean;
}

function MapPickerInner({ latitude, longitude, onLatChange, onLonChange, isDark }: LocationMapPickerProps) {
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);

  const lat = parseFloat(latitude) || 0;
  const lng = parseFloat(longitude) || 0;
  const hasPin = !!latitude && !!longitude && !isNaN(parseFloat(latitude)) && !isNaN(parseFloat(longitude));

  useEffect(() => {
    if (!expanded || !containerRef.current) return;

    const L = require('leaflet');
    require('leaflet/dist/leaflet.css');

    // Fix default icon
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      markerRef.current = null;
    }

    const center: [number, number] = hasPin ? [lat, lng] : [41.9028, 12.4964];
    const map = L.map(containerRef.current, { zoomControl: true }).setView(center, hasPin ? 13 : 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    if (hasPin) {
      const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
      marker.on('dragend', (e: any) => {
        const pos = e.target.getLatLng();
        onLatChange(pos.lat.toFixed(6));
        onLonChange(pos.lng.toFixed(6));
      });
      markerRef.current = marker;
    }

    map.on('click', (e: any) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;
      onLatChange(clickLat.toFixed(6));
      onLonChange(clickLng.toFixed(6));
      if (markerRef.current) {
        markerRef.current.setLatLng([clickLat, clickLng]);
      } else {
        const m = L.marker([clickLat, clickLng], { draggable: true }).addTo(map);
        m.on('dragend', (de: any) => {
          const pos = de.target.getLatLng();
          onLatChange(pos.lat.toFixed(6));
          onLonChange(pos.lng.toFixed(6));
        });
        markerRef.current = m;
      }
    });

    mapRef.current = map;
    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; markerRef.current = null; }
    };
  }, [expanded]);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    if (hasPin) markerRef.current.setLatLng([lat, lng]);
  }, [lat, lng]);

  const handleLocate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      onLatChange(pos.coords.latitude.toFixed(6));
      onLonChange(pos.coords.longitude.toFixed(6));
      if (mapRef.current) mapRef.current.setView([pos.coords.latitude, pos.coords.longitude], 15);
    });
  };

  const inputCls = isDark ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder:text-slate-500' : '';

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className={`text-xs pb-1 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Latitude</Label>
          <Input
            className={inputCls}
            value={latitude}
            onChange={e => onLatChange(e.target.value)}
            placeholder="e.g. 41.902782"
            type="number"
            step="any"
          />
        </div>
        <div>
          <Label className={`text-xs pb-1 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Longitude</Label>
          <Input
            className={inputCls}
            value={longitude}
            onChange={e => onLonChange(e.target.value)}
            placeholder="e.g. 12.496366"
            type="number"
            step="any"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setExpanded(v => !v)}
          className={`h-7 cursor-pointer gap-1.5 text-xs ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : ''}`}
        >
          <MapPin className="h-3 w-3" />
          {expanded ? 'Hide map' : 'Pin on map'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleLocate}
          className={`h-7 cursor-pointer gap-1.5 text-xs ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : ''}`}
        >
          <Crosshair className="h-3 w-3" />
          Use my location
        </Button>
        {hasPin && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => { onLatChange(''); onLonChange(''); }}
            className="h-7 cursor-pointer gap-1 text-xs text-red-500 hover:text-red-600"
          >
            <X className="h-3 w-3" /> Clear
          </Button>
        )}
      </div>

      {expanded && (
        <div
          ref={containerRef}
          className={`rounded-lg border overflow-hidden ${isDark ? 'border-slate-600' : 'border-slate-200'}`}
          style={{ height: 260 }}
        />
      )}

      {hasPin && !expanded && (
        <p className={`text-[11px] flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          <MapPin className="h-3 w-3 text-violet-500" />
          Pinned at {parseFloat(latitude).toFixed(5)}, {parseFloat(longitude).toFixed(5)}
        </p>
      )}
    </div>
  );
}

export default function LocationMapPicker(props: LocationMapPickerProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <Label className="text-xs pb-1">Latitude</Label>
        <Input value={props.latitude} onChange={e => props.onLatChange(e.target.value)} placeholder="e.g. 41.902782" type="number" step="any" />
      </div>
      <div>
        <Label className="text-xs pb-1">Longitude</Label>
        <Input value={props.longitude} onChange={e => props.onLonChange(e.target.value)} placeholder="e.g. 12.496366" type="number" step="any" />
      </div>
    </div>
  );
  return <MapPickerInner {...props} />;
}
