import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Extends app.json. The Google Maps SDK keys live here because env vars are not
 * expanded inside app.json.
 *
 * Expo Go on Android needs no key. A native build does:
 *   GOOGLE_MAPS_API_KEY=... npx expo run:android   (or run:ios)
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  const mapsPlugin: NonNullable<ExpoConfig['plugins']> = apiKey
    ? [['react-native-maps', { androidGoogleMapsApiKey: apiKey, iosGoogleMapsApiKey: apiKey }]]
    : [];

  return {
    ...config,
    name: config.name ?? 'hungry-deliverer',
    slug: config.slug ?? 'hungry-deliverer',
    plugins: [...(config.plugins ?? []), ...mapsPlugin],
    // Mirror the key into `extra` so JS can reach it for Routes API (HTTP) calls;
    // the native Maps SDK reads its own copy from the manifest via the plugin above.
    extra: { ...config.extra, googleMapsApiKey: apiKey },
  };
};
