import { useEffect, useRef, useState } from 'react'
import {
  Modal, View, Text, TouchableOpacity,
  Animated, StyleSheet, Pressable, ScrollView,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  LayoutDashboard, MessageSquare, Car,
  FileText, Users, Settings, LogOut, X,
  CalendarCheck, Calendar, Receipt, Coins, Network,
  ChevronDown, ChevronRight,
} from 'lucide-react-native'
import { colors, fonts, spacing, radius } from '../theme'
import { supabase } from '../lib/supabase'
import { useRole } from '../lib/useRole'

const DRAWER_WIDTH = 270

const NAV_ITEMS = [
  { tab: 'Dashboard',    label: 'Tableau de bord', Icon: LayoutDashboard },
  { tab: 'Leads',        label: 'Demandes',         Icon: MessageSquare   },
  { tab: 'Fleet',        label: 'Parc auto',        Icon: Car             },
  { tab: 'Contracts',    label: 'Contrats',         Icon: FileText        },
  { tab: 'Clients',      label: 'Clients',          Icon: Users           },
  { tab: 'Reservations', label: 'Réservations',     Icon: CalendarCheck   },
  { tab: 'Calendar',     label: 'Calendrier',       Icon: Calendar        },
  { tab: 'Invoices',     label: 'Factures',         Icon: Receipt         },
  { tab: 'Accounting',   label: 'Comptabilité',     Icon: Coins,          admin: true },
  {
    group: 'network', label: 'Réseau', Icon: Network, admin: true,
    children: [
      { tab: 'NetworkSearch',   label: 'Recherche' },
      { tab: 'NetworkOutgoing', label: 'Mes demandes' },
      { tab: 'NetworkIncoming', label: 'Demandes reçues' },
    ],
  },
  { tab: 'Settings',     label: 'Réglages',         Icon: Settings        },
]

export default function DrawerMenu({ visible, onClose, onNavigate, activeTab }) {
  const insets  = useSafeAreaInsets()
  const slideX  = useRef(new Animated.Value(-DRAWER_WIDTH)).current
  const opacity = useRef(new Animated.Value(0)).current
  const { isAdmin } = useRole()
  const [expanded, setExpanded] = useState({})

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideX, {
        toValue:         visible ? 0 : -DRAWER_WIDTH,
        useNativeDriver: true,
        damping:         22,
        stiffness:       220,
        mass:            0.9,
      }),
      Animated.timing(opacity, {
        toValue:         visible ? 1 : 0,
        duration:        visible ? 180 : 140,
        useNativeDriver: true,
      }),
    ]).start()
  }, [visible])

  const handleLogout = () => {
    onClose()
    supabase.auth.signOut()
  }

  const toggleGroup = (key) => setExpanded(p => ({ ...p, [key]: !p[key] }))

  const items = NAV_ITEMS.filter(it => !it.admin || isAdmin)

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Animated.View style={[s.backdrop, { opacity }]} pointerEvents="box-none">
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Drawer panel */}
      <Animated.View
        style={[
          s.drawer,
          {
            transform:    [{ translateX: slideX }],
            paddingTop:   insets.top   + spacing.lg,
            paddingBottom: insets.bottom + spacing.lg,
          },
        ]}
      >
        {/* Brand header */}
        <View style={s.drawerHeader}>
          <Text style={s.brand}>RentaFlow</Text>
          <TouchableOpacity onPress={onClose} style={s.closeBtn} activeOpacity={0.7}>
            <X size={18} color={colors.ink} strokeWidth={1.5} />
          </TouchableOpacity>
        </View>

        {/* Nav items */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.navList} showsVerticalScrollIndicator={false}>
          {items.map((item) => {
            if (item.group) {
              const open = !!expanded[item.group]
              const Icon = item.Icon
              const Chevron = open ? ChevronDown : ChevronRight
              return (
                <View key={item.group}>
                  <TouchableOpacity
                    style={s.navItem}
                    onPress={() => toggleGroup(item.group)}
                    activeOpacity={0.72}
                  >
                    <Icon size={20} color={colors.slate} strokeWidth={1.5} />
                    <Text style={[s.navLabel, { flex: 1 }]}>{item.label}</Text>
                    <Chevron size={16} color={colors.slate} strokeWidth={1.5} />
                  </TouchableOpacity>
                  {open && item.children.map(child => {
                    const active = activeTab === child.tab
                    return (
                      <TouchableOpacity
                        key={child.tab}
                        style={[s.navItem, s.subItem, active && s.navItemActive]}
                        onPress={() => onNavigate(child.tab)}
                        activeOpacity={0.72}
                      >
                        <View style={s.subDot} />
                        <Text style={[s.navLabel, active && s.navLabelActive]}>{child.label}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              )
            }
            const Icon = item.Icon
            const active = activeTab === item.tab
            return (
              <TouchableOpacity
                key={item.tab}
                style={[s.navItem, active && s.navItemActive]}
                onPress={() => onNavigate(item.tab)}
                activeOpacity={0.72}
              >
                <Icon
                  size={20}
                  color={active ? colors.ink : colors.slate}
                  strokeWidth={active ? 2 : 1.5}
                />
                <Text style={[s.navLabel, active && s.navLabelActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {/* Logout */}
        <TouchableOpacity style={s.logoutRow} onPress={handleLogout} activeOpacity={0.7}>
          <LogOut size={18} color={colors.slate} strokeWidth={1.5} />
          <Text style={s.logoutLabel}>Se déconnecter</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  )
}

const s = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20, 20, 19, 0.45)',
  },
  drawer: {
    position:         'absolute',
    left:             0,
    top:              0,
    bottom:           0,
    width:            DRAWER_WIDTH,
    backgroundColor:  colors.canvas,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingHorizontal: spacing.lg,
  },

  drawerHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   spacing.xl,
  },
  brand: {
    fontFamily:    fonts.bold,
    fontSize:      20,
    color:         colors.ink,
    letterSpacing: -0.4,
  },
  closeBtn: {
    width:           34,
    height:          34,
    borderRadius:    radius.pill,
    backgroundColor: colors.white,
    borderWidth:     1,
    borderColor:     colors.border,
    justifyContent:  'center',
    alignItems:      'center',
  },

  navList: { gap: 2, paddingBottom: spacing.md },

  navItem: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            spacing.md,
    paddingVertical: 11,
    paddingHorizontal: spacing.md,
    borderRadius:   radius.button,
  },
  navItemActive: {
    backgroundColor: colors.white,
    borderWidth:     1,
    borderColor:     colors.border,
  },
  subItem: {
    paddingLeft: spacing.md + 28,
    paddingVertical: 9,
  },
  subDot: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: colors.dustTaupe,
  },
  navLabel: {
    fontFamily:    fonts.regular,
    fontSize:      16,
    color:         colors.slate,
    letterSpacing: -0.2,
  },
  navLabelActive: {
    fontFamily: fonts.medium,
    color:      colors.ink,
  },

  logoutRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
  },
  logoutLabel: {
    fontFamily: fonts.regular,
    fontSize:   15,
    color:      colors.slate,
  },
})
