import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Extends app.json. The Google Maps SDK keys live here because env vars are not
 * expanded inside app.json.
 *
 * Expo Go on Android needs no key. A native build does:
 *   GOOGLE_MAPS_API_KEY=... npx expo run:android   (or run:ios)
 *
 * Security-relevant switches are decided here too, per build:
 *  - Cleartext (http://, ws://) traffic is only allowed outside production.
 *    Local backends run on plain HTTP over the LAN; a store build must never
 *    send tokens or rider positions unencrypted. `src/config/env.ts` refuses
 *    http:// URLs in release JS as a second line.
 *  - Android backup is off: the app keeps session data on the device, and an
 *    `adb backup` or a cloud restore onto another phone must not carry it.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const isProduction =
    process.env.EAS_BUILD_PROFILE === 'production' || process.env.APP_ENV === 'production';

  const mapsPlugin: NonNullable<ExpoConfig['plugins']> = apiKey
    ? [['react-native-maps', { androidGoogleMapsApiKey: apiKey, iosGoogleMapsApiKey: apiKey }]]
    : [];

  const plugins = (config.plugins ?? []).map((plugin) => {
    if (!Array.isArray(plugin) || plugin[0] !== 'expo-build-properties') return plugin;
    const options = (plugin[1] ?? {}) as { android?: Record<string, unknown> };
    return [
      'expo-build-properties',
      { ...options, android: { ...options.android, usesCleartextTraffic: !isProduction } },
    ] as [string, unknown];
  });

  return {
    ...config,
    name: config.name ?? 'hungry-deliverer',
    slug: config.slug ?? 'hungry-deliverer',
    android: { ...config.android, allowBackup: false },
    plugins: [...plugins, ...mapsPlugin],
    // Mirror the key into `extra` so JS can reach it for Routes API (HTTP) calls;
    // the native Maps SDK reads its own copy from the manifest via the plugin above.
    // Either way it ships inside the app, so it must be restricted in Google
    // Cloud (see docs/security-report.md).
    extra: { ...config.extra, googleMapsApiKey: apiKey },
  };
};
