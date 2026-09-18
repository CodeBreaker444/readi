// Shared Leaflet basemap tiles used across the app. Esri's public ArcGIS
// Online "Canvas" REST tile services — no API key or signup required, same
// provider already used for the satellite layer below. CARTO's basemaps
// (previously used here) now require their own free API key to load.
// The Canvas base layers ship without labels, so a matching "Reference"
// overlay is layered on top wherever a base tile is added.
export const LEAFLET_TILE_LIGHT = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';
export const LEAFLET_TILE_LIGHT_LABELS = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}';
export const LEAFLET_TILE_DARK = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
export const LEAFLET_TILE_DARK_LABELS = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}';
export const LEAFLET_TILE_ATTRIBUTION = 'Tiles © Esri';

// Esri Canvas base/reference tiles are only rendered natively up to zoom 16;
// Leaflet oversamples (softens) beyond that instead of leaving blank tiles.
export const LEAFLET_TILE_BASE_MAX_NATIVE_ZOOM = 16;

// Satellite imagery — also free, no key required.
export const LEAFLET_TILE_SATELLITE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
export const LEAFLET_TILE_SATELLITE_ATTRIBUTION = 'Tiles © Esri';

export const LEAFLET_TILE_MAX_ZOOM = 19;
