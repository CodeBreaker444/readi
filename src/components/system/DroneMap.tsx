"use client";

import type { ToolsResponse } from "@/config/types/types";
import { colorByStatus, DEFAULT_CONTROL_CENTER, isDock, isValidCoord } from "@/lib/mapUtils";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet/dist/leaflet.css";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";


export interface DroneMapHandle {
  panTo: (lat: number, lon: number, zoom?: number) => void;
}


function dockDivIcon(status: string) {
  const fill = colorByStatus(status);
  const stroke = "#1976d2";
  return L.divIcon({
    html: `<svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="14" cy="24" rx="6.5" ry="2.2" fill="#000" fill-opacity="0.12"/>
      <rect x="6.5" y="11.5" width="15" height="9" rx="1.6" fill="${fill}" fill-opacity="0.25" stroke="${stroke}" stroke-width="2"/>
      <path d="M5.5 12 L14 6 L22.5 12" fill="${stroke}" fill-opacity="0.15" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>
      <rect x="12.4" y="15" width="3.2" height="5" rx="0.8" fill="#fff" fill-opacity="0.8" stroke="${stroke}" stroke-width="1"/>
      <line x1="14" y1="6" x2="14" y2="3.4" stroke="${stroke}" stroke-width="1.4"/>
      <circle cx="14" cy="3.2" r="1.1" fill="${stroke}"/>
    </svg>`,
    className: "dock-marker",
    iconSize: [28, 28],
    iconAnchor: [14, 24],
    popupAnchor: [0, -22],
  });
}

function droneDivIcon(status: string) {
  const c = colorByStatus(status);
  return L.divIcon({
    html: `<svg width="26" height="26" viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="13" cy="22" rx="6" ry="2" fill="#000" fill-opacity="0.10"/>
      <circle cx="13" cy="12" r="7.5" fill="${c}" fill-opacity="0.20" stroke="${c}" stroke-width="2"/>
      <line x1="6" y1="12" x2="20" y2="12" stroke="${c}" stroke-width="2"/>
      <line x1="13" y1="5" x2="13" y2="19" stroke="${c}" stroke-width="2"/>
      <circle cx="13" cy="12" r="2.1" fill="${c}"/>
    </svg>`,
    className: "drone-marker",
    iconSize: [26, 26],
    iconAnchor: [13, 22],
    popupAnchor: [0, -18],
  });
}

function controlCenterDivIcon() {
  const stroke = "#3949ab";
  const fill = "#5c6bc0";
  return L.divIcon({
    html: `<svg width="30" height="34" viewBox="0 0 30 34" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="15" cy="30.5" rx="7" ry="2.4" fill="#000" fill-opacity="0.12"/>
      <rect x="8" y="12" width="14" height="11" rx="2" fill="${fill}" fill-opacity="0.25" stroke="${stroke}" stroke-width="2"/>
      <rect x="12.5" y="8" width="5" height="4" rx="1" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
      <line x1="15" y1="8" x2="15" y2="3.5" stroke="${stroke}" stroke-width="1.8"/>
      <circle cx="15" cy="3.2" r="1.2" fill="${stroke}"/>
    </svg>`,
    className: "center-marker",
    iconSize: [30, 34],
    iconAnchor: [15, 31],
    popupAnchor: [0, -26],
  });
}


function makePopup(t: ToolsResponse): string {
  const statusBg = colorByStatus(t.tool_status);
  const dockBadge = isDock(t)
    ? `<span style="background:#1976d2;color:#fff;padding:2px 6px;border-radius:4px;font-size:11px;margin-left:4px">DOCK</span>`
    : "";

  const model = [t.factory_type, t.factory_serie, t.factory_model]
    .filter(Boolean)
    .join(" ") || "—";

  return `
    <div style="min-width:220px;font-family:system-ui;font-size:13px">
      <div style="font-weight:600;font-size:14px">${t.tool_code || "Tool #" + t.tool_id}</div>
      <div style="color:#666;font-size:12px">${t.client_name ?? ""}</div>
      <div style="margin-top:6px">
        <span style="background:${statusBg};color:#fff;padding:2px 6px;border-radius:4px;font-size:11px">${t.tool_status || "—"}</span>
        ${dockBadge}
      </div>
      <div style="font-size:12px;margin-top:6px;color:#555">
        <div>Model: ${model}</div>
        <div>SN: ${t.tool_serialnumber ?? "—"}</div>
        <div>GCS: ${t.tool_gcs_type || "—"} · Platform: ${t.tool_ccPlatform || "—"}</div>
      </div>
      <div style="font-size:12px;margin-top:4px;color:#888">
        Lat: ${t.tool_latitude ?? "—"} · Lon: ${t.tool_longitude ?? "—"}
      </div>
      ${t.tot_mission ? `<div style="font-size:12px;margin-top:2px">Missions: ${t.tot_mission} · ${Math.round(t.tot_flown_meter / 1000)} km · ${Math.round(t.tot_flown_time / 60)} min</div>` : ""}
    </div>`;
}


interface DroneMapProps {
  tools: ToolsResponse[];
  height?: string;
  center?: [number, number];
  zoom?: number;
  controlCenter?: { lat: number; lon: number; label: string };
  onToolClick?: (tool: ToolsResponse) => void;
}


const DroneMap = forwardRef<DroneMapHandle, DroneMapProps>(function DroneMap(
  {
    tools,
    height = "480px",
    center = [42.0, 12.5],
    zoom = 6,
    controlCenter = DEFAULT_CONTROL_CENTER,
    onToolClick,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<any>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  useImperativeHandle(ref, () => ({
    panTo: (lat: number, lon: number, flyZoom = 16) => {
      const map = mapRef.current;
      if (!map) return;

      map.flyTo([lat, lon], flyZoom, { duration: 1.2 });

      setTimeout(() => {
        const cluster = clusterRef.current;
        if (cluster) {
          cluster.eachLayer((layer: any) => {
            const ll = layer.getLatLng?.();
            if (ll && Math.abs(ll.lat - lat) < 0.0001 && Math.abs(ll.lng - lon) < 0.0001) {
              if (typeof layer.zoomToBounds === "function") {
                layer.zoomToBounds();
              }
              layer.openPopup();
            }
          });
        }

        const key = `${lat.toFixed(6)},${lon.toFixed(6)}`;
        const marker = markersRef.current.get(key);
        if (marker) {
          marker.openPopup();
        }
      }, 1300);
    },
  }));

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, { zoomControl: true }).setView(center, zoom);

    const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 20,
      attribution: "&copy; OpenStreetMap",
    });
    const sat = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 20, attribution: "Tiles &copy; Esri" }
    );

    osm.addTo(map);
    L.control.layers({ OSM: osm, Satellite: sat }, {}, { collapsed: true }).addTo(map);

    L.marker([controlCenter.lat, controlCenter.lon], {
      icon: controlCenterDivIcon(),
      zIndexOffset: 1000,
    })
      .bindPopup(`<div style="font-weight:600">${controlCenter.label}</div>`)
      .addTo(map);

    const cluster = (L as any).markerClusterGroup({
      chunkedLoading: true,
      disableClusteringAtZoom: 15,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      maxClusterRadius: 60,
      iconCreateFunction: (cl: any) => {
        const n = cl.getChildCount();
        const dim = n < 10 ? 34 : n < 100 ? 42 : 50;
        return L.divIcon({
          html: `<div style="width:${dim}px;height:${dim}px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;box-shadow:0 1px 4px rgba(0,0,0,.2);border:3px solid #1976d2;background:#2e7d32">${n}</div>`,
          className: "marker-cluster-custom",
          iconSize: [dim, dim],
        });
      },
    });
    cluster.addTo(map);

    mapRef.current = map;
    clusterRef.current = cluster;

    return () => {
      map.remove();
      mapRef.current = null;
      clusterRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const cluster = clusterRef.current;
    if (!map || !cluster) return;

    cluster.clearLayers();
    markersRef.current.clear();
    const markers: L.Marker[] = [];

    for (const t of tools) {
      if (!isValidCoord(t.tool_latitude, t.tool_longitude)) continue;

      const lat = t.tool_latitude!;
      const lon = t.tool_longitude!;

      const icon = isDock(t)
        ? dockDivIcon(t.tool_status)
        : droneDivIcon(t.tool_status);

      const marker = L.marker([lat, lon], { icon }).bindPopup(makePopup(t));

      if (onToolClick) {
        marker.on("click", () => onToolClick(t));
      }

      markers.push(marker);

      const key = `${lat.toFixed(6)},${lon.toFixed(6)}`;
      markersRef.current.set(key, marker);
    }

    cluster.addLayers(markers);

    if (markers.length > 0) {
      const bounds = cluster.getBounds();
      bounds.extend([controlCenter.lat, controlCenter.lon]);
      map.fitBounds(bounds.pad(0.15));
    } else {
      map.setView([controlCenter.lat, controlCenter.lon], zoom);
    }
  }, [tools, controlCenter, zoom, onToolClick]);

  return (
    <>
      <style jsx global>{`
        .leaflet-pane,
        .leaflet-top,
        .leaflet-bottom,
        .leaflet-control {
          z-index: 1 !important;
        }
        .leaflet-tile-pane { z-index: 1 !important; }
        .leaflet-overlay-pane { z-index: 2 !important; }
        .leaflet-shadow-pane { z-index: 3 !important; }
        .leaflet-marker-pane { z-index: 4 !important; }
        .leaflet-tooltip-pane { z-index: 5 !important; }
        .leaflet-popup-pane { z-index: 6 !important; }
        .leaflet-top.leaflet-left,
        .leaflet-top.leaflet-right,
        .leaflet-bottom.leaflet-left,
        .leaflet-bottom.leaflet-right {
          z-index: 7 !important;
        }
      `}</style>
      <div
        ref={containerRef}
        style={{ height, width: "100%", position: "relative", zIndex: 0 }}
        className="rounded-lg overflow-hidden"
      />
    </>
  );
});

export default DroneMap;