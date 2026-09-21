import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { PageShell } from '@/components/ui/page-shell';
import { Card, RowDivider } from '@/components/ui/section';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { useLocale } from '@/contexts/locale-context';
import { useColors, useTheme, type ThemeMode } from '@/contexts/theme-context';
import { makeStyles } from '@/hooks/use-themed-styles';
import type { TranslationKey } from '@/i18n';

const OPTIONS: { mode: ThemeMode; label: TranslationKey; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { mode: 'system', label: 'appearance.system', icon: 'phone-portrait-outline' },
  { mode: 'light', label: 'appearance.light', icon: 'sunny-outline' },
  { mode: 'dark', label: 'appearance.dark', icon: 'moon-outline' },
];

/**
 * Light, dark, or whatever the phone says.
 *
 * 'Match system' is its own option rather than the absence of a choice, because
 * the two behave differently as the day goes on: a deliberate Light stays light
 * at midnight, while Match system follows the phone into dark and back out.
 */
export default function AppearanceScreen() {
  const { t } = useLocale();
  const { mode, setMode } = useTheme();
  const colors = useColors();
  const styles = useStyles();

  return (
    <PageShell title={t('appearance.title')}>
      <Card>
        {OPTIONS.map((option, index) => (
          <View key={option.mode}>
            {index > 0 ? <RowDivider /> : null}
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: mode === option.mode }}
              accessibilityLabel={t(option.label)}
              onPress={() => setMode(option.mode)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <Ionicons name={option.icon} size={24} color={colors.navy} style={styles.icon} />
              <Text size={17} style={styles.label}>
                {t(option.label)}
              </Text>
              {mode === option.mode ? (
                <Ionicons name="checkmark-circle" size={24} color={colors.orange} />
              ) : null}
            </Pressable>
          </View>
        ))}
      </Card>

      <Text size={14} color={colors.textSecondary} style={styles.hint}>
        {t('appearance.systemHint')}
      </Text>
    </PageShell>
  );
}

const useStyles = makeStyles(() => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    paddingVertical: Spacing.three,
  },
  icon: {
    width: 40,
  },
  label: {
    flex: 1,
  },
  pressed: {
    opacity: 0.6,
  },
  hint: {
    marginTop: Spacing.four,
    lineHeight: 20,
  },
}));
