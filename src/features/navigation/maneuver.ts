import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

/** Maps a Routes API manoeuvre enum to an arrow icon for the guidance banner. */
export function maneuverIcon(maneuver: string): IoniconName {
  switch (maneuver) {
    case 'TURN_LEFT':
    case 'TURN_SHARP_LEFT':
    case 'RAMP_LEFT':
    case 'FORK_LEFT':
      return 'arrow-back';
    case 'TURN_SLIGHT_LEFT':
      return 'return-up-back';
    case 'TURN_RIGHT':
    case 'TURN_SHARP_RIGHT':
    case 'RAMP_RIGHT':
    case 'FORK_RIGHT':
      return 'arrow-forward';
    case 'TURN_SLIGHT_RIGHT':
      return 'return-up-forward';
    case 'UTURN_LEFT':
    case 'UTURN_RIGHT':
      return 'return-down-back';
    case 'ROUNDABOUT_LEFT':
    case 'ROUNDABOUT_RIGHT':
    case 'ROUNDABOUT_CLOCKWISE':
    case 'ROUNDABOUT_COUNTERCLOCKWISE':
      return 'sync';
    case 'MERGE':
      return 'git-merge';
    case 'DEPART':
      return 'navigate';
    case 'DESTINATION':
    case 'DESTINATION_LEFT':
    case 'DESTINATION_RIGHT':
      return 'flag';
    default:
      return 'arrow-up';
  }
}
