import type { Ionicons } from '@expo/vector-icons';

import type { Tint } from '@/constants/theme';

/**
 * Wallet and delivery-history figures, drawn straight from the frames.
 *
 * The backend has no earnings endpoints yet — `services/api` covers drivers,
 * availability, location and delivery status, and nothing else — so these
 * screens render placeholder data with the shapes the eventual DTOs will fill.
 * Everything the UI reads goes through the types below, so swapping in a real
 * query later is a change to this module's exports, not to the screens.
 */

/**
 * A day bucket a row falls in. The label is composed at render time from a
 * translation key plus the clock time, because "Today, 14:32" is a sentence
 * that reorders between languages — it is not a string to store.
 */
export type DayBucket = 'today' | 'yesterday' | 'monday';

export type Money = {
  /** Amount in the millime-free decimal the frames show, e.g. 8.5 → "8.500". */
  amount: number;
  currency: 'TND';
};

export type DeliveryRecord = {
  id: string;
  /** A trading name — not translated, the same in every language. */
  merchant: string;
  /** Local time of the drop-off, as shown on the row. */
  time: string;
  status: 'completed' | 'cancelled';
  fee: Money;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  /** Palette tint name for the round icon chip — see `Tint` in constants/theme. */
  tint: Tint;
};

export type DeliveryDay = {
  /** Which relative day the heading names, e.g. "TODAY, %{date}". */
  bucket: Exclude<DayBucket, 'monday'>;
  /** The date part of that heading, already short-formatted: "OCT 24". */
  date: string;
  records: DeliveryRecord[];
};

export type MonthRecap = {
  earned: Money;
  trips: number;
  /** Month-over-month change in earnings, in percent. */
  growthPercent: number;
};

export const MONTH_RECAP: MonthRecap = {
  earned: { amount: 142.5, currency: 'TND' },
  trips: 48,
  growthPercent: 12,
};

export const DELIVERY_HISTORY: DeliveryDay[] = [
  {
    bucket: 'today',
    date: 'OCT 24',
    records: [
      {
        id: 'd-2043',
        merchant: 'Gourmet Burger Bar',
        time: '14:20',
        status: 'completed',
        fee: { amount: 8.5, currency: 'TND' },
        icon: 'restaurant-outline',
        tint: 'teal',
      },
      {
        id: 'd-2038',
        merchant: 'Central Pharmacy',
        time: '11:05',
        status: 'completed',
        fee: { amount: 12.2, currency: 'TND' },
        icon: 'medkit-outline',
        tint: 'blue',
      },
    ],
  },
  {
    bucket: 'yesterday',
    date: 'OCT 23',
    records: [
      {
        id: 'd-2019',
        merchant: 'Monoprix Market',
        time: '19:45',
        status: 'completed',
        fee: { amount: 6, currency: 'TND' },
        icon: 'basket-outline',
        tint: 'neutral',
      },
      {
        id: 'd-2011',
        merchant: 'The Daily Brew',
        time: '16:12',
        status: 'completed',
        fee: { amount: 4.5, currency: 'TND' },
        icon: 'cafe-outline',
        tint: 'neutral',
      },
    ],
  },
];

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export type WeekStats = {
  trips: number;
  /** Online time this week, already formatted — e.g. "6h 20m". */
  onlineTime: string;
  averagePerTrip: Money;
  /** Monday-first earnings, one entry per weekday keyed by `weekdays.*`. */
  daily: { day: Weekday; amount: number }[];
  /** Index into `daily` the chart highlights — the current day. */
  todayIndex: number;
};

export const WEEK_STATS: WeekStats = {
  trips: 42,
  onlineTime: '6h 20m',
  averagePerTrip: { amount: 9.5, currency: 'TND' },
  daily: [
    { day: 'mon', amount: 24 },
    { day: 'tue', amount: 38 },
    { day: 'wed', amount: 20 },
    { day: 'thu', amount: 52 },
    { day: 'fri', amount: 34 },
    { day: 'sat', amount: 12 },
    { day: 'sun', amount: 6 },
  ],
  todayIndex: 4,
};

export type PayoutMethod = {
  /** Last four digits only — nothing else about the card is ours to hold. */
  last4: string;
  label: string;
  isPrimary: boolean;
};

export const PAYOUT_METHOD: PayoutMethod = {
  last4: '4821',
  label: 'Debit card',
  isPrimary: true,
};

export type WalletTransaction = {
  id: string;
  /** What kind of movement this is; the screen turns it into a label. */
  kind: 'order' | 'bonus' | 'cashOut';
  /** Present for an order movement — the order it paid for. */
  orderNumber?: string;
  when: DayBucket;
  time: string;
  /** Signed: positive credits the wallet, negative is a cash-out. */
  amount: number;
  icon: React.ComponentProps<typeof Ionicons>['name'];
};

export const WALLET_BALANCE: Money = { amount: 248.5, currency: 'TND' };

/** Flat fee taken out of an instant cash-out, as quoted under the button. */
export const CASH_OUT_FEE: Money = { amount: 1, currency: 'TND' };

export const WALLET_TRANSACTIONS: WalletTransaction[] = [
  {
    id: 't-1',
    kind: 'order',
    orderNumber: '2043',
    when: 'today',
    time: '14:32',
    amount: 8.5,
    icon: 'bicycle-outline',
  },
  {
    id: 't-2',
    kind: 'bonus',
    when: 'monday',
    time: '09:00',
    amount: 15,
    icon: 'sparkles-outline',
  },
  {
    id: 't-3',
    kind: 'cashOut',
    when: 'yesterday',
    time: '18:05',
    amount: -42,
    icon: 'arrow-forward-outline',
  },
];

/** "8.5" → "8.500": the three-decimal millime notation the frames use. */
export function formatDinars(amount: number): string {
  return Math.abs(amount).toFixed(3);
}

/** "248.5" → "248,50": the comma-decimal form of the big balance figure. */
export function formatBalance(amount: number): string {
  return amount.toFixed(2).replace('.', ',');
}
