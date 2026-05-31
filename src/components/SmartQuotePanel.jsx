import { useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, FlatList, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors, radius, spacing, fonts } from '../theme'
import { getAvailableVehicles, sendQuoteOfferWhatsapp, sendQuoteOfferEmail } from '../lib/db'

// Light wrapper around a list-picker modal — keeps the panel self-contained
// instead of pulling in a third-party Select.
function VehiclePicker({ vehicles, value, placeholder, onChange }) {
  const [open, setOpen] = useState(false)
  const selected = vehicles.find(v => v.id === value)
  const label = selected
    ? `${selected.make || ''} ${selected.model || ''}`.trim() + (selected.plate ? ` (${selected.plate})` : '')
    : placeholder

  return (
    <>
      <TouchableOpacity style={s.input} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text style={[s.inputText, !selected && s.inputPlaceholder]} numberOfLines={1}>{label}</Text>
      </TouchableOpacity>
      <Modal visible={open} animationType="fade" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={s.modalBackdrop} onPress={() => setOpen(false)}>
          <Pressable style={s.modalSheet} onPress={(e) => e.stopPropagation()}>
            <FlatList
              data={vehicles}
              keyExtractor={(v) => v.id}
              ListEmptyComponent={<Text style={s.modalEmpty}>—</Text>}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={s.modalItem}
                  onPress={() => { onChange(item.id); setOpen(false) }}
                >
                  <Text style={s.modalItemText}>
                    {`${item.make || ''} ${item.model || ''}`.trim()}{item.plate ? ` (${item.plate})` : ''}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

export default function SmartQuotePanel({ lead, onSent }) {
  const { t } = useTranslation('leads')
  const isEmail = lead.source === 'gmail'

  const ex = lead.extracted_data || {}
  const [vehicles, setVehicles]   = useState([])
  const [vehicleId, setVehicleId] = useState('')
  const [price, setPrice]         = useState('')
  const [startDate, setStartDate] = useState(ex.start_date || ex.rentalIntent?.startDate || '')
  const [endDate, setEndDate]     = useState(ex.end_date || ex.rentalIntent?.endDate || '')
  const [notes, setNotes]         = useState('')
  const [sending, setSending]     = useState(false)
  const [error, setError]         = useState(null)
  const [done, setDone]           = useState(lead.status === 'offer_sent')

  useEffect(() => {
    getAvailableVehicles(startDate || null, endDate || null)
      .then(data => setVehicles(data || []))
      .catch(() => setVehicles([]))
  }, [startDate, endDate])

  const canSend = vehicleId && price && startDate && endDate && !sending

  async function handleSend() {
    if (!canSend) return
    setSending(true)
    setError(null)
    try {
      const payload = {
        leadId: lead.id,
        vehicleId,
        priceTotal: parseFloat(price),
        startDate,
        endDate,
        notes: notes.trim() || undefined,
      }
      if (isEmail) await sendQuoteOfferEmail(payload)
      else         await sendQuoteOfferWhatsapp(payload)
      setDone(true)
      onSent?.()
    } catch (e) {
      setError(e?.message || 'Erreur')
    } finally {
      setSending(false)
    }
  }

  if (done) {
    const channel = isEmail ? 'Email' : 'WhatsApp'
    return (
      <View style={[s.panel, s.doneCard]}>
        <Text style={s.doneText}>{t('quote.done', { channel })}</Text>
        {lead.offered_price_total ? (
          <Text style={s.donePrice}>({lead.offered_price_total} MAD)</Text>
        ) : null}
      </View>
    )
  }

  return (
    <View style={s.panel}>
      <Text style={s.panelTitle}>{t('quote.title')}</Text>

      <Text style={s.label}>{t('quote.vehicle')}</Text>
      <VehiclePicker
        vehicles={vehicles}
        value={vehicleId}
        placeholder={t('quote.chooseVehicle')}
        onChange={setVehicleId}
      />
      {vehicles.length === 0 && (
        <Text style={s.warn}>{t('quote.noVehicles')}</Text>
      )}

      <View style={s.row}>
        <View style={s.col}>
          <Text style={s.label}>{t('quote.startDate')}</Text>
          <TextInput
            value={startDate}
            onChangeText={setStartDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.dustTaupe}
            autoCapitalize="none"
            autoCorrect={false}
            style={s.input}
          />
        </View>
        <View style={s.col}>
          <Text style={s.label}>{t('quote.endDate')}</Text>
          <TextInput
            value={endDate}
            onChangeText={setEndDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.dustTaupe}
            autoCapitalize="none"
            autoCorrect={false}
            style={s.input}
          />
        </View>
      </View>

      <Text style={s.label}>{t('quote.price')}</Text>
      <TextInput
        value={price}
        onChangeText={setPrice}
        placeholder={t('quote.pricePlaceholder')}
        placeholderTextColor={colors.dustTaupe}
        keyboardType="numeric"
        style={s.input}
      />

      <Text style={s.label}>{t('quote.notes')}</Text>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder={t('quote.notesPlaceholder')}
        placeholderTextColor={colors.dustTaupe}
        multiline
        numberOfLines={3}
        style={[s.input, s.textarea]}
      />

      {error ? <Text style={s.errorText}>{error}</Text> : null}

      <TouchableOpacity
        onPress={handleSend}
        disabled={!canSend}
        activeOpacity={0.85}
        style={[s.sendBtn, !canSend && s.sendBtnDisabled]}
      >
        <Text style={[s.sendBtnText, !canSend && s.sendBtnTextDisabled]}>
          {sending ? t('quote.sending') : (isEmail ? t('quote.sendEmail') : t('quote.sendWhatsapp'))}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

const s = StyleSheet.create({
  panel: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: '#EEF0FF',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.25)',
  },
  panelTitle: { fontFamily: fonts.bold, color: '#4F46E5', fontSize: 12, letterSpacing: 0.5, marginBottom: 12, textTransform: 'uppercase' },
  label: { fontFamily: fonts.regular, fontSize: 11, color: colors.slate, marginBottom: 4, marginTop: 8 },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.ink,
  },
  inputText: { fontFamily: fonts.regular, fontSize: 14, color: colors.ink },
  inputPlaceholder: { color: colors.dustTaupe },
  textarea: { minHeight: 70, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 8 },
  col: { flex: 1 },
  warn: { color: colors.signal, fontSize: 11, marginTop: 4, fontFamily: fonts.regular },
  errorText: { color: colors.danger, fontSize: 12, marginTop: 8, fontFamily: fonts.regular },

  sendBtn: {
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: radius.button,
    backgroundColor: colors.success,
    alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: colors.dustTaupe },
  sendBtnText: { color: colors.white, fontFamily: fonts.bold, fontSize: 14 },
  sendBtnTextDisabled: { color: colors.slate },

  doneCard: {
    backgroundColor: '#E8F7EE',
    borderColor: 'rgba(30,127,58,0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  doneText:  { color: colors.success, fontFamily: fonts.medium, fontSize: 13, flexShrink: 1 },
  donePrice: { color: colors.slate, fontFamily: fonts.regular, fontSize: 12 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet:    { backgroundColor: colors.canvas, borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card, maxHeight: '70%', paddingVertical: spacing.sm },
  modalItem:     { paddingHorizontal: spacing.lg, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalItemText: { fontFamily: fonts.regular, fontSize: 14, color: colors.ink },
  modalEmpty:    { textAlign: 'center', color: colors.slate, padding: spacing.lg, fontFamily: fonts.regular },
})
