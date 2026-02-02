import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Import English translations - use type assertions for JSON files
import enCommon from './locales/en/common.json'
import enAuth from './locales/en/auth.json'
import enPets from './locales/en/pets.json'
import enSettings from './locales/en/settings.json'
import enValidation from './locales/en/validation.json'
import enHelper from './locales/en/helper.json'
import enPlacement from './locales/en/placement.json'

// Import Russian translations - use type assertions for JSON files
import ruCommon from './locales/ru/common.json'
import ruAuth from './locales/ru/auth.json'
import ruPets from './locales/ru/pets.json'
import ruSettings from './locales/ru/settings.json'
import ruValidation from './locales/ru/validation.json'
import ruHelper from './locales/ru/helper.json'
import ruPlacement from './locales/ru/placement.json'

// Import Vietnamese translations - use type assertions for JSON files
import viCommon from './locales/vi/common.json'
import viAuth from './locales/vi/auth.json'
import viPets from './locales/vi/pets.json'
import viSettings from './locales/vi/settings.json'
import viValidation from './locales/vi/validation.json'
import viHelper from './locales/vi/helper.json'
import viPlacement from './locales/vi/placement.json'

export const supportedLocales = ['en', 'ru', 'vi'] as const
export type SupportedLocale = (typeof supportedLocales)[number]

export const localeNames: Record<SupportedLocale, string> = {
  en: 'English',
  ru: 'Русский',
  vi: 'Tiếng Việt',
}

const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test'

// Build i18n instance conditionally
const i18nInstance = i18n

// Only use LanguageDetector in non-test environments
if (!isTest) {
  i18nInstance.use(LanguageDetector)
}

// Force reload after adding translations
void i18nInstance.use(initReactI18next).init({
  resources: {
    en: {
      common: enCommon,
      auth: enAuth,
      pets: enPets,
      settings: enSettings,
      validation: enValidation,
      helper: enHelper,
      placement: enPlacement,
    },
    ru: {
      common: ruCommon,
      auth: ruAuth,
      pets: ruPets,
      settings: ruSettings,
      validation: ruValidation,
      helper: ruHelper,
      placement: ruPlacement,
    },
    vi: {
      common: viCommon,
      auth: viAuth,
      pets: viPets,
      settings: viSettings,
      validation: viValidation,
      helper: viHelper,
      placement: viPlacement,
    },
  },
  lng: isTest ? 'en' : undefined, // Force English in tests, auto-detect otherwise
  fallbackLng: 'en',
  supportedLngs: supportedLocales,
  defaultNS: 'common',
  ns: ['common', 'auth', 'pets', 'settings', 'validation', 'helper', 'placement'],
  interpolation: {
    escapeValue: false,
  },
  // Only configure detection in non-test environments
  ...(isTest
    ? {}
    : {
        detection: {
          order: ['localStorage', 'navigator'],
          caches: ['localStorage'],
          lookupLocalStorage: 'i18nextLng',
        },
      }),
})

export default i18n
