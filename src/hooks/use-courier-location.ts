import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import { COURIER_START } from '@/data/mock';
import type { LatLng } from '@/features/session/types';

/**
 * Asks for foreground location once. The demo route geometry is anchored in
 * Sousse, so the courier puck stays on the mock position; the granted flag only
 * decides whether the device's own blue dot is drawn.
 */
export function useCourierLocation() {
  const [granted, setGranted] = useState(false);
  const [deviceLocation, setDeviceLocation] = useState<LatLng | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled || status !== 'granted') return;

      setGranted(true);
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (cancelled) return;

      setDeviceLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    })().catch(() => {
      // Location is not essential to the demo flow — fall back to the mock position.
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return { granted, deviceLocation, courier: COURIER_START };
}
