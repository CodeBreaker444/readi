// Shared Leaflet basemap tiles used across the app. CartoDB's free tile CDN
// (no API key required) — unlike the Esri "Canvas" basemaps previously used
// on the drone-atc map, these include place/street labels at every zoom.
export const LEAFLET_TILE_LIGHT = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
export const LEAFLET_TILE_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
export const LEAFLET_TILE_ATTRIBUTION = '© OpenStreetMap contributors © CARTO';

// Satellite imagery — also free, no key required.
export const LEAFLET_TILE_SATELLITE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
export const LEAFLET_TILE_SATELLITE_ATTRIBUTION = 'Tiles © Esri';

export const LEAFLET_TILE_MAX_ZOOM = 19;
