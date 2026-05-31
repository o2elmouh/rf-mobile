import { useMemo, useState } from 'react'
import {
  Modal, View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Pressable,
} from 'react-native'
import { colors, radius, spacing, typography } from '../theme'

// Reusable modal picker: searchable list of strings.
// Usage:
//   <ListPickerField label="Marque" value={form.brand} onChange={v => set('brand', v)}
//                    options={MAKES} placeholder="— Choisir —" disabled={false} />
export function ListPickerField({ label, value, options, onChange, placeholder = '— Choisir —', searchable = true, disabled = false }) {
  const [open, setOpen] = useState(false)
  return (
    <View>
      {label != null && <Text style={s.fieldLabel}>{label}</Text>}
      <TouchableOpacity
        style={[s.trigger, disabled && { opacity: 0.5 }]}
        onPress={() => !disabled && setOpen(true)}
        activeOpacity={0.7}
        disabled={disabled}
      >
        <Text style={{ color: value ? colors.textPrimary : colors.textMuted, fontSize: 15 }}>
          {value || placeholder}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 14 }}>▾</Text>
      </TouchableOpacity>
      <ListPickerModal
        visible={open}
        title={label}
        value={value}
        options={options}
        searchable={searchable}
        onClose={() => setOpen(false)}
        onSelect={v => { onChange(v); setOpen(false) }}
      />
    </View>
  )
}

export function ListPickerModal({ visible, title, value, options, searchable, onClose, onSelect }) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter(o => String(o).toLowerCase().includes(q))
  }, [options, query])

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet} onPress={e => e.stopPropagation()}>
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>{title || 'Choisir'}</Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Text style={{ color: colors.textSecondary, fontSize: 22, lineHeight: 24 }}>×</Text>
            </TouchableOpacity>
          </View>
          {searchable && (
            <TextInput
              style={s.search}
              placeholder="Rechercher…"
              placeholderTextColor={colors.textMuted}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              autoCapitalize="none"
            />
          )}
          <FlatList
            data={filtered}
            keyExtractor={(item, i) => String(item) + i}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const active = item === value
              return (
                <TouchableOpacity
                  style={[s.row, active && { backgroundColor: colors.goldMuted }]}
                  onPress={() => onSelect(item)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.rowText, active && { color: colors.gold, fontWeight: '700' }]}>
                    {String(item)}
                  </Text>
                </TouchableOpacity>
              )
            }}
            ListEmptyComponent={<Text style={s.empty}>Aucun résultat</Text>}
          />
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const s = StyleSheet.create({
  fieldLabel: { color: colors.textSecondary, fontSize: 12, marginBottom: 6, marginTop: 4 },
  trigger: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingBottom: spacing.lg,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  sheetTitle: { ...typography.cardTitle, fontWeight: '700' },
  closeBtn:   { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },

  search: {
    margin: spacing.md,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },

  row:     { paddingHorizontal: spacing.md, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowText: { color: colors.textPrimary, fontSize: 15 },
  empty:   { color: colors.textMuted, textAlign: 'center', padding: spacing.lg },
})
