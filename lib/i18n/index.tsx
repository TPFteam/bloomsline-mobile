import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getLocales } from 'expo-localization'
import en from './en'
import fr from './fr'

export type Locale = 'en' | 'fr'

type Translations = typeof en

const dictionaries: Record<Locale, Translations> = { en, fr: fr as unknown as Translations }

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: Translations
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

const LOCALE_KEY = 'bloomsline_locale'

function detectDeviceLocale(): Locale {
  try {
    const locales = getLocales()
    const lang = locales?.[0]?.languageCode || 'en'
    if (lang === 'fr') return 'fr'
    return 'en'
  } catch {
    return 'en'
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectDeviceLocale())
  const [loaded, setLoaded] = useState(false)

  // Load saved preference
  useEffect(() => {
    AsyncStorage.getItem(LOCALE_KEY).then((saved) => {
      if (saved === 'fr' || saved === 'en') {
        setLocaleState(saved)
      }
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [])

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    AsyncStorage.setItem(LOCALE_KEY, newLocale).catch(() => {})
  }

  const value: I18nContextType = {
    locale,
    setLocale,
    t: dictionaries[locale],
  }

  if (!loaded) return null

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider')
  }
  return context
}
