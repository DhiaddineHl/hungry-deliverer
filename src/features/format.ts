/**
 * Display formatting shared by every screen (DRIVER_APP.md §8).
 *
 * Money is TND with a comma decimal and trailing zeros dropped — `8,5 DT`,
 * `14 DT`, `248,5 DT`. Negative amounts use a real minus sign (U+2212), never a
 * hyphen, so a debit lines up with the `+` of a credit in a tabular column.
 */
export function formatAmount(amount: number): string {
  const rounded = Math.round(Math.abs(amount) * 100) / 100;
  return String(rounded).replace('.', ',');
}

export function formatMoney(amount: number): string {
  return `${amount < 0 ? '−' : ''}${formatAmount(amount)} DT`;
}

/** A wallet movement: `+8,5 DT` for a credit, `−42 DT` for a debit. */
export function formatSignedMoney(amount: number): string {
  return `${amount >= 0 ? '+' : '−'}${formatAmount(amount)} DT`;
}

/** `3,5 km`. */
export function formatKm(km: number): string {
  return `${String(Math.round(km * 10) / 10).replace('.', ',')} km`;
}

/** `45 min`, `1 h 12 min`, `2 h`. */
export function formatDuration(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

/** `0:24` — the offer countdown. */
export function formatCountdown(totalSeconds: number): string {
  const seconds = Math.max(0, Math.ceil(totalSeconds));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** Two initials for the avatar: "Test Test" → "TT". */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
  return (first + last).toUpperCase();
}
