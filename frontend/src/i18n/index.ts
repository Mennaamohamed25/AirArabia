import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en'
import ar from './ar'

const KEY = 'rt.lang'

function stored(): 'en' | 'ar' {
  try {
    return localStorage.getItem(KEY) === 'ar' ? 'ar' : 'en'
  } catch {
    return 'en'
  }
}

function applyDir(lang: string) {
  document.documentElement.lang = lang
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
}

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ar: { translation: ar } },
  lng: stored(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})
applyDir(i18n.language)

export function setLanguage(lang: 'en' | 'ar') {
  try {
    localStorage.setItem(KEY, lang)
  } catch {
    /* ignore */
  }
  applyDir(lang)
  void i18n.changeLanguage(lang)
}

export default i18n
