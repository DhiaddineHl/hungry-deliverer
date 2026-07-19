import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';

type Props = {
  label: string;
  /** Teal is used for every "good news" state; navy for Offline. */
  tone?: 'neutral' | 'teal';
  loading?: boolean;
};

/** The white capsule floating at the top-centre of every frame. */
export function StatusPill({ label, tone = 'neutral', loading = false }: Props) {
  return (
    <Animated.View entering={FadeInUp.duration(220)} exiting={FadeOutUp.duration(160)}>
      <View style={styles.pill}>
        {loading ? (
          <ActivityIndicator size="small" color={Colors.orange} style={styles.spinner} />
        ) : null}
        <Text weight="semibold" size={17} color={tone === 'teal' ? Colors.teal : Colors.text}>
          {label}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.five,
    height: 48,
    borderRadius: Radius.pill,
    ...Shadow.pill,
  },
  spinner: {
    marginRight: Spacing.two,
  },
});
