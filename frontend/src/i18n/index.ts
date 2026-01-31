import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Import English translations - use type assertions for JSON files
import enCommon from './locales/en/common.json'
import enAuth from './locales/en/auth.json'
import enPets from './locales/en/pets.json'
import enSettings from './locales/en/settings.json'
import enValidation from './locales/en/validation.json'

// Import Russian translations - use type assertions for JSON files
import ruCommon from './locales/ru/common.json'
import ruAuth from './locales/ru/auth.json'
import ruPets from './locales/ru/pets.json'
import ruSettings from './locales/ru/settings.json'
import ruValidation from './locales/ru/validation.json'

export const supportedLocales = ['en', 'ru'] as const
export type SupportedLocale = (typeof supportedLocales)[number]

export const localeNames: Record<SupportedLocale, string> = {
  en: 'English',
  ru: 'Русский',
}

const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test'

// Build i18n instance conditionally
const i18nInstance = i18n

// Only use LanguageDetector in non-test environments
if (!isTest) {
  i18nInstance.use(LanguageDetector)
}

i18nInstance.use(initReactI18next).init({
  resources: {
    en: {
      common: enCommon,
      auth: enAuth,
      pets: enPets,
      settings: enSettings,
      validation: enValidation,
    },
    ru: {
      common: ruCommon,
      auth: ruAuth,
      pets: ruPets,
      settings: ruSettings,
      validation: ruValidation,
    },
  },
  lng: isTest ? 'en' : undefined, // Force English in tests, auto-detect otherwise
  fallbackLng: 'en',
  supportedLngs: supportedLocales,
  defaultNS: 'common',
  ns: ['common', 'auth', 'pets', 'settings', 'validation'],
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
