'use client';

import { MapPin } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  evaluationId: number;
  polygonData: {
    type: string;
    features: any[];
  } | null;
}

function normaliseToFeatureCollection(raw: any): { type: string; features: any[] } | null {
  if (!raw) return null;

  if (raw.type === 'FeatureCollection' && Array.isArray(raw.features)) {
    return raw.features.length > 0 ? raw : null;
  }
  if (raw.type === 'Feature' && raw.geometry) {
    return { type: 'FeatureCollection', features: [raw] };
  }
  if (raw.type === 'Polygon' || raw.type === 'MultiPolygon') {
    return {
      type: 'FeatureCollection',
      features: [{ type: 'Feature', properties: {}, geometry: raw }],
    };
  }
  if (Array.isArray(raw)) {
    const features = raw
      .map((item: any) => {
        if (item.type === 'Feature') return item;
        if (item.type === 'Polygon' || item.type === 'MultiPolygon') {
          return { type: 'Feature', properties: {}, geometry: item };
        }
        return null;
      })
      .filter(Boolean);
    return features.length > 0 ? { type: 'FeatureCollection', features } : null;
  }
  return null;
}

function ensureLeafletCSS() {
  const LEAFLET_CSS_ID = 'leaflet-css';
  if (document.getElementById(LEAFLET_CSS_ID)) return;

  const link = document.createElement('link');
  link.id = LEAFLET_CSS_ID;
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
  link.crossOrigin = '';
  document.head.appendChild(link);
}

export function EvaluationMapPanel({ evaluationId, polygonData }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [noPolygon, setNoPolygon] = useState(false);
  const { t } = useTranslation(); // <-- Added

  useEffect(() => {
    const normalised = normaliseToFeatureCollection(polygonData);

    if (!normalised) {
      setNoPolygon(true);
      return;
    }

    setNoPolygon(false);
    let cancelled = false;
    const features = normalised.features;

    async function init() {
      try {
        ensureLeafletCSS();

        const { default: L } = await import('leaflet');

        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });

        if (cancelled || !mapContainerRef.current) return;

        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        const map = L.map(mapContainerRef.current, {
          zoomControl: true,
          attributionControl: false,
        });
        mapInstanceRef.current = map;

        const osm = L.tileLayer(
          'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          { maxZoom: 19, attribution: '© OpenStreetMap contributors' },
        ).addTo(map);

        const esriSat = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          { maxZoom: 19, attribution: 'Tiles © Esri' },
        );

        L.control
          .layers(
            { [t('planning.map.streetMap')]: osm, [t('planning.map.satellite')]: esriSat },
            {},
            { collapsed: true, position: 'topright' },
          )
          .addTo(map);

        const palette = ['#6d28d9', '#059669', '#dc2626', '#d97706', '#0ea5e9'];
        const allLayers: any[] = [];

        features.forEach((feature: any, idx: number) => {
          const color = palette[idx % palette.length];
          const layer = L.geoJSON(feature, {
            style: {
              color,
              weight: 2.5,
              opacity: 0.9,
              fillColor: color,
              fillOpacity: 0.18,
              dashArray: idx === 0 ? undefined : '6 4',
            },
          }).addTo(map);
          allLayers.push(layer);
        });

        if (allLayers.length > 0) {
          const group = L.featureGroup(allLayers);
          map.fitBounds(group.getBounds(), { padding: [30, 30], maxZoom: 16 });
        } else {
          map.setView([41.9, 12.5], 6);
        }

        setTimeout(() => {
          if (!cancelled && mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize({ animate: false });
          }
        }, 300);
      } catch (err) {
        console.error('Map init failed:', err);
        if (!cancelled) setNoPolygon(true);
      }
    }

    init();

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [polygonData, t]);

  useEffect(() => {
    if (!mapContainerRef.current || !mapInstanceRef.current) return;

    const observer = new ResizeObserver(() => {
      mapInstanceRef.current?.invalidateSize({ animate: false });
    });
    observer.observe(mapContainerRef.current);

    return () => observer.disconnect();
  }, [noPolygon]);

  if (noPolygon) {
    return (
      <div className="h-[30vh] border border-dashed border-slate-200 rounded-lg flex items-center justify-center bg-slate-50/50">
        <div className="text-center space-y-2">
          <div className="mx-auto w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
            <MapPin className="h-5 w-5 text-slate-300" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">{t('planning.map.noArea')}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {t('planning.map.drawPolygon')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapContainerRef}
      style={{ position: 'relative', overflow: 'hidden', zIndex: 0 }}
      className="h-[30vh] min-h-64 border border-slate-200 rounded-lg"
    />
  );
}