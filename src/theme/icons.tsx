// Hungry Rider — icon registry. Every icon goes through <Icon /> so names, sizes
// and stroke stay consistent (Lucide, stroke 2, round caps).
//   <Icon name="search" />                        // 20, ink
//   <Icon name="back" size="nav" />               // 22
//   <Icon name="busyZone" color="primary" size="inline" />
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Banknote,
  CalendarClock,
  Camera,
  Car,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsRight,
  CircleAlert,
  CircleCheck,
  CircleQuestionMark,
  Clock,
  Coffee,
  CornerUpLeft,
  CornerUpRight,
  CreditCard,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Flag,
  Flame,
  Hourglass,
  Image as ImageIcon,
  Info,
  Languages,
  LifeBuoy,
  LocateFixed,
  Lock,
  LogOut,
  Mail,
  MapPin,
  MapPinOff,
  Menu,
  Merge,
  Moon,
  Motorbike,
  Navigation,
  Phone,
  Pill,
  Power,
  Receipt,
  RefreshCw,
  Rocket,
  Route,
  Scooter,
  Search,
  SearchX,
  Settings,
  ShieldCheck,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  Store,
  Timer,
  TrendingDown,
  TrendingUp,
  Undo2,
  User,
  Utensils,
  Wallet,
  WifiOff,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';

import type { ColorToken } from './colors';
import { useTheme } from './theme';

export const icons = {
  // shared
  back: ChevronLeft,
  chevronDown: ChevronDown,
  chevronUp: ChevronUp,
  chevronRight: ChevronRight,
  close: X,
  search: Search,
  noResults: SearchX,
  check: Check,
  success: CircleCheck,
  error: CircleAlert,
  info: Info,
  help: CircleQuestionMark,
  phone: Phone,
  mail: Mail,
  showPassword: Eye,
  hidePassword: EyeOff,
  lock: Lock,
  smartphone: Smartphone,
  user: User,
  language: Languages,
  settings: Settings,
  logout: LogOut,
  externalLink: ExternalLink,
  terms: FileText,
  privacy: ShieldCheck,
  cash: Banknote,
  pin: MapPin,
  pinOff: MapPinOff,
  locate: LocateFixed,
  offline: WifiOff,
  time: Clock,
  refresh: RefreshCw,
  pending: Hourglass,
  camera: Camera,
  gallery: ImageIcon,
  // rider app
  menu: Menu,
  power: Power,
  navigate: Navigation,
  store: Store,
  customer: User,
  busyZone: Flame,
  countdown: Timer,
  route: Route,
  slide: ChevronsRight,
  earnings: Wallet,
  history: Receipt,
  shifts: CalendarClock,
  support: LifeBuoy,
  darkMode: Moon,
  payoutCard: CreditCard,
  withdraw: ArrowUpRight,
  bonus: Sparkles,
  trendUp: TrendingUp,
  trendDown: TrendingDown,
  quickGuide: Zap,
  gettingStarted: Rocket,
  rules: ShieldCheck,
  report: Flag,
  vehicleMotorcycle: Motorbike,
  vehicleScooter: Scooter,
  vehicleCar: Car,
  delivery: Motorbike,
  categoryRestaurant: Utensils,
  categoryPharmacy: Pill,
  categoryGrocery: ShoppingBasket,
  categoryCafe: Coffee,
  // turn-by-turn manoeuvres
  turnLeft: ArrowLeft,
  turnRight: ArrowRight,
  straight: ArrowUp,
  slightLeft: CornerUpLeft,
  slightRight: CornerUpRight,
  uTurn: Undo2,
  roundabout: RefreshCw,
  merge: Merge,
  arrive: Flag,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof icons;
type IconSizeToken = keyof ReturnType<typeof useTheme>['size']['icon'];

export function Icon({
  name,
  size = 'field',
  color = 'ink',
  accessibilityLabel,
}: {
  name: IconName;
  size?: IconSizeToken | number;
  color?: ColorToken;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  const Glyph = icons[name];
  const px = typeof size === 'number' ? size : theme.size.icon[size];
  return (
    <Glyph
      size={px}
      color={theme.colors[color]}
      strokeWidth={2}
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
    />
  );
}
