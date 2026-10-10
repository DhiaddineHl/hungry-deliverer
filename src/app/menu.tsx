import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, SlideInLeft } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useVehicleLabel } from '@/components/sheets/session-sheets';
import { Avatar, IconWell, StatusDot } from '@/components/ui/content';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/contexts/auth-context';
import { useLocale } from '@/contexts/locale-context';
import { TODAY_SUMMARY } from '@/data/earnings';
import { formatMoney, initialsOf } from '@/features/format';
import { useSession } from '@/features/session/session-context';
import { useDriver } from '@/hooks/use-driver';
import type { TranslationKey } from '@/i18n';
import { Icon, makeStyles, type IconName } from '@/theme';

type Entry = {
  icon: IconName;
  label: TranslationKey;
  /** Destination, or undefined for an entry with no screen behind it yet. */
  href?: '/wallet' | '/delivery-history' | '/faqs' | '/settings';
};

const ENTRIES: Entry[] = [
  { icon: 'earnings', label: 'menu.earnings', href: '/wallet' },
  { icon: 'history', label: 'menu.history', href: '/delivery-history' },
  { icon: 'shifts', label: 'menu.shifts' },
  { icon: 'support', label: 'menu.help', href: '/faqs' },
  { icon: 'settings', label: 'menu.settings', href: '/settings' },
];

/**
 * D10 — the drawer behind the menu button: who is riding, today's tally, the
 * five destinations and Log out pinned to the bottom.
 *
 * Entries `replace` rather than `push`: the drawer is a transparent modal over
 * the map, so pushing would leave it behind the page it opened and "back"
 * would land on the drawer again instead of the map.
 */
export default function MenuScreen() {
  const { t } = useLocale();
  const styles = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const showToast = useToast((state) => state.show);
  const { phase, actions } = useSession();
  const { user, logout } = useAuth();
  // Token claims stand in while the backend record loads.
  const { data: driver } = useDriver(user?.sub);
  const vehicleLabel = useVehicleLabel(driver?.vehicle);

  const fullName = driver?.fullname
    ? `${driver.fullname.firstName ?? ''} ${driver.fullname.lastName ?? ''}`.trim()
    : '';
  const displayName = fullName || driver?.name || user?.name || user?.preferred_username || t('menu.deliverer');
  const online = phase !== 'offline';
  const vehicleName = vehicleLabel?.split(' · ')[0];

  const open = (entry: Entry) => {
    if (entry.href) {
      router.replace(entry.href);
    } else {
      router.back();
      showToast(t('menu.shiftsSoon'));
    }
  };

  const signOut = async () => {
    actions.stopSession();
    await logout();
    router.replace('/');
  };

  const trips = TODAY_SUMMARY.trips;

  return (
    <View style={styles.screen}>
      <Animated.View entering={FadeIn.duration(200)} style={styles.scrim}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('menu.closeMenu')}
          style={StyleSheet.absoluteFill}
          onPress={() => router.back()}
        />
      </Animated.View>

      <Animated.View
        entering={SlideInLeft.duration(240)}
        style={[styles.drawer, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 8 }]}
        accessibilityViewIsModal>
        <View style={styles.header}>
          <Avatar initials={initialsOf(displayName)} />
          <View style={styles.headerText}>
            <Text variant="contactName" numberOfLines={1}>
              {displayName}
            </Text>
            <View style={styles.statusLine}>
              <StatusDot color={online ? 'success' : 'inkSubtle'} />
              <Text variant="meta" color="inkMuted" numberOfLines={1} style={styles.regular}>
                {online ? t('menu.online') : t('menu.offline')}
                {vehicleName ? ` · ${vehicleName}` : ''}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.today}>
          <View style={styles.todayCell}>
            <Text variant="caption" color="inkMuted" style={styles.regular}>
              {t('menu.today')}
            </Text>
            <Text variant="amount">{formatMoney(TODAY_SUMMARY.earned.amount)}</Text>
          </View>
          <View style={[styles.todayCell, styles.todayRight]}>
            <Text variant="caption" color="inkMuted" style={styles.regular}>
              {t('menu.trips')}
            </Text>
            <Text variant="amount">{trips}</Text>
          </View>
        </View>

        <View style={styles.entries}>
          {ENTRIES.map((entry) => (
            <Pressable
              key={entry.label}
              accessibilityRole="button"
              onPress={() => open(entry)}
              style={({ pressed }) => [styles.entry, pressed && styles.pressed]}>
              <IconWell icon={entry.icon} />
              <Text variant="itemLabel" style={styles.entryLabel}>
                {t(entry.label)}
              </Text>
              <Icon name="chevronRight" size="row" color="inkMuted" />
            </Pressable>
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={signOut}
          style={({ pressed }) => [styles.entry, styles.logout, pressed && styles.pressed]}>
          <IconWell icon="logout" tone="danger" />
          <Text variant="itemLabel" color="danger">
            {t('menu.logOut')}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const useStyles = makeStyles((c, t) => ({
  screen: {
    flex: 1,
    flexDirection: 'row',
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: c.drawerScrim,
  },
  drawer: {
    width: t.size.drawerWidth,
    maxWidth: '86%',
    backgroundColor: c.surface,
    borderTopRightRadius: t.radius.sheet,
    borderBottomRightRadius: t.radius.sheet,
  },
  regular: {
    fontFamily: t.typography.description.fontFamily,
  },
  header: {
    marginHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  statusLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  today: {
    marginTop: 20,
    marginHorizontal: 20,
    borderRadius: t.radius.thumb,
    backgroundColor: c.surfaceMuted,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  todayCell: {
    gap: 2,
  },
  todayRight: {
    alignItems: 'flex-end',
  },
  entries: {
    flex: 1,
    marginTop: 16,
    marginHorizontal: 8,
  },
  entry: {
    height: t.size.drawerRow,
    paddingHorizontal: 12,
    borderRadius: t.radius.field,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  entryLabel: {
    flex: 1,
  },
  logout: {
    marginHorizontal: 8,
  },
  pressed: {
    backgroundColor: c.surfaceMuted,
  },
}));
