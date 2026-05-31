import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useEffect, useState, useRef } from 'react'
import { View, ActivityIndicator, Linking } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase, handleAuthDeepLink } from '../lib/supabase'
import { colors, fonts } from '../theme'
import { DrawerContext } from './DrawerContext'
import DrawerMenu from './DrawerMenu'

import LoginScreen               from '../screens/LoginScreen'
import OnboardingScreen          from '../screens/OnboardingScreen'
import ResetPasswordScreen       from '../screens/ResetPasswordScreen'
import DashboardScreen           from '../screens/DashboardScreen'
import FleetScreen               from '../screens/FleetScreen'
import FleetDetailScreen         from '../screens/FleetDetailScreen'
import FleetFormScreen           from '../screens/FleetFormScreen'
import ContractsScreen           from '../screens/ContractsScreen'
import ContractDetailScreen      from '../screens/ContractDetailScreen'
import ClientsScreen             from '../screens/ClientsScreen'
import ClientDetailScreen        from '../screens/ClientDetailScreen'
import NewRentalScreen           from '../screens/rental/NewRentalScreen'
import RestitutionPickerScreen   from '../screens/restitution/RestitutionPickerScreen'
import RestitutionWizardScreen   from '../screens/restitution/RestitutionWizardScreen'
import LeadsScreen               from '../screens/LeadsScreen'
import LeadDetailScreen          from '../screens/LeadDetailScreen'
import InvoicesScreen            from '../screens/InvoicesScreen'
import InvoiceDetailScreen       from '../screens/InvoiceDetailScreen'
import SettingsScreen            from '../screens/SettingsScreen'
import AgencyScreen              from '../screens/settings/AgencyScreen'
import TeamScreen                from '../screens/settings/TeamScreen'
import GmailScreen               from '../screens/settings/GmailScreen'
import WhatsappScreen            from '../screens/settings/WhatsappScreen'
import FleetConfigScreen         from '../screens/settings/FleetConfigScreen'
import TelematicsScreen          from '../screens/settings/TelematicsScreen'
import PrivacyScreen             from '../screens/settings/PrivacyScreen'
import AboutScreen               from '../screens/settings/AboutScreen'
import NetworkSearchScreen       from '../screens/NetworkSearchScreen'
import NetworkOutgoingScreen     from '../screens/NetworkOutgoingScreen'
import NetworkIncomingScreen     from '../screens/NetworkIncomingScreen'
import AccountingScreen          from '../screens/AccountingScreen'
import BilanScreen               from '../screens/accounting/BilanScreen'
import DepositsScreen            from '../screens/accounting/DepositsScreen'
import ReservationsScreen        from '../screens/ReservationsScreen'
import ReservationDetailScreen   from '../screens/ReservationDetailScreen'
import CalendarScreen            from '../screens/CalendarScreen'

const Stack = createNativeStackNavigator()
const Tab   = createBottomTabNavigator()

// Exposed so out-of-tree code (notification handlers, deep links) can
// navigate without grabbing context. Safe to call before the ref attaches:
// the helper below short-circuits when isReady() is false.
export const navigationRef = createNavigationContainerRef()

export function routeFromPushData(data) {
  if (!navigationRef.isReady() || !data) return
  if (data.type === 'lead' && data.id) {
    navigationRef.navigate('LeadDetail', { leadId: data.id })
  } else if (data.type === 'contract_signed' && data.id) {
    navigationRef.navigate('ContractDetail', { contractId: data.id })
  } else if (data.type === 'network_request_incoming') {
    navigationRef.navigate('NetworkIncoming')
  } else if (data.type === 'network_request_status') {
    navigationRef.navigate('NetworkOutgoing')
  }
}

function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{
      headerShown: false,
      // Tab bar is hidden — navigation is handled by the hamburger drawer
      tabBarStyle:  { display: 'none' },
      tabBarButton: () => null,
    }}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Tableau de bord' }} />
      <Tab.Screen name="Leads"     component={LeadsScreen}     options={{ title: 'Demandes' }} />
      <Tab.Screen name="Fleet"     component={FleetScreen}     options={{ title: 'Parc' }} />
      <Tab.Screen name="Contracts" component={ContractsScreen} options={{ title: 'Contrats' }} />
      <Tab.Screen name="Clients"   component={ClientsScreen}   options={{ title: 'Clients' }} />
      <Tab.Screen name="Settings"  component={SettingsScreen}  options={{ title: 'Réglages' }} />
    </Tab.Navigator>
  )
}

const TAB_ROUTES = ['Dashboard', 'Leads', 'Fleet', 'Contracts', 'Clients', 'Settings']

// Returns the deepest focused route name from a navigation state tree.
function getFocusedRouteName(state) {
  if (!state) return null
  const route = state.routes[state.index]
  if (route?.state) return getFocusedRouteName(route.state)
  return route?.name || null
}

export default function Navigation() {
  const [session,         setSession]         = useState(null)
  const [loading,         setLoading]         = useState(true)
  const [agencyId,        setAgencyId]        = useState(undefined)
  const [passwordRecovery, setPasswordRecovery] = useState(false)
  const [drawerOpen,      setDrawerOpen]      = useState(false)
  const [activeTab,       setActiveTab]       = useState('Dashboard')

  const checkAgency = async (s) => {
    if (!s) { setAgencyId(null); setLoading(false); return }
    try {
      const { data } = await supabase
        .from('profiles')
        .select('agency_id')
        .eq('id', s.user.id)
        .single()
      setAgencyId(data?.agency_id ?? null)
    } catch {
      setAgencyId(null)
    }
    setLoading(false)
  }

  useEffect(() => {
    // Handle deep link if app was opened cold from a link
    Linking.getInitialURL().then(url => {
      console.log('[deeplink] initial URL:', url)
      if (url) handleAuthDeepLink(url)
    })
    // Handle deep link while app is already running
    const linkSub = Linking.addEventListener('url', ({ url }) => {
      console.log('[deeplink] event URL:', url)
      handleAuthDeepLink(url)
    })

    const timeout = setTimeout(() => setLoading(false), 5000)
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      clearTimeout(timeout)
      setSession(s)
      checkAgency(s)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true)
        setLoading(false)
        return
      }
      setPasswordRecovery(false)
      setLoading(true)
      checkAgency(s)
    })
    return () => { subscription.unsubscribe(); clearTimeout(timeout); linkSub.remove() }
  }, [])

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: colors.canvas, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={colors.ink} />
    </View>
  )

  const openMenu = () => setDrawerOpen(true)
  const closeMenu = () => setDrawerOpen(false)

  const handleNavigate = (route) => {
    setActiveTab(route)
    closeMenu()
    if (TAB_ROUTES.includes(route)) {
      navigationRef.current?.navigate('Main', { screen: route })
    } else {
      navigationRef.current?.navigate(route)
    }
  }

  const handleStateChange = (state) => {
    const name = getFocusedRouteName(state)
    if (name) setActiveTab(name)
  }

  const showDrawer = !!session && !!agencyId && !passwordRecovery

  return (
    <NavigationContainer ref={navigationRef} onStateChange={handleStateChange}>
      <DrawerContext.Provider value={{ openMenu }}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {passwordRecovery ? (
            <Stack.Screen name="ResetPassword">
              {() => <ResetPasswordScreen onDone={() => setPasswordRecovery(false)} />}
            </Stack.Screen>
          ) : !session ? (
            <Stack.Screen name="Login" component={LoginScreen} />
          ) : !agencyId ? (
            <Stack.Screen name="Onboarding">
              {() => <OnboardingScreen user={session.user} onComplete={() => checkAgency(session)} />}
            </Stack.Screen>
          ) : (
            <>
              <Stack.Screen name="Main"               component={MainTabs} />
              <Stack.Screen name="ContractDetail"     component={ContractDetailScreen}    options={{ headerShown: false }} />
              <Stack.Screen name="ClientDetail"       component={ClientDetailScreen}      options={{ headerShown: false }} />
              <Stack.Screen name="FleetDetail"        component={FleetDetailScreen}       options={{ headerShown: false }} />
              <Stack.Screen name="FleetForm"          component={FleetFormScreen}         options={{ headerShown: false, presentation: 'modal' }} />
              <Stack.Screen name="NewRental"          component={NewRentalScreen}         options={{ headerShown: false, presentation: 'modal' }} />
              <Stack.Screen name="RestitutionPicker"  component={RestitutionPickerScreen} options={{ headerShown: false, presentation: 'modal' }} />
              <Stack.Screen name="RestitutionWizard"  component={RestitutionWizardScreen} options={{ headerShown: false, presentation: 'modal' }} />
              <Stack.Screen name="LeadDetail"         component={LeadDetailScreen}        options={{ headerShown: false }} />
              <Stack.Screen name="Invoices"           component={InvoicesScreen}          options={{ headerShown: false }} />
              <Stack.Screen name="InvoiceDetail"      component={InvoiceDetailScreen}     options={{ headerShown: false }} />
              <Stack.Screen name="SettingsAgency"     component={AgencyScreen}            options={{ headerShown: false }} />
              <Stack.Screen name="SettingsTeam"       component={TeamScreen}              options={{ headerShown: false }} />
              <Stack.Screen name="SettingsGmail"      component={GmailScreen}             options={{ headerShown: false }} />
              <Stack.Screen name="SettingsWhatsapp"   component={WhatsappScreen}          options={{ headerShown: false }} />
              <Stack.Screen name="SettingsFleetConfig" component={FleetConfigScreen}      options={{ headerShown: false }} />
              <Stack.Screen name="SettingsTelematics" component={TelematicsScreen}        options={{ headerShown: false }} />
              <Stack.Screen name="SettingsPrivacy"    component={PrivacyScreen}           options={{ headerShown: false }} />
              <Stack.Screen name="SettingsAbout"      component={AboutScreen}             options={{ headerShown: false }} />
              <Stack.Screen name="NetworkSearch"      component={NetworkSearchScreen}     options={{ headerShown: false }} />
              <Stack.Screen name="NetworkOutgoing"    component={NetworkOutgoingScreen}   options={{ headerShown: false }} />
              <Stack.Screen name="NetworkIncoming"    component={NetworkIncomingScreen}   options={{ headerShown: false }} />
              <Stack.Screen name="Accounting"         component={AccountingScreen}        options={{ headerShown: false }} />
              <Stack.Screen name="Bilan"              component={BilanScreen}             options={{ headerShown: false }} />
              <Stack.Screen name="Deposits"           component={DepositsScreen}          options={{ headerShown: false }} />
              <Stack.Screen name="Reservations"       component={ReservationsScreen}      options={{ headerShown: false }} />
              <Stack.Screen name="ReservationDetail"  component={ReservationDetailScreen} options={{ headerShown: false }} />
              <Stack.Screen name="Calendar"           component={CalendarScreen}          options={{ headerShown: false }} />
            </>
          )}
        </Stack.Navigator>
        {showDrawer && (
          <DrawerMenu
            visible={drawerOpen}
            onClose={closeMenu}
            onNavigate={handleNavigate}
            activeTab={activeTab}
          />
        )}
      </DrawerContext.Provider>
    </NavigationContainer>
  )
}
