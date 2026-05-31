import { TouchableOpacity, StyleSheet } from 'react-native'
import { Menu } from 'lucide-react-native'
import { useDrawer } from '../navigation/DrawerContext'
import { colors, radius } from '../theme'

export default function HamburgerButton({ style, inline = false }) {
  const { openMenu } = useDrawer()
  return (
    <TouchableOpacity
      onPress={openMenu}
      style={[inline ? s.btnInline : s.btn, style]}
      activeOpacity={0.75}
      accessibilityLabel="Ouvrir le menu"
      hitSlop={8}
    >
      <Menu size={20} color={colors.ink} strokeWidth={1.5} />
    </TouchableOpacity>
  )
}

const base = {
  width:           40,
  height:          40,
  borderRadius:    radius.pill,
  backgroundColor: colors.white,
  borderWidth:     1,
  borderColor:     colors.borderStrong,
  justifyContent:  'center',
  alignItems:      'center',
}

const s = StyleSheet.create({
  btn: {
    ...base,
    position: 'absolute',
    top:      52,
    right:    16,
    zIndex:   10,
  },
  btnInline: base,
})
