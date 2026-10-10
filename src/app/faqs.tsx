import { useMemo, useState } from 'react';
import { LayoutAnimation, Linking, Pressable, ScrollView, View } from 'react-native';

import { SecondaryButton } from '@/components/ui/button';
import { Card, Divider, IconWell } from '@/components/ui/content';
import { StateView } from '@/components/ui/feedback';
import { Page } from '@/components/ui/page';
import { FilterChip } from '@/components/ui/selection';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { useLocale } from '@/contexts/locale-context';
import { FAQ_CATEGORIES, FAQ_TOPICS, SUPPORT_PHONE, type FaqCategory, type FaqTopic } from '@/data/faqs';
import { Icon, makeStyles } from '@/theme';

/**
 * F1 — Help: a search over the same copy the topic chips filter, then one
 * accordion card per category; a question opens its answer in place.
 *
 * A typed query outranks the chip: someone who types "withdraw" wants the
 * answer, not its intersection with whichever chip happened to be selected.
 */
export default function FaqsScreen() {
  const { t } = useLocale();
  const styles = useStyles();
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState<FaqTopic>('guide');
  const [openCategory, setOpenCategory] = useState<string | null>(FAQ_CATEGORIES[0].id);
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);

  // The search runs over translated copy, so it re-runs when the language does.
  const results = useMemo(() => filterCategories(t, query, topic), [t, query, topic]);
  const searching = query.trim().length > 0;

  const animate = () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  const toggleCategory = (id: string) => {
    animate();
    setOpenCategory((current) => (current === id ? null : id));
  };
  const toggleQuestion = (key: string) => {
    animate();
    setOpenQuestion((current) => (current === key ? null : key));
  };

  return (
    <Page
      title={t('faqs.title')}
      bottomBar={
        <SecondaryButton
          label={t('faqs.contactSupport')}
          icon="phone"
          onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE}`)}
          style={styles.flex}
        />
      }>
      <Text variant="title" accessibilityRole="header" style={styles.headline}>
        {t('faqs.headline')}
      </Text>

      <TextField
        value={query}
        onChangeText={setQuery}
        placeholder={t('faqs.searchPlaceholder')}
        accessibilityLabel={t('faqs.searchPlaceholder')}
        leadingIcon="search"
        returnKeyType="search"
        containerStyle={styles.search}
        trailing={
          query ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('faqs.clearSearch')}
              onPress={() => setQuery('')}
              hitSlop={12}>
              <Icon name="close" color="inkMuted" />
            </Pressable>
          ) : undefined
        }
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        // The chips run edge to edge: the row breaks out of the page gutter and
        // pays it back as content inset.
        style={styles.chipRow}
        contentContainerStyle={styles.chips}>
        {FAQ_TOPICS.map((entry) => (
          <FilterChip
            key={entry.id}
            label={t(entry.label)}
            icon={entry.icon}
            selected={!searching && entry.id === topic}
            onPress={() => {
              setQuery('');
              setTopic(entry.id);
            }}
          />
        ))}
      </ScrollView>

      {results.length === 0 ? (
        <StateView
          icon="noResults"
          title={t('faqs.noResultsTitle')}
          body={t('faqs.noResults', { query: query.trim() })}
          style={styles.empty}
        />
      ) : (
        <View style={styles.categories}>
          {results.map((category) => {
            const open = searching || openCategory === category.id;
            return (
              <Card key={category.id}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: open }}
                  onPress={() => toggleCategory(category.id)}
                  disabled={searching}
                  style={styles.categoryHeader}>
                  <IconWell icon={category.icon} size={40} tone={category.highlighted ? 'primary' : 'neutral'} />
                  <Text variant="rowTitle" style={styles.flex}>
                    {t(`faqs.${category.id}`)}
                  </Text>
                  {!searching ? <Icon name={open ? 'chevronUp' : 'chevronDown'} size="row" /> : null}
                </Pressable>

                {open
                  ? category.entries.map((entry) => {
                      const key = entry.question;
                      const answerOpen = searching || openQuestion === key;
                      return (
                        <View key={key}>
                          <Divider />
                          <Pressable
                            accessibilityRole="button"
                            accessibilityState={{ expanded: answerOpen }}
                            onPress={() => toggleQuestion(key)}
                            style={styles.question}>
                            <Text variant="chip" style={[styles.flex, styles.questionText]}>
                              {t(entry.question)}
                            </Text>
                            <Icon name={answerOpen ? 'chevronUp' : 'chevronRight'} size="row" color="inkMuted" />
                          </Pressable>
                          {answerOpen ? (
                            <Text variant="description" color="inkMuted" style={styles.answer}>
                              {t(entry.answer)}
                            </Text>
                          ) : null}
                        </View>
                      );
                    })
                  : null}
              </Card>
            );
          })}
        </View>
      )}
    </Page>
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
        t(entry.question).toLowerCase().includes(needle) || t(entry.answer).toLowerCase().includes(needle)
    );
    return entries.length ? [{ ...category, entries }] : [];
  });
}

const useStyles = makeStyles((c, t) => ({
  flex: {
    flex: 1,
  },
  headline: {
    marginTop: 16,
  },
  search: {
    marginTop: 16,
  },
  chipRow: {
    marginTop: 16,
    marginHorizontal: -t.screenPadding,
    flexGrow: 0,
  },
  chips: {
    gap: 8,
    paddingHorizontal: t.screenPadding,
  },
  categories: {
    marginTop: 16,
    gap: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  question: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  questionText: {
    lineHeight: 20,
  },
  answer: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    marginTop: -4,
  },
  empty: {
    marginTop: 40,
  },
}));
