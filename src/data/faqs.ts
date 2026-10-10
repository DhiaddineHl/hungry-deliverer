import type { TranslationKey } from '@/i18n';
import type { IconName } from '@/theme';

/**
 * Help-centre copy. Static by design: these answers are the same for every
 * rider and change with an app release, so there is no endpoint behind them —
 * the search field and the topic chips filter this list in place.
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
  icon: IconName;
  /** Getting started is the one category with an orange-soft well. */
  highlighted?: boolean;
  entries: FaqEntry[];
};

export const FAQ_TOPICS: { id: FaqTopic; label: TranslationKey; icon: IconName }[] = [
  { id: 'guide', label: 'faqs.topicGuide', icon: 'quickGuide' },
  { id: 'policy', label: 'faqs.topicPolicy', icon: 'rules' },
  { id: 'tax', label: 'faqs.topicTax', icon: 'earnings' },
];

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: 'gettingStarted',
    topic: 'guide',
    icon: 'gettingStarted',
    highlighted: true,
    entries: [
      { question: 'faqContent.goOnlineQ', answer: 'faqContent.goOnlineA' },
      { question: 'faqContent.noOffersQ', answer: 'faqContent.noOffersA' },
      { question: 'faqContent.acceptWindowQ', answer: 'faqContent.acceptWindowA' },
    ],
  },
  {
    id: 'appSupport',
    topic: 'guide',
    icon: 'smartphone',
    entries: [
      { question: 'faqContent.mapQ', answer: 'faqContent.mapA' },
      { question: 'faqContent.loggedOutQ', answer: 'faqContent.loggedOutA' },
    ],
  },
  {
    id: 'safety',
    topic: 'policy',
    icon: 'rules',
    entries: [
      { question: 'faqContent.accidentQ', answer: 'faqContent.accidentA' },
      { question: 'faqContent.coverQ', answer: 'faqContent.coverA' },
    ],
  },
  {
    id: 'earnings',
    topic: 'tax',
    icon: 'earnings',
    entries: [
      { question: 'faqContent.cashOutQ', answer: 'faqContent.cashOutA' },
      { question: 'faqContent.feeQ', answer: 'faqContent.feeA' },
      { question: 'faqContent.taxesQ', answer: 'faqContent.taxesA' },
    ],
  },
];

/** The support line the Help screen and the in-trip help button call. */
export const SUPPORT_PHONE = '+21671000000';
