import React, {
  createContext,
  useContext,
  useCallback,
  useMemo,
  ReactNode,
  useEffect,
} from 'react';
import { useTranslation } from 'react-i18next';
import { tr, enUS } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import {
  SupportedLanguage,
  SUPPORTED_LANGUAGES,
  LANGUAGE_LABELS,
  LANGUAGE_FLAGS,
} from '@/i18n';

interface LanguageContextType {
  /** Current language code */
  language: SupportedLanguage;
  /** Change language */
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  /** date-fns locale for current language */
  dateLocale: Locale;
  /** Intl locale string for number/currency formatting */
  numberLocale: string;
  /** List of supported languages */
  supportedLanguages: readonly SupportedLanguage[];
  /** Language display labels */
  languageLabels: Record<SupportedLanguage, string>;
  /** Language flag emojis */
  languageFlags: Record<SupportedLanguage, string>;
  /** Translation function */
  t: (key: string, options?: Record<string, unknown>) => string;
}

const DATE_LOCALES: Record<SupportedLanguage, Locale> = {
  tr: tr,
  en: enUS,
};

const NUMBER_LOCALES: Record<SupportedLanguage, string> = {
  tr: 'tr-TR',
  en: 'en-US',
};

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const { i18n, t } = useTranslation();

  // Extract base language code (e.g., 'en-US' -> 'en')
  const language = useMemo(() => {
    const lang = i18n.language?.split('-')[0] || 'tr';
    return SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage)
      ? (lang as SupportedLanguage)
      : 'tr';
  }, [i18n.language]);

  // Set document language attribute
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback(
    async (lang: SupportedLanguage) => {
      // Update i18next (this also updates localStorage via detection config)
      await i18n.changeLanguage(lang);
    },
    [i18n]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      dateLocale: DATE_LOCALES[language] || tr,
      numberLocale: NUMBER_LOCALES[language] || 'tr-TR',
      supportedLanguages: SUPPORTED_LANGUAGES,
      languageLabels: LANGUAGE_LABELS,
      languageFlags: LANGUAGE_FLAGS,
      t: t as (key: string, options?: Record<string, unknown>) => string,
    }),
    [language, setLanguage, t]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * Hook to access language context
 */
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

/**
 * Convenience hook for date formatting with current locale
 */
export function useDateLocale() {
  const { dateLocale } = useLanguage();
  return dateLocale;
}

/**
 * Convenience hook for number formatting locale
 */
export function useNumberLocale() {
  const { numberLocale } = useLanguage();
  return numberLocale;
}

export default LanguageContext;
