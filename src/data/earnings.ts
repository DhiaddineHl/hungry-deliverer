import type { IconName } from '@/theme';

/**
 * Earnings, wallet and delivery-history figures.
 *
 * The backend has no earnings endpoints yet — `services/api` covers drivers,
 * availability, location and delivery status, and nothing else — so these
 * screens render placeholder data with the shapes the eventual DTOs will fill.
 * Everything the UI reads goes through the types below, so swapping in a real
 * query later is a change to this module's exports, not to the screens.
 */

/** A day bucket a row falls in; the label is composed at render time. */
export type DayBucket = 'today' | 'yesterday' | 'monday';

export type Money = {
  amount: number;
  currency: 'TND';
};

/** What a delivery was for — picks the row's icon. */
export type StoreCategory = 'restaurant' | 'pharmacy' | 'grocery' | 'cafe';

export const CATEGORY_ICONS: Record<StoreCategory, IconName> = {
  restaurant: 'categoryRestaurant',
  pharmacy: 'categoryPharmacy',
  grocery: 'categoryGrocery',
  cafe: 'categoryCafe',
};

export type DeliveryRecord = {
  id: string;
  /** A trading name — not translated, the same in every language. */
  merchant: string;
  /** Local time of the drop-off. */
  time: string;
  status: 'completed' | 'cancelled';
  /** What the rider earned. */
  fee: Money;
  category: StoreCategory;
};

export type DeliveryDay = {
  bucket: Exclude<DayBucket, 'monday'>;
  /** The date part of the heading, already short-formatted: "24 Oct". */
  date: string;
  records: DeliveryRecord[];
};

export type PeriodRecap = {
  earned: Money;
  trips: number;
  /** Change against the previous period, in percent. */
  changePercent: number;
};

export const MONTH_RECAP: PeriodRecap = {
  earned: { amount: 142.5, currency: 'TND' },
  trips: 48,
  changePercent: 12,
};

export const WEEK_RECAP: PeriodRecap = {
  earned: { amount: 31.2, currency: 'TND' },
  trips: 4,
  changePercent: -5,
};

export const DELIVERY_HISTORY: DeliveryDay[] = [
  {
    bucket: 'today',
    date: '24 Oct',
    records: [
      { id: 'd-2043', merchant: 'Gourmet Burger', time: '14:20', status: 'completed', fee: { amount: 8.5, currency: 'TND' }, category: 'restaurant' },
      { id: 'd-2038', merchant: 'Central Pharmacy', time: '11:05', status: 'completed', fee: { amount: 12.2, currency: 'TND' }, category: 'pharmacy' },
    ],
  },
  {
    bucket: 'yesterday',
    date: '23 Oct',
    records: [
      { id: 'd-2019', merchant: 'Monoprix Market', time: '19:45', status: 'completed', fee: { amount: 6, currency: 'TND' }, category: 'grocery' },
      { id: 'd-2011', merchant: 'The Daily Brew', time: '16:12', status: 'completed', fee: { amount: 4.5, currency: 'TND' }, category: 'cafe' },
    ],
  },
];

/** Today so far — the drawer card and the online summary row. */
export const TODAY_SUMMARY: { trips: number; earned: Money } = {
  trips: 2,
  earned: { amount: 20.7, currency: 'TND' },
};

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export type WeekStats = {
  trips: number;
  onlineMinutes: number;
  averagePerTrip: Money;
  total: Money;
  /** Monday-first earnings, one entry per weekday keyed by `weekdays.*`. */
  daily: { day: Weekday; amount: number }[];
  /** Index into `daily` the chart highlights — the current day. */
  todayIndex: number;
};

export const WEEK_STATS: WeekStats = {
  trips: 42,
  onlineMinutes: 380,
  averagePerTrip: { amount: 9.5, currency: 'TND' },
  total: { amount: 312, currency: 'TND' },
  daily: [
    { day: 'mon', amount: 24 },
    { day: 'tue', amount: 38 },
    { day: 'wed', amount: 20 },
    { day: 'thu', amount: 52 },
    { day: 'fri', amount: 48 },
    { day: 'sat', amount: 12 },
    { day: 'sun', amount: 6 },
  ],
  todayIndex: 4,
};

export type PayoutMethod = {
  /** Last four digits only — nothing else about the card is ours to hold. */
  last4: string;
  isPrimary: boolean;
};

export const PAYOUT_METHOD: PayoutMethod = { last4: '4821', isPrimary: true };

export type WalletTransaction = {
  id: string;
  kind: 'order' | 'bonus' | 'withdrawal';
  /** Present for an order movement — the order it paid for. */
  orderNumber?: string;
  when: DayBucket;
  time: string;
  /** Signed: positive credits the wallet, negative is a withdrawal. */
  amount: number;
};

export const WALLET_BALANCE: Money = { amount: 248.5, currency: 'TND' };

/** Flat fee taken out of an instant withdrawal, as quoted under the button. */
export const WITHDRAW_FEE: Money = { amount: 1, currency: 'TND' };

export const WALLET_TRANSACTIONS: WalletTransaction[] = [
  { id: 't-1', kind: 'order', orderNumber: '2043', when: 'today', time: '15:55', amount: 8.5 },
  { id: 't-2', kind: 'bonus', when: 'monday', time: '09:00', amount: 15 },
  { id: 't-3', kind: 'withdrawal', when: 'yesterday', time: '18:05', amount: -42 },
];
