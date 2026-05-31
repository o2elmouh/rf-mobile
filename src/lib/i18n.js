import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import * as Localization from 'expo-localization'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { I18nManager } from 'react-native'

import frCommon       from '../locales/fr/common.json'
import frAuth         from '../locales/fr/auth.json'
import frOnboarding   from '../locales/fr/onboarding.json'
import frDashboard    from '../locales/fr/dashboard.json'
import frFleet        from '../locales/fr/fleet.json'
import frClients      from '../locales/fr/clients.json'
import frContracts    from '../locales/fr/contracts.json'
import frInvoices     from '../locales/fr/invoices.json'
import frRental       from '../locales/fr/rental.json'
import frRestitution  from '../locales/fr/restitution.json'
import frReservations from '../locales/fr/reservations.json'
import frLeads        from '../locales/fr/leads.json'
import frSettings     from '../locales/fr/settings.json'

import arCommon       from '../locales/ar/common.json'
import arAuth         from '../locales/ar/auth.json'
import arOnboarding   from '../locales/ar/onboarding.json'
import arDashboard    from '../locales/ar/dashboard.json'
import arFleet        from '../locales/ar/fleet.json'
import arClients      from '../locales/ar/clients.json'
import arContracts    from '../locales/ar/contracts.json'
import arInvoices     from '../locales/ar/invoices.json'
import arRental       from '../locales/ar/rental.json'
import arRestitution  from '../locales/ar/restitution.json'
import arReservations from '../locales/ar/reservations.json'
import arLeads        from '../locales/ar/leads.json'
import arSettings     from '../locales/ar/settings.json'

import enCommon       from '../locales/en/common.json'
import enAuth         from '../locales/en/auth.json'
import enOnboarding   from '../locales/en/onboarding.json'
import enDashboard    from '../locales/en/dashboard.json'
import enFleet        from '../locales/en/fleet.json'
import enClients      from '../locales/en/clients.json'
import enContracts    from '../locales/en/contracts.json'
import enInvoices     from '../locales/en/invoices.json'
import enRental       from '../locales/en/rental.json'
import enRestitution  from '../locales/en/restitution.json'
import enReservations from '../locales/en/reservations.json'
import enLeads        from '../locales/en/leads.json'
import enSettings     from '../locales/en/settings.json'

const STORAGE_KEY = 'rentaflow.lang'
const SUPPORTED   = ['fr', 'ar', 'en']
const FALLBACK    = 'fr'

const resources = {
  fr: {
    common: frCommon, auth: frAuth, onboarding: frOnboarding, dashboard: frDashboard,
    fleet: frFleet, clients: frClients, contracts: frContracts, invoices: frInvoices,
    rental: frRental, restitution: frRestitution, reservations: frReservations,
    leads: frLeads, settings: frSettings,
  },
  ar: {
    common: arCommon, auth: arAuth, onboarding: arOnboarding, dashboard: arDashboard,
    fleet: arFleet, clients: arClients, contracts: arContracts, invoices: arInvoices,
    rental: arRental, restitution: arRestitution, reservations: arReservations,
    leads: arLeads, settings: arSettings,
  },
  en: {
    common: enCommon, auth: enAuth, onboarding: enOnboarding, dashboard: enDashboard,
    fleet: enFleet, clients: enClients, contracts: enContracts, invoices: enInvoices,
    rental: enRental, restitution: enRestitution, reservations: enReservations,
    leads: enLeads, settings: enSettings,
  },
}

function detectLanguage() {
  const locales = Localization.getLocales?.() || []
  const code = (locales[0]?.languageCode || FALLBACK).slice(0, 2)
  return SUPPORTED.includes(code) ? code : FALLBACK
}

export async function initI18n() {
  let saved = null
  try { saved = await AsyncStorage.getItem(STORAGE_KEY) } catch {}
  const lng = saved && SUPPORTED.includes(saved) ? saved : detectLanguage()

  await i18n.use(initReactI18next).init({
    resources,
    lng,
    fallbackLng: FALLBACK,
    supportedLngs: SUPPORTED,
    ns: ['common', 'auth', 'onboarding', 'dashboard', 'fleet', 'clients', 'contracts', 'invoices', 'rental', 'restitution', 'reservations', 'leads', 'settings'],
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    returnNull: false,
    compatibilityJSON: 'v4',
  })

  applyRtl(lng)
  return i18n
}

function applyRtl(lng) {
  const shouldBeRtl = lng === 'ar'
  if (I18nManager.isRTL !== shouldBeRtl) {
    try {
      I18nManager.allowRTL(shouldBeRtl)
      I18nManager.forceRTL(shouldBeRtl)
    } catch (e) {
      console.warn('[i18n] RTL toggle failed', e?.message)
    }
  }
}

export async function changeLanguage(code) {
  if (!SUPPORTED.includes(code)) return
  await i18n.changeLanguage(code)
  try { await AsyncStorage.setItem(STORAGE_KEY, code) } catch {}
  applyRtl(code)
}

export default i18n
