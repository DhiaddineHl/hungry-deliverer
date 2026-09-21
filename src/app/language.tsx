import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { PageShell } from '@/components/ui/page-shell';
import { Card, RowDivider } from '@/components/ui/section';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { useLocale } from '@/contexts/locale-context';
import { useColors } from '@/contexts/theme-context';
import { makeStyles } from '@/hooks/use-themed-styles';
import { SUPPORTED_LANGUAGES, type Language, type TranslationKey } from '@/i18n';

const LABELS: Record<Language, TranslationKey> = {
  en: 'language.english',
  fr: 'language.french',
};

/**
 * The app's language.
 *
 * Each option is written in its own language — someone looking for French is
 * looking for the word "Français", not for whatever the current language calls
 * it — so these two labels are deliberately identical in both catalogues.
 */
export default function LanguageScreen() {
  const { t, language, setLanguage } = useLocale();
  const colors = useColors();
  const styles = useStyles();

  return (
    <PageShell title={t('language.title')}>
      <Card>
        {SUPPORTED_LANGUAGES.map((code, index) => (
          <View key={code}>
            {index > 0 ? <RowDivider /> : null}
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: language === code }}
              accessibilityLabel={t(LABELS[code])}
              onPress={() => setLanguage(code)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <Text size={17} style={styles.label}>
                {t(LABELS[code])}
              </Text>
              {language === code ? (
                <Ionicons name="checkmark-circle" size={24} color={colors.orange} />
              ) : null}
            </Pressable>
          </View>
        ))}
      </Card>

      <Text size={14} color={colors.textSecondary} style={styles.hint}>
        {t('language.hint')}
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
