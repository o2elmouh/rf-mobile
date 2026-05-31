import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { AR_LETTERS, parsePlate, buildPlate } from '../lib/plate'
import { ListPickerModal } from './ListPicker'
import { colors, radius } from '../theme'

// Mobile port of the web app's PlateInput. Stored as `serial|letter|region`.
// Displayed RTL as `region letter serial` (Moroccan plate convention).
export default function PlateInput({ value, onChange }) {
  const { serial, letter, region } = parsePlate(value)
  const [letterOpen, setLetterOpen] = useState(false)

  const set = (s, l, r) => onChange(buildPlate(s, l, r))

  return (
    <View>
      <View style={st.row}>
        <TextInput
          style={[st.input, { width: 95, textAlign: 'center', letterSpacing: 2 }]}
          placeholder="12345"
          placeholderTextColor={colors.textMuted}
          maxLength={5}
          keyboardType="number-pad"
          value={serial}
          onChangeText={t => set(t.replace(/\D/g, ''), letter, region)}
        />
        <Text style={st.sep}>|</Text>
        <TouchableOpacity style={[st.input, st.letterBox]} onPress={() => setLetterOpen(true)} activeOpacity={0.7}>
          <Text style={st.letterText}>{letter}</Text>
        </TouchableOpacity>
        <Text style={st.sep}>|</Text>
        <TextInput
          style={[st.input, { width: 65, textAlign: 'center', letterSpacing: 2 }]}
          placeholder="01"
          placeholderTextColor={colors.textMuted}
          maxLength={2}
          keyboardType="number-pad"
          value={region}
          onChangeText={t => set(serial, letter, t.replace(/\D/g, ''))}
        />
      </View>

      {serial ? (
        <View style={st.preview}>
          <Text style={st.previewText}>{region} {letter} {serial}</Text>
        </View>
      ) : null}

      <ListPickerModal
        visible={letterOpen}
        title="Lettre arabe"
        value={letter}
        options={AR_LETTERS}
        searchable={false}
        onClose={() => setLetterOpen(false)}
        onSelect={(l) => { set(serial, l, region); setLetterOpen(false) }}
      />
    </View>
  )
}

const st = StyleSheet.create({
  row:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  input: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    paddingHorizontal: 10,
    paddingVertical: 12,
    fontSize: 16,
  },
  letterBox: {
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterText: { color: colors.textPrimary, fontSize: 20, textAlign: 'center' },
  sep:        { color: colors.textMuted, fontSize: 18, fontWeight: '700' },

  preview: {
    alignSelf: 'flex-start',
    backgroundColor: '#1c1a16',
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 8,
  },
  previewText: {
    color: '#fff',
    fontSize: 14,
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
    writingDirection: 'rtl',
  },
})
