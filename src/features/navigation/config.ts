import Constants from 'expo-constants';

/**
 * The Google Maps key, surfaced to JS for Routes API calls. The native Maps SDK
 * reads its own copy from the manifest; here we use the EXPO_PUBLIC_ env var,
 * which Metro inlines into the bundle at build time, and fall back to the value
 * mirrored into `extra` by app.config.ts.
 */
export function getGoogleMapsApiKey(): string | undefined {
  const fromEnv = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (fromEnv) return fromEnv;

  const extra = Constants.expoConfig?.extra as { googleMapsApiKey?: string } | undefined;
  return extra?.googleMapsApiKey;
}
