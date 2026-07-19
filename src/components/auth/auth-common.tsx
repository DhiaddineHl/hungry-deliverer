import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';

/** "———— Or ————" separator above the social button. */
export function OrDivider() {
  return (
    <Text size={14} color={Colors.textSecondary} style={styles.orText}>
      Or
    </Text>
  );
}

/** The white "Log in with Google" button. Static for now. */
export function GoogleButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.google, pressed && styles.pressed]}>
      {/* Google's mark; stand-in glyph until the brand asset is added. */}
      <View style={styles.googleMark}>
        <Ionicons name="logo-google" size={20} color="#4285F4" />
      </View>
      <Text weight="semibold" size={15} color={Colors.text}>
        LOG IN WITH GOOGLE
      </Text>
    </Pressable>
  );
}

/** The fine-print consent line under the social button. */
export function TermsFooter() {
  return (
    <Text size={12} color={Colors.textMuted} style={styles.terms}>
      By continuing, you automatically accept our{' '}
      <Text size={12} color={Colors.textSecondary} style={styles.link}>
        Terms & Conditions
      </Text>
      ,{' '}
      <Text size={12} color={Colors.textSecondary} style={styles.link}>
        Privacy Policy
      </Text>{' '}
      and{' '}
      <Text size={12} color={Colors.textSecondary} style={styles.link}>
        Cookies policy
      </Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  orText: {
    textAlign: 'center',
    marginVertical: Spacing.three,
  },
  google: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    height: 56,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  googleMark: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  terms: {
    textAlign: 'center',
    marginTop: Spacing.five,
    lineHeight: 18,
  },
  link: {
    textDecorationLine: 'underline',
  },
});
