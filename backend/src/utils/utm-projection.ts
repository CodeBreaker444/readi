import proj4 from 'proj4';

// D-Flight (ENAV) only operates in Italy, so mission_reference_frame is
// fixed to EPSG:32633 (UTM zone 33N) for all trajectory_data submissions.
const UTM_33N = '+proj=utm +zone=33 +datum=WGS84 +units=m +no_defs';

export function toUtm33N(lat: number, lng: number): { x: number; y: number } {
  const [x, y] = proj4('EPSG:4326', UTM_33N, [lng, lat]);
  return { x, y };
}
