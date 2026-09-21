import type { Ionicons } from '@expo/vector-icons';

import type { Tint } from '@/constants/theme';
import type { TranslationKey } from '@/i18n';

/**
 * Help-centre copy. Static by design: these answers are the same for every
 * deliverer and change with an app release, so there is no endpoint behind
 * them — the search box and the category chips filter this list in place.
 */

export type FaqTopic = 'guide' | 'policy' | 'tax';

export type FaqEntry = {
  /** Catalogue keys — the questions and answers are translated copy. */
  question: TranslationKey;
  answer: TranslationKey;
};

export type FaqCategory = {
  /** Also the catalogue key for the category's title (`faqs.<id>`). */
  id: 'gettingStarted' | 'earnings' | 'safety' | 'appSupport';
  topic: FaqTopic;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  /**
   * Which tinted square sits behind the icon. A palette name rather than a
   * colour: the frame's pastels are a light-mode idea, and the theme owns what
   * each tint becomes after dark (see `Tint` in constants/theme).
   */
  tint: Tint;
  entries: FaqEntry[];
};

export const FAQ_TOPICS: {
  id: FaqTopic;
  /** Catalogue key for the chip's label. */
  label: TranslationKey;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}[] = [
  { id: 'guide', label: 'faqs.topicGuide', icon: 'flash-outline' },
  { id: 'policy', label: 'faqs.topicPolicy', icon: 'shield-checkmark-outline' },
  { id: 'tax', label: 'faqs.topicTax', icon: 'card-outline' },
];

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: 'gettingStarted',
    topic: 'guide',
    icon: 'rocket-outline',
    tint: 'warm',
    entries: [
      { question: 'faqContent.goOnlineQ', answer: 'faqContent.goOnlineA' },
      { question: 'faqContent.noOffersQ', answer: 'faqContent.noOffersA' },
      { question: 'faqContent.acceptWindowQ', answer: 'faqContent.acceptWindowA' },
    ],
  },
  {
    id: 'earnings',
    topic: 'tax',
    icon: 'cash-outline',
    tint: 'teal',
    entries: [
      { question: 'faqContent.cashOutQ', answer: 'faqContent.cashOutA' },
      { question: 'faqContent.feeQ', answer: 'faqContent.feeA' },
      { question: 'faqContent.taxesQ', answer: 'faqContent.taxesA' },
    ],
  },
  {
    id: 'safety',
    topic: 'policy',
    icon: 'shield-outline',
    tint: 'red',
    entries: [
      { question: 'faqContent.accidentQ', answer: 'faqContent.accidentA' },
      { question: 'faqContent.coverQ', answer: 'faqContent.coverA' },
    ],
  },
  {
    id: 'appSupport',
    topic: 'guide',
    icon: 'phone-portrait-outline',
    tint: 'blue',
    entries: [
      { question: 'faqContent.mapQ', answer: 'faqContent.mapA' },
      { question: 'faqContent.loggedOutQ', answer: 'faqContent.loggedOutA' },
    ],
  },
];
