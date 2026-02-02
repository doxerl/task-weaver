import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import trCommon from './locales/tr/common.json';
import trFinance from './locales/tr/finance.json';
import trSimulation from './locales/tr/simulation.json';
import trValidation from './locales/tr/validation.json';

import enCommon from './locales/en/common.json';
import enFinance from './locales/en/finance.json';
import enSimulation from './locales/en/simulation.json';
import enValidation from './locales/en/validation.json';

export const SUPPORTED_LANGUAGES = ['tr', 'en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  tr: 'Türkçe',
  en: 'English',
};

export const LANGUAGE_FLAGS: Record<SupportedLanguage, string> = {
  tr: '🇹🇷',
  en: '🇬🇧',
};

const resources = {
  tr: {
    common: trCommon,
    finance: trFinance,
    simulation: trSimulation,
    validation: trValidation,
  },
  en: {
    common: enCommon,
    finance: enFinance,
    simulation: enSimulation,
    validation: enValidation,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'tr',
    defaultNS: 'common',
    ns: ['common', 'finance', 'simulation', 'validation'],

    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'language',
    },

    interpolation: {
      escapeValue: false, // React already escapes
    },

    react: {
      useSuspense: false, // Disable to avoid loading states
    },
  });

export default i18n;
