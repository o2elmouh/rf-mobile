import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

import LoginScreen     from '../screens/LoginScreen'
import DashboardScreen from '../screens/DashboardScreen'
import FleetScreen     from '../screens/FleetScreen'
import ContractsScreen from '../screens/ContractsScreen'
import ClientsScreen   from '../screens/ClientsScreen'

const Stack = createNativeStackNavigator()
const Tab   = createBottomTabNavigator()

function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarStyle: { backgroundColor: '#1a1a2e' }, tabBarActiveTintColor: '#e94560', tabBarInactiveTintColor: '#888' }}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Tableau de bord' }} />
      <Tab.Screen name="Fleet"     component={FleetScreen}     options={{ title: 'Parc' }} />
      <Tab.Screen name="Contracts" component={ContractsScreen} options={{ title: 'Contrats' }} />
      <Tab.Screen name="Clients"   component={ClientsScreen}   options={{ title: 'Clients' }} />
    </Tab.Navigator>
  )
}

export default function Navigation() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session); setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return null

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}
