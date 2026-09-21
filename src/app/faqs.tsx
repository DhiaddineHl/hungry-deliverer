import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { LayoutAnimation, Platform, Pressable, ScrollView, StyleSheet, TextInput, UIManager, View } from 'react-native';

import { useLocale } from '@/contexts/locale-context';
import { makeStyles } from '@/hooks/use-themed-styles';
import { useColors } from '@/contexts/theme-context';
import { PageShell } from '@/components/ui/page-shell';
import { Card } from '@/components/ui/section';
import { Text } from '@/components/ui/text';
import { Fonts, Radius, Spacing, tintColors } from '@/constants/theme';
import { FAQ_CATEGORIES, FAQ_TOPICS, type FaqCategory, type FaqTopic } from '@/data/faqs';

// Old-architecture Android needs this opt-in for LayoutAnimation; it is a no-op
// (and the flag is absent) under the new architecture, hence the guard.
if (Platform.OS === 'android') UIManager.setLayoutAnimationEnabledExperimental?.(true);

/**
 * The help centre: a search box over the same copy the category chips filter,
 * and one accordion card per category.
 *
 * A query searches questions and answers as well as titles, and while one is
 * typed it outranks the chip — someone who types "cash out" wants the answer,
 * not the intersection with whichever chip happened to be selected.
 */
export default function FaqsScreen() {
  const { t } = useLocale();
  const colors = useColors();
  const styles = useStyles();
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState<FaqTopic>('guide');
  const [openId, setOpenId] = useState<string | null>(null);

  // The search runs over translated copy, so it has to re-run when the
  // language does — a French query cannot match the English catalogue.
  const results = useMemo(() => filterCategories(t, query, topic), [t, query, topic]);

  const toggle = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenId((current) => (current === id ? null : id));
  };

  return (
    <PageShell title={t('faqs.title')}>
      <Text weight="semibold" size={15} color={colors.orange} style={styles.kicker}>
        {t('faqs.helpCenter')}
      </Text>
      <Text weight="bold" size={18} style={styles.headline}>
        {t('faqs.headline')}
      </Text>

      <View style={styles.search}>
        <Ionicons name="search" size={20} color={colors.textSecondary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('faqs.searchPlaceholder')}
          placeholderTextColor={colors.textMuted}
          accessibilityLabel={t('faqs.searchPlaceholder')}
          returnKeyType="search"
          style={styles.searchInput}
        />
        {query ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t('faqs.clearSearch')} onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        // The chips run to the sheet's edge in the frame, so the row breaks out
        // of the shell's padding and pays it back as content inset.
        style={styles.chipRow}>
        {FAQ_TOPICS.map((entry) => {
          const active = !query && entry.id === topic;
          return (
            <Pressable
              key={entry.id}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setTopic(entry.id)}
              style={[styles.chip, active && styles.chipActive]}>
              <Ionicons
                name={entry.icon}
                size={18}
                color={active ? colors.navy : colors.textSecondary}
              />
              <Text size={17} color={active ? colors.navy : colors.textSecondary}>
                {t(entry.label)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {results.map((category) => (
        <Card key={category.id} style={styles.category}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: openId === category.id }}
            accessibilityLabel={t(`faqs.${category.id}`)}
            onPress={() => toggle(category.id)}
            style={styles.categoryHeader}>
            <View style={[styles.tile, { backgroundColor: tintColors(colors, category.tint).background }]}>
              <Ionicons
                name={category.icon}
                size={24}
                color={tintColors(colors, category.tint).foreground}
              />
            </View>
            <Text weight="bold" size={18} style={styles.categoryTitle}>
              {t(`faqs.${category.id}`)}
            </Text>
            <Ionicons
              name={openId === category.id ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textSecondary}
            />
          </Pressable>

          {openId === category.id ? (
            <View style={styles.entries}>
              {category.entries.map((entry) => (
                <View key={entry.question} style={styles.entry}>
                  <Text weight="semibold" size={15}>
                    {t(entry.question)}
                  </Text>
                  <Text size={14} color={colors.textSecondary} style={styles.answer}>
                    {t(entry.answer)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </Card>
      ))}

      {results.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="search-outline" size={32} color={colors.textMuted} />
          <Text size={15} color={colors.textSecondary} style={styles.emptyText}>
            {t('faqs.noResults', { query: query.trim() })}
          </Text>
        </View>
      ) : null}
    </PageShell>
  );
}

/**
 * A query keeps only the categories with a matching title or entry, and trims
 * each to the entries that matched; with no query the chip picks the topic.
 */
function filterCategories(
  t: ReturnType<typeof useLocale>['t'],
  query: string,
  topic: FaqTopic
): FaqCategory[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return FAQ_CATEGORIES.filter((category) => category.topic === topic);

  return FAQ_CATEGORIES.flatMap((category) => {
    if (t(`faqs.${category.id}`).toLowerCase().includes(needle)) return [category];
    const entries = category.entries.filter(
      (entry) =>
        t(entry.question).toLowerCase().includes(needle) ||
        t(entry.answer).toLowerCase().includes(needle)
    );
    return entries.length ? [{ ...category, entries }] : [];
  });
}

const useStyles = makeStyles((c) => ({
  kicker: {
    letterSpacing: 1.2,
  },
  headline: {
    marginTop: Spacing.one,
    marginBottom: Spacing.four,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    height: 56,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.lg,
    backgroundColor: c.field,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: 16,
    color: c.text,
    // Kills the extra vertical padding Android puts inside a bare TextInput,
    // which otherwise pushes the placeholder off the row's centre line.
    paddingVertical: 0,
  },
  chipRow: {
    marginHorizontal: -Spacing.five,
    marginVertical: Spacing.four,
    flexGrow: 0,
  },
  chips: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.five,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    height: 48,
    paddingHorizontal: Spacing.five,
    borderRadius: Radius.pill,
    backgroundColor: c.chip,
  },
  chipActive: {
    backgroundColor: c.chipActive,
  },
  category: {
    marginBottom: Spacing.four,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
    paddingVertical: Spacing.four,
  },
  tile: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTitle: {
    flex: 1,
  },
  entries: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    paddingVertical: Spacing.two,
  },
  entry: {
    paddingVertical: Spacing.three,
  },
  answer: {
    marginTop: Spacing.one,
    lineHeight: 20,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.six,
  },
  emptyText: {
    textAlign: 'center',
  },
}));
