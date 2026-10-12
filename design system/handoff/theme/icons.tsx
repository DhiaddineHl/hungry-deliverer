// Hungry — icon registry (customer + rider apps). Every icon goes through <Icon />.
//   <Icon name="search" />                        // 20, ink
//   <Icon name="back" size="nav" />               // 22
//   <Icon name="favourite" filled />              // saved heart, primary fill
//   <Icon name="busyZone" color="primary" size="inline" />
import React from 'react';
import {
  ArrowUpRight, Banknote, Bell, BellOff, Briefcase, Building2, CalendarClock, Car, Check, ChefHat,
  ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsRight, CircleAlert, CircleCheck, CircleHelp,
  Clock, Coffee, CreditCard, ExternalLink, Eye, FileText, Flag, Flame, Heart, House, Info, Languages,
  LifeBuoy, LocateFixed, Lock, LogOut, Mail, MapPin, MapPinOff, Menu, Minus, Moon, Motorbike, Navigation,
  Package, Phone, Pill, Plus, Power, Receipt, Rocket, RotateCcw, Route, Scooter, Search, SearchX, Settings,
  ShieldCheck, ShoppingBag, ShoppingBasket, ShoppingCart, Smartphone, Sparkles, Star, Store, ThumbsUp,
  Timer, Trash2, TrendingUp, User, UserCog, Utensils, Wallet, WifiOff, X, Zap,
  type LucideIcon,
} from 'lucide-react-native';
import { useTheme } from './theme';
import type { ColorToken } from './colors';

export const icons = {
  // shared
  back: ChevronLeft, chevronDown: ChevronDown, chevronUp: ChevronUp, chevronRight: ChevronRight, close: X,
  search: Search, check: Check, success: CircleCheck, error: CircleAlert, info: Info, help: CircleHelp,
  phone: Phone, mail: Mail, showPassword: Eye, lock: Lock, smartphone: Smartphone, user: User,
  language: Languages, settings: Settings, logout: LogOut, delete: Trash2, externalLink: ExternalLink,
  terms: FileText, privacy: ShieldCheck, cash: Banknote, pin: MapPin, pinOff: MapPinOff, locate: LocateFixed,
  offline: WifiOff, add: Plus, remove: Minus, time: Clock,
  // customer app
  bell: Bell, bellOff: BellOff, home: House, favourite: Heart, cart: ShoppingCart, profile: User,
  liked: ThumbsUp, delivery: Motorbike, noResults: SearchX, apartment: Building2, office: Briefcase,
  house: House, receipt: Receipt, preparing: ChefHat, ready: ShoppingBag, delivered: Package,
  reorder: RotateCcw, star: Star, accountSettings: UserCog, report: Flag,
  // rider app
  menu: Menu, power: Power, navigate: Navigation, store: Store, customer: User, busyZone: Flame,
  countdown: Timer, route: Route, slide: ChevronsRight, earnings: Wallet, history: Receipt,
  shifts: CalendarClock, support: LifeBuoy, darkMode: Moon, payoutCard: CreditCard, withdraw: ArrowUpRight,
  bonus: Sparkles, trendUp: TrendingUp, quickGuide: Zap, gettingStarted: Rocket, rules: ShieldCheck,
  vehicleMotorcycle: Motorbike, vehicleScooter: Scooter, vehicleCar: Car,
  categoryRestaurant: Utensils, categoryPharmacy: Pill, categoryGrocery: ShoppingBasket, categoryCafe: Coffee,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof icons;
type SizeToken = keyof ReturnType<typeof useTheme>['size']['icon'];

export function Icon({
  name, size = 'field', color = 'ink', filled = false, accessibilityLabel,
}: { name: IconName; size?: SizeToken | number; color?: ColorToken; filled?: boolean; accessibilityLabel?: string }) {
  const theme = useTheme();
  const Cmp = icons[name];
  const px = typeof size === 'number' ? size : theme.size.icon[size];
  const stroke = theme.colors[filled && color === 'ink' ? 'primary' : color];
  return (
    <Cmp
      size={px}
      color={stroke}
      strokeWidth={2}
      fill={filled ? stroke : 'none'}
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
    />
  );
}
