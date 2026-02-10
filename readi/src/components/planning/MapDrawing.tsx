'use client';
import React, { useEffect, useRef } from 'react';

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

const MapDrawing: React.FC<MapDrawingProps> = ({ onAreasChange, isDark = false }) => {
  const mapRef = useRef<any>(null);
  const drawnItemsRef = useRef<any>(null);
  const areasRef = useRef<DrawnArea[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Load Leaflet CSS
    const leafletCSS = document.createElement('link');
    leafletCSS.rel = 'stylesheet';
    leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(leafletCSS);

    const drawCSS = document.createElement('link');
    drawCSS.rel = 'stylesheet';
    drawCSS.href = 'https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.css';
    document.head.appendChild(drawCSS);

    // Load Leaflet JS
    const leafletScript = document.createElement('script');
    leafletScript.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    leafletScript.async = true;

    leafletScript.onload = () => {
      const drawScript = document.createElement('script');
      drawScript.src = 'https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.js';
      drawScript.async = true;

      drawScript.onload = () => {
        initMap();
      };

      document.body.appendChild(drawScript);
    };

    document.body.appendChild(leafletScript);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
      }
    };
  }, []);

  const initMap = () => {
    const L = (window as any).L;
    if (!L || mapRef.current) return;

    // Initialize map
    const map = L.map('mapDrawing').setView([45.4642, 9.1900], 6); // Italy center

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    // Initialize FeatureGroup to store drawn items
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    drawnItemsRef.current = drawnItems;

    // Initialize draw control
    const drawControl = new L.Control.Draw({
      edit: {
        featureGroup: drawnItems,
        edit: true,
        remove: true
      },
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          metric: true
        },
        circle: {
          metric: true
        },
        rectangle: {
          showArea: true,
          metric: true
        },
        polyline: false,
        marker: false,
        circlemarker: false
      }
    });

    map.addControl(drawControl);

    // Handle draw created
    map.on(L.Draw.Event.CREATED, (e: any) => {
      const layer = e.layer;
      const type = e.layerType;
      
      drawnItems.addLayer(layer);
      
      const area = calculateArea(layer, type);
      const center = calculateCenter(layer, type);
      const geoJSON = layer.toGeoJSON();
      
      const drawnArea: DrawnArea = {
        id: L.stamp(layer).toString(),
        type: type,
        area: area,
        center: center,
        geoJSON: geoJSON
      };

      areasRef.current = [...areasRef.current, drawnArea];
      onAreasChange(areasRef.current);
    });

    // Handle draw edited
    map.on(L.Draw.Event.EDITED, (e: any) => {
      const layers = e.layers;
      layers.eachLayer((layer: any) => {
        const id = L.stamp(layer).toString();
        const index = areasRef.current.findIndex(a => a.id === id);
        
        if (index !== -1) {
          const type = areasRef.current[index].type;
          const area = calculateArea(layer, type);
          const center = calculateCenter(layer, type);
          const geoJSON = layer.toGeoJSON();
          
          areasRef.current[index] = {
            ...areasRef.current[index],
            area,
            center,
            geoJSON
          };
        }
      });
      
      onAreasChange([...areasRef.current]);
    });

    // Handle draw deleted
    map.on(L.Draw.Event.DELETED, (e: any) => {
      const layers = e.layers;
      const deletedIds: string[] = [];
      
      layers.eachLayer((layer: any) => {
        deletedIds.push(L.stamp(layer).toString());
      });
      
      areasRef.current = areasRef.current.filter(a => !deletedIds.includes(a.id));
      onAreasChange([...areasRef.current]);
    });

    mapRef.current = map;
  };

  const calculateArea = (layer: any, type: string): number => {
    const L = (window as any).L;
    if (!L) return 0;
    
    if (type === 'circle') {
      const radius = layer.getRadius();
      return Math.PI * radius * radius;
    } else if (type === 'polygon' || type === 'rectangle') {
      return L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]);
    }
    return 0;
  };

  const calculateCenter = (layer: any, type: string): { lat: number; lng: number } => {
    if (type === 'circle') {
      const center = layer.getLatLng();
      return { lat: center.lat, lng: center.lng };
    } else if (type === 'polygon' || type === 'rectangle') {
      const bounds = layer.getBounds();
      const center = bounds.getCenter();
      return { lat: center.lat, lng: center.lng };
    }
    return { lat: 0, lng: 0 };
  };

  return (
    <div className={`${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border p-4`}>
      <div 
        id="mapDrawing" 
        style={{ height: '60vh', width: '100%', borderRadius: '0.5rem' }}
        className="border border-gray-300"
      />
    </div>
  );
};


export default MapDrawing;