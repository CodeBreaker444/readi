'use client';
import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

interface DrawnArea {
  id: string;
  type: 'polygon' | 'circle' | 'rectangle';
  area: number;
  center: { lat: number; lng: number };
  geoJSON: any;
}

interface MapDrawingProps {
  onAreasChange: (areas: DrawnArea[]) => void;
  isDark?: boolean;
}

export interface MapDrawingHandle {
  removeArea: (id: string) => void;
  editArea: (id: string) => void;
}

const MapDrawing = forwardRef<MapDrawingHandle, MapDrawingProps>(({ onAreasChange, isDark = false }, ref) => {
  const mapRef = useRef<any>(null);
  const drawnItemsRef = useRef<any>(null);
  const areasRef = useRef<DrawnArea[]>([]);
  const layersRef = useRef<Map<string, any>>(new Map());

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const leafletCSS = document.createElement('link');
    leafletCSS.rel = 'stylesheet';
    leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(leafletCSS);

    const drawCSS = document.createElement('link');
    drawCSS.rel = 'stylesheet';
    drawCSS.href = 'https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.css';
    document.head.appendChild(drawCSS);

    const leafletScript = document.createElement('script');
    leafletScript.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    leafletScript.async = true;

    leafletScript.onload = () => {
      const drawScript = document.createElement('script');
      drawScript.src = 'https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.js';
      drawScript.async = true;
      drawScript.onload = () => initMap();
      document.body.appendChild(drawScript);
    };

    document.body.appendChild(leafletScript);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const initMap = () => {
    const L = (window as any).L;
    if (!L || mapRef.current) return;

    const map = L.map('mapDrawing').setView([45.4642, 9.19], 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    drawnItemsRef.current = drawnItems;

    const drawControl = new L.Control.Draw({
      edit: { featureGroup: drawnItems, edit: true, remove: true },
      draw: {
        polygon: { allowIntersection: false, showArea: true, metric: true },
        circle: { metric: true },
        rectangle: { showArea: true, metric: true },
        polyline: false,
        marker: false,
        circlemarker: false,
      },
    });

    map.addControl(drawControl);

    map.on(L.Draw.Event.CREATED, (e: any) => {
      const layer = e.layer;
      const type = e.layerType;
      drawnItems.addLayer(layer);

      const id = L.stamp(layer).toString();
      layersRef.current.set(id, layer);

      const drawnArea: DrawnArea = {
        id,
        type,
        area: calculateArea(layer, type),
        center: calculateCenter(layer, type),
        geoJSON: layer.toGeoJSON(),
      };

      areasRef.current = [...areasRef.current, drawnArea];
      onAreasChange(areasRef.current);
    });

    map.on(L.Draw.Event.EDITED, (e: any) => {
      e.layers.eachLayer((layer: any) => {
        const id = L.stamp(layer).toString();
        const index = areasRef.current.findIndex(a => a.id === id);
        if (index !== -1) {
          const type = areasRef.current[index].type;
          areasRef.current[index] = {
            ...areasRef.current[index],
            area: calculateArea(layer, type),
            center: calculateCenter(layer, type),
            geoJSON: layer.toGeoJSON(),
          };
        }
      });
      onAreasChange([...areasRef.current]);
    });

    map.on(L.Draw.Event.DELETED, (e: any) => {
      const deletedIds: string[] = [];
      e.layers.eachLayer((layer: any) => {
        const id = L.stamp(layer).toString();
        deletedIds.push(id);
        layersRef.current.delete(id);
      });
      areasRef.current = areasRef.current.filter(a => !deletedIds.includes(a.id));
      onAreasChange([...areasRef.current]);
    });

    mapRef.current = map;
  };

  useImperativeHandle(ref, () => ({
    removeArea: (id: string) => {
      const layer = layersRef.current.get(id);
      if (!layer || !drawnItemsRef.current) return;
      drawnItemsRef.current.removeLayer(layer);
      layersRef.current.delete(id);
      areasRef.current = areasRef.current.filter(a => a.id !== id);
      onAreasChange([...areasRef.current]);
    },
    editArea: (id: string) => {
      const layer = layersRef.current.get(id);
      const map = mapRef.current;
      if (!layer) return;
      if (layer.getBounds) {
        map?.fitBounds(layer.getBounds(), { maxZoom: 16 });
      } else if (layer.getLatLng) {
        map?.setView(layer.getLatLng(), Math.max(map.getZoom(), 14));
      }
      layer.editing?.enable();
    },
  }));

  const calculateArea = (layer: any, type: string): number => {
    const L = (window as any).L;
    if (!L) return 0;
    if (type === 'circle') {
      const r = layer.getRadius();
      return Math.PI * r * r;
    } else if (type === 'polygon' || type === 'rectangle') {
      return L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]);
    }
    return 0;
  };

  const calculateCenter = (layer: any, type: string): { lat: number; lng: number } => {
    if (type === 'circle') {
      const c = layer.getLatLng();
      return { lat: c.lat, lng: c.lng };
    } else if (type === 'polygon' || type === 'rectangle') {
      const c = layer.getBounds().getCenter();
      return { lat: c.lat, lng: c.lng };
    }
    return { lat: 0, lng: 0 };
  };

  return (
    <div className={`rounded-xl overflow-hidden border ${isDark ? 'border-gray-700/60' : 'border-gray-200'}`}>
      <div
        id="mapDrawing"
        style={{ height: '60vh', width: '100%' }}
      />
    </div>
  );
});

MapDrawing.displayName = 'MapDrawing';

export default MapDrawing;