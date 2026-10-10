import type { IconName } from '@/theme';

/** Maps a Routes API manoeuvre enum to an icon for the guidance banner. */
export function maneuverIcon(maneuver: string): IconName {
  switch (maneuver) {
    case 'TURN_LEFT':
    case 'TURN_SHARP_LEFT':
    case 'RAMP_LEFT':
    case 'FORK_LEFT':
      return 'turnLeft';
    case 'TURN_SLIGHT_LEFT':
      return 'slightLeft';
    case 'TURN_RIGHT':
    case 'TURN_SHARP_RIGHT':
    case 'RAMP_RIGHT':
    case 'FORK_RIGHT':
      return 'turnRight';
    case 'TURN_SLIGHT_RIGHT':
      return 'slightRight';
    case 'UTURN_LEFT':
    case 'UTURN_RIGHT':
      return 'uTurn';
    case 'ROUNDABOUT_LEFT':
    case 'ROUNDABOUT_RIGHT':
    case 'ROUNDABOUT_CLOCKWISE':
    case 'ROUNDABOUT_COUNTERCLOCKWISE':
      return 'roundabout';
    case 'MERGE':
      return 'merge';
    case 'DEPART':
      return 'navigate';
    case 'DESTINATION':
    case 'DESTINATION_LEFT':
    case 'DESTINATION_RIGHT':
      return 'arrive';
    default:
      return 'straight';
  }
}
