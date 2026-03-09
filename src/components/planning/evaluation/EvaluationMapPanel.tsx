'use client';

import { MapPin } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

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

export function EvaluationMapPanel({ evaluationId, polygonData }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [noPolygon, setNoPolygon] = useState(false);

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
        const { default: L } = await import('leaflet');

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
            { 'Street Map': osm, Satellite: esriSat },
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
  }, [polygonData]);

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
            <p className="text-sm font-medium text-slate-500">No operation area defined</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Draw a polygon on the map to define the evaluation area.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapContainerRef}
      className="h-[30vh] min-h-64 border border-slate-200 rounded-lg z-0"
    />
  );
}