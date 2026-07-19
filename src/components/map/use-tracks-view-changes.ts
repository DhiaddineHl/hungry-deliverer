import { useEffect, useState } from 'react';

/**
 * Custom marker views must stop tracking view changes once painted, otherwise
 * Google Maps redraws every marker on every frame and the map stutters.
 * Keep tracking on just long enough for the first layout to land.
 */
export function useTracksViewChanges(durationMs = 800) {
  const [tracks, setTracks] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setTracks(false), durationMs);
    return () => clearTimeout(timer);
  }, [durationMs]);

  return tracks;
}
