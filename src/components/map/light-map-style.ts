/**
 * Google Maps styling for the light theme (DRIVER_APP.md §3, MapScreen): POI
 * icons hidden and their labels muted, so the store and customer markers are
 * the only points of interest the rider sees. Roads, water and parks keep
 * Google's own colours — the map should still look like a map.
 */
export const LIGHT_MAP_STYLE = [
  { featureType: 'poi', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#8A969C' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
];
