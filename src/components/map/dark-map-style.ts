/**
 * Google Maps styling for dark mode, tinted towards the app's navy rather than
 * the neutral greys of Google's stock night theme, so the map reads as part of
 * this app and not as a widget dropped into it.
 *
 * Passed to `MapView.customMapStyle`, which only has an effect on the Google
 * provider — on Apple Maps it is ignored, and the map follows the system
 * appearance instead. That is a real gap: an iOS build with the app pinned to
 * Dark against a Light system keeps a light map. Nothing here can close it;
 * the Apple provider exposes no equivalent hook.
 *
 * Only elements that actually matter to a courier are restyled: the road
 * hierarchy stays legible, and labels keep enough contrast to be read at a
 * glance in traffic.
 */
export const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0E1A22' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8A99A5' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0A1219' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#2A353E' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#A7B2BC' }],
  },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#77848E' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#12241F' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#3F6B5E' }] },
  // The road ramp: arterials brightest, residential dimmest, so the route to
  // take still stands out from the streets around it.
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1D2831' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#141E26' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8A99A5' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#2A3742' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3A4B58' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1D2831' }] },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#C3D0D8' }],
  },
  { featureType: 'road.local', elementType: 'geometry', stylers: [{ color: '#18232B' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#1A2630' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#050D13' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3E5260' }] },
];
