import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { SlideInLeft } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLocale } from '@/contexts/locale-context';
import { makeStyles } from '@/hooks/use-themed-styles';
import { useColors } from '@/contexts/theme-context';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useSession } from '@/features/session/session-context';
import { useDriver } from '@/hooks/use-driver';
import type { TranslationKey } from '@/i18n';

type Entry = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: TranslationKey;
  /** Destination, or undefined for an entry with no screen behind it yet. */
  href?: '/wallet' | '/delivery-history' | '/faqs' | '/settings';
};

const ENTRIES: Entry[] = [
  { icon: 'wallet-outline', label: 'menu.earnings', href: '/wallet' },
  { icon: 'receipt-outline', label: 'menu.orderHistory', href: '/delivery-history' },
  { icon: 'calendar-outline', label: 'menu.shifts' },
  { icon: 'help-buoy-outline', label: 'menu.support', href: '/faqs' },
  { icon: 'settings-outline', label: 'menu.settings', href: '/settings' },
];

/**
 * Side drawer behind the hamburger.
 *
 * Entries `replace` rather than `push`: the drawer is a transparent modal over
 * the map, so pushing would leave it sitting behind the page it opened and
 * "back" would land on the drawer again instead of the map.
 */
export default function MenuScreen() {
  const { t } = useLocale();
  const colors = useColors();
  const styles = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { phase, actions } = useSession();
  const { user, logout } = useAuth();
  // Falls back to the token claims while the backend record loads, and stays
  // on them for an account that has no driver record yet (social sign-in).
  const { data: driver } = useDriver(user?.sub);

  const displayName = driver?.name ?? user?.name ?? user?.preferred_username ?? t('menu.deliverer');
  const vehicleClass = driver?.vehicle?.type;

  const goOffline = () => {
    actions.stopSession();
    router.back();
  };

  const signOut = async () => {
    actions.stopSession();
    await logout();
    router.replace('/');
  };

  return (
    <View style={styles.screen}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('menu.closeMenu')}
        style={styles.backdrop}
        onPress={() => router.back()}
      />

      <Animated.View
        entering={SlideInLeft.duration(240)}
        style={[styles.drawer, { paddingTop: insets.top + Spacing.five }]}>
        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={26} color={colors.onNavy} />
          </View>
          <View style={styles.profileText}>
            <Text weight="bold" size={18} numberOfLines={1}>
              {displayName}
            </Text>
            <Text size={14} color={colors.textSecondary}>
              {phase === 'offline' ? t('menu.offline') : t('menu.onShift')}
              {vehicleClass ? ` · ${vehicleClass.toLowerCase()}` : ''}
            </Text>
          </View>
        </View>

        <View style={styles.entries}>
          {ENTRIES.map((entry) => (
            <Pressable
              key={entry.label}
              accessibilityRole="button"
              onPress={() => (entry.href ? router.replace(entry.href) : router.back())}
              style={({ pressed }) => [styles.entry, pressed && styles.pressed]}>
              <Ionicons name={entry.icon} size={22} color={colors.navy} />
              <Text size={16}>{t(entry.label)}</Text>
            </Pressable>
          ))}
        </View>

        {phase !== 'offline' ? (
          <Pressable
            accessibilityRole="button"
            onPress={goOffline}
            style={({ pressed }) => [styles.entry, pressed && styles.pressed]}>
            <Ionicons name="power" size={22} color={colors.danger} />
            <Text size={16} color={colors.danger}>
              {t('menu.goOffline')}
            </Text>
          </Pressable>
        ) : null}

        <Pressable
          accessibilityRole="button"
          onPress={signOut}
          style={({ pressed }) => [styles.entry, pressed && styles.pressed]}>
          <Ionicons name="log-out-outline" size={22} color={colors.danger} />
          <Text size={16} color={colors.danger}>
            {t('menu.logOut')}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: c.scrim,
  },
  drawer: {
    width: '78%',
    maxWidth: 320,
    backgroundColor: c.card,
    borderTopRightRadius: Radius.lg,
    borderBottomRightRadius: Radius.lg,
    paddingHorizontal: Spacing.five,
    paddingBottom: Spacing.five,
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingBottom: Spacing.five,
  },
  profileText: {
    flex: 1,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: Radius.pill,
    backgroundColor: c.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entries: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: c.border,
    paddingTop: Spacing.three,
  },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
    paddingVertical: Spacing.four,
  },
  pressed: {
    opacity: 0.6,
  },
}));
