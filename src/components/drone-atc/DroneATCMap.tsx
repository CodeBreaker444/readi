'use client';

import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { TelemetryData, DroneMap } from './useDroneATCSocket';
import type { AircraftState } from '@/app/api/drone-atc/flights/route';

interface DroneATCMapProps {
  drones: DroneMap;
  aircraft: AircraftState[];
  selectedDroneId: string | null;
  showDrones: boolean;
  showFlights: boolean;
  onDroneClick: (droneId: string) => void;
  isDark: boolean;
}

const TILE_LIGHT = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

function droneIcon(selected: boolean, status?: string): L.DivIcon {
  const color = status === 'online' || !status ? (selected ? '#3b82f6' : '#10b981') : '#6b7280';
  return L.divIcon({
    className: '',
    html: `<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="14" cy="14" r="13" fill="${color}" fill-opacity="0.15" stroke="${color}" stroke-width="2"/>
      <polygon points="14,4 18,20 14,17 10,20" fill="${color}"/>
      ${selected ? `<circle cx="14" cy="14" r="11" stroke="${color}" stroke-width="1.5" stroke-dasharray="3 2" fill="none"/>` : ''}
    </svg>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function aircraftIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="11" cy="11" r="10" fill="#f59e0b" fill-opacity="0.15" stroke="#f59e0b" stroke-width="1.5"/>
      <path d="M11 3 L13 11 L11 9.5 L9 11Z" fill="#f59e0b"/>
      <path d="M6 10 L11 11 L16 10" stroke="#f59e0b" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

export default function DroneATCMap({
  drones,
  aircraft,
  selectedDroneId,
  showDrones,
  showFlights,
  onDroneClick,
  isDark,
}: DroneATCMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const droneLayerRef = useRef<L.LayerGroup | null>(null);
  const flightLayerRef = useRef<L.LayerGroup | null>(null);
  const droneMarkersRef = useRef<Record<string, L.Marker>>({});
  const flightMarkersRef = useRef<Record<string, L.Marker>>({});

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [20, 0],
      zoom: 3,
      zoomControl: true,
    });

    const tile = L.tileLayer(isDark ? TILE_DARK : TILE_LIGHT, {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    const droneLayer = L.layerGroup().addTo(map);
    const flightLayer = L.layerGroup().addTo(map);

    mapRef.current = map;
    tileLayerRef.current = tile;
    droneLayerRef.current = droneLayer;
    flightLayerRef.current = flightLayer;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!tileLayerRef.current || !mapRef.current) return;
    tileLayerRef.current.setUrl(isDark ? TILE_DARK : TILE_LIGHT);
  }, [isDark]);

  const updateDroneMarkers = useCallback(() => {
    const layer = droneLayerRef.current;
    if (!layer) return;

    if (!showDrones) { layer.clearLayers(); droneMarkersRef.current = {}; return; }

    const existing = droneMarkersRef.current;
    const seen = new Set<string>();

    Object.values(drones).forEach((d: TelemetryData) => {
      seen.add(d.drone_id);
      const selected = d.drone_id === selectedDroneId;
      const icon = droneIcon(selected, d.status);

      if (existing[d.drone_id]) {
        existing[d.drone_id].setLatLng([d.latitude, d.longitude]).setIcon(icon);
      } else {
        const marker = L.marker([d.latitude, d.longitude], { icon })
          .bindTooltip(`${d.name ?? d.drone_id}<br>${d.battery_percentage}% • ${Math.round(d.altitude)}m`, {
            permanent: false,
            direction: 'top',
          })
          .on('click', () => onDroneClick(d.drone_id));
        marker.addTo(layer);
        existing[d.drone_id] = marker;
      }
    });

    Object.keys(existing).forEach((id) => {
      if (!seen.has(id)) { existing[id].remove(); delete existing[id]; }
    });
  }, [drones, selectedDroneId, showDrones, onDroneClick]);

  const updateFlightMarkers = useCallback(() => {
    const layer = flightLayerRef.current;
    if (!layer) return;

    if (!showFlights) { layer.clearLayers(); flightMarkersRef.current = {}; return; }

    const existing = flightMarkersRef.current;
    const seen = new Set<string>();
    const icon = aircraftIcon();

    aircraft.forEach((ac) => {
      if (!ac.latitude || !ac.longitude) return;
      seen.add(ac.icao24);

      if (existing[ac.icao24]) {
        existing[ac.icao24].setLatLng([ac.latitude, ac.longitude]);
      } else {
        const marker = L.marker([ac.latitude, ac.longitude], { icon })
          .bindTooltip(ac.callsign || ac.icao24, { permanent: false, direction: 'top' });
        marker.addTo(layer);
        existing[ac.icao24] = marker;
      }
    });

    Object.keys(existing).forEach((id) => {
      if (!seen.has(id)) { existing[id].remove(); delete existing[id]; }
    });
  }, [aircraft, showFlights]);

  useEffect(() => { updateDroneMarkers(); }, [updateDroneMarkers]);
  useEffect(() => { updateFlightMarkers(); }, [updateFlightMarkers]);

  useEffect(() => {
    if (selectedDroneId && drones[selectedDroneId] && mapRef.current) {
      const d = drones[selectedDroneId];
      mapRef.current.flyTo([d.latitude, d.longitude], 14, { duration: 1.2 });
    }
  }, [selectedDroneId]);

  return <div ref={containerRef} className="w-full h-full z-0" />;
}
