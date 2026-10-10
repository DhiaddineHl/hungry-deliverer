import { useEffect } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { Text } from '@/components/ui/text';
import { Icon, makeStyles, useTheme } from '@/theme';

type ToastState = {
  message: string | null;
  /** Bumped on every show, so the same message twice restarts the timer. */
  id: number;
  /** Lifts the toast clear of a bottom bar or map sheet. */
  raised: boolean;
  show: (message: string, options?: { raised?: boolean }) => void;
  hide: () => void;
};

/**
 * Inline success feedback ("Changes saved", "Offer expired"). One at a time;
 * a new toast replaces the old one. Mounted once, by the root layout.
 */
export const useToast = create<ToastState>((set) => ({
  message: null,
  id: 0,
  raised: false,
  show: (message, options) =>
    set((state) => ({ message, id: state.id + 1, raised: options?.raised ?? false })),
  hide: () => set({ message: null }),
}));

export function ToastHost() {
  const { message, id, raised, hide } = useToast();
  const { motion } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!message) return;
    AccessibilityInfo.announceForAccessibility(message);
    const timer = setTimeout(hide, motion.toastMs);
    return () => clearTimeout(timer);
  }, [message, id, hide, motion.toastMs]);

  if (!message) return null;

  return (
    <View pointerEvents="none" style={[styles.host, { bottom: raised ? 104 : insets.bottom + 16 }]}>
      <Animated.View key={id} entering={FadeInDown.duration(200)} exiting={FadeOutDown.duration(160)} style={styles.toast}>
        <Icon name="success" color="onToast" />
        <Text variant="chip" color="onToast" style={styles.text}>
          {message}
        </Text>
      </Animated.View>
    </View>
  );
}

const useStyles = makeStyles((c, t) => ({
  host: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: t.radius.field,
    backgroundColor: c.toast,
    paddingVertical: 12,
    paddingHorizontal: 14,
    ...t.shadow.toast,
  },
  text: {
    flex: 1,
  },
}));
