import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { SlideInLeft } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useSession } from '@/features/session/session-context';
import { useDriver } from '@/hooks/use-driver';

type Entry = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
};

const ENTRIES: Entry[] = [
  { icon: 'wallet-outline', label: 'Earnings' },
  { icon: 'receipt-outline', label: 'Order history' },
  { icon: 'calendar-outline', label: 'Shifts' },
  { icon: 'help-buoy-outline', label: 'Support' },
  { icon: 'settings-outline', label: 'Settings' },
];

/** Side drawer behind the hamburger. The entries are placeholders for now. */
export default function MenuScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { phase, actions } = useSession();
  const { user, logout } = useAuth();
  // Falls back to the token claims while the backend record loads, and stays
  // on them for an account that has no driver record yet (social sign-in).
  const { data: driver } = useDriver(user?.sub);

  const displayName = driver?.name ?? user?.name ?? user?.preferred_username ?? 'Deliverer';
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
        accessibilityLabel="Close menu"
        style={styles.backdrop}
        onPress={() => router.back()}
      />

      <Animated.View
        entering={SlideInLeft.duration(240)}
        style={[styles.drawer, { paddingTop: insets.top + Spacing.five }]}>
        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={26} color={Colors.white} />
          </View>
          <View style={styles.profileText}>
            <Text weight="bold" size={18} numberOfLines={1}>
              {displayName}
            </Text>
            <Text size={14} color={Colors.textSecondary}>
              {phase === 'offline' ? 'Offline' : 'On shift'}
              {vehicleClass ? ` · ${vehicleClass.toLowerCase()}` : ''}
            </Text>
          </View>
        </View>

        <View style={styles.entries}>
          {ENTRIES.map((entry) => (
            <Pressable
              key={entry.label}
              accessibilityRole="button"
              onPress={() => router.back()}
              style={({ pressed }) => [styles.entry, pressed && styles.pressed]}>
              <Ionicons name={entry.icon} size={22} color={Colors.navy} />
              <Text size={16}>{entry.label}</Text>
            </Pressable>
          ))}
        </View>

        {phase !== 'offline' ? (
          <Pressable
            accessibilityRole="button"
            onPress={goOffline}
            style={({ pressed }) => [styles.entry, pressed && styles.pressed]}>
            <Ionicons name="power" size={22} color="#D64545" />
            <Text size={16} color="#D64545">
              Go offline
            </Text>
          </Pressable>
        ) : null}

        <Pressable
          accessibilityRole="button"
          onPress={signOut}
          style={({ pressed }) => [styles.entry, pressed && styles.pressed]}>
          <Ionicons name="log-out-outline" size={22} color="#D64545" />
          <Text size={16} color="#D64545">
            Log out
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Colors.scrim,
  },
  drawer: {
    width: '78%',
    maxWidth: 320,
    backgroundColor: Colors.card,
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
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entries: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
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
});
