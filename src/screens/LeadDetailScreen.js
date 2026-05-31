import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { getLead, updateLeadStatus, updateLeadExtracted, getContractById } from '../lib/db'
import { formatPhone } from '../lib/phoneFormat'
import { colors, radius, spacing, fonts, typography } from '../theme'
import SourceBadge from '../components/SourceBadge'
import LeadStatusPill from '../components/LeadStatusPill'
import ConversationThread from '../components/ConversationThread'
import SmartQuotePanel from '../components/SmartQuotePanel'
import { buildRentalPrefill } from '../lib/leadToRental'

function ConfBadge({ score }) {
  if (score == null) return null
  const pct = Math.round(score * 100)
  const hue = score >= 0.85 ? colors.success : score >= 0.7 ? colors.signalSoft : colors.danger
  return (
    <View style={[fs.confPill, { backgroundColor: hue + '1A' }]}>
      <Text style={[fs.confText, { color: hue }]}>{pct}%</Text>
    </View>
  )
}

function Field({ label, value, confidence, onChange }) {
  const lowConf = confidence != null && confidence < 0.8
  return (
    <View style={fs.field}>
      <View style={fs.fieldHeader}>
        <Text style={fs.fieldLabel}>{label}</Text>
        <ConfBadge score={confidence} />
      </View>
      <TextInput
        value={value || ''}
        onChangeText={onChange}
        autoCorrect={false}
        autoCapitalize="none"
        placeholderTextColor={colors.dustTaupe}
        style={[fs.fieldInput, lowConf && fs.fieldInputLowConf]}
      />
    </View>
  )
}

const fs = StyleSheet.create({
  field:         { marginBottom: 12 },
  fieldHeader:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  fieldLabel:    { fontFamily: fonts.regular, fontSize: 11, color: colors.slate },
  fieldInput: {
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
  fieldInputLowConf: { borderColor: colors.signalSoft },
  confPill: { borderRadius: radius.pill, paddingHorizontal: 6, paddingVertical: 1 },
  confText: { fontFamily: fonts.bold, fontSize: 10 },
})

export default function LeadDetailScreen({ route, navigation }) {
  const { t } = useTranslation('leads')
  const { leadId } = route.params || {}

  const [lead, setLead]       = useState(null)
  const [extracted, setExtracted] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [saving, setSaving]   = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [status, setStatus]   = useState(null)
  const [linkedContract, setLinkedContract] = useState(null)
  const [pickedContractId, setPickedContractId] = useState('')

  async function load() {
    try {
      setError(null)
      const data = await getLead(leadId)
      setLead(data)
      setExtracted(data?.extracted_data || {})
      setStatus(data?.status)
      setPickedContractId(data?.prolongation_target_contract_id || '')
    } catch (e) {
      setError(e?.message || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [leadId])

  useEffect(() => {
    const targetId = lead?.prolongation_target_contract_id || pickedContractId
    if (!targetId) { setLinkedContract(null); return }
    let cancelled = false
    ;(async () => {
      try {
        const c = await getContractById(targetId)
        if (!cancelled) setLinkedContract(c)
      } catch (e) { /* swallow */ }
    })()
    return () => { cancelled = true }
  }, [lead?.prolongation_target_contract_id, pickedContractId])

  function handleChange(key, val) {
    setExtracted(prev => ({ ...prev, [key]: val }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateLeadExtracted(leadId, extracted)
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 1800)
    } catch (e) {
      Alert.alert('Erreur', e?.message || 'Sauvegarde impossible')
    } finally {
      setSaving(false)
    }
  }

  async function handleStatus(newStatus) {
    const previous = status
    setStatus(newStatus)
    try {
      await updateLeadStatus(leadId, newStatus)
    } catch (e) {
      setStatus(previous)
      Alert.alert('Erreur', e?.message || 'Changement de statut impossible')
    }
  }

  function handleConvert() {
    if (!lead) return
    const prefill = buildRentalPrefill(lead, extracted)
    updateLeadStatus(leadId, 'processed').catch(() => {})
    navigation.replace('NewRental', { prefill })
  }

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.loadingWrap}><ActivityIndicator color={colors.ink} /></View>
      </SafeAreaView>
    )
  }

  if (error || !lead) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.headerBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Text style={s.backText}>← {t('detail.summary', 'Retour')}</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.errorText}>{error || 'Lead introuvable'}</Text>
      </SafeAreaView>
    )
  }

  const conf = lead.confidence_scores || {}
  const title = (extracted.firstName || extracted.lastName)
    ? `${extracted.firstName || ''} ${extracted.lastName || ''}`.trim()
    : formatPhone(lead.sender_id)
  const summary = extracted.summary_for_agent || lead.summary_for_agent

  const isRouting   = !!extracted.classification
  const showQuote   = status === 'waiting' || status === 'offer_sent'
  const showAccept  = status === 'accepted'

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
          <SourceBadge source={lead.source} />
          <LeadStatusPill status={status} />
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={s.titleBlock}>
          <Text style={s.title}>{title || '—'}</Text>
          <Text style={s.subtitle}>{lead.sender_id}</Text>
          {lead.match_score ? (
            <Text style={s.matchWarn}>
              {t('detail.matchScore', { pct: Math.round(lead.match_score * 100) })}
            </Text>
          ) : null}
        </View>

        {summary ? (
          <View style={s.summaryCard}>
            <Text style={s.eyebrow}>{t('detail.summary')}</Text>
            <Text style={s.summaryText}>{summary}</Text>
          </View>
        ) : null}

        {/* Extracted data */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('detail.extracted')}</Text>
          {isRouting ? (
            <View>
              <Text style={s.classificationLine}>
                {t(`classification.${extracted.classification}`, extracted.classification)}
                {extracted.confidence != null ? `  ·  ${Math.round(extracted.confidence * 100)}%` : ''}
              </Text>
              {extracted.requested_car != null && (
                <Field label={t('fields.requestedCar')} value={extracted.requested_car} onChange={(v) => handleChange('requested_car', v)} />
              )}
              {extracted.start_date != null && (
                <Field label={t('fields.startDate')} value={extracted.start_date} onChange={(v) => handleChange('start_date', v)} />
              )}
              {extracted.end_date != null && (
                <Field label={t('fields.endDate')} value={extracted.end_date} onChange={(v) => handleChange('end_date', v)} />
              )}
              {extracted.pickup_location != null && (
                <Field label={t('fields.pickupLocation')} value={extracted.pickup_location} onChange={(v) => handleChange('pickup_location', v)} />
              )}
              {extracted.return_location != null && (
                <Field label={t('fields.returnLocation')} value={extracted.return_location} onChange={(v) => handleChange('return_location', v)} />
              )}
              {extracted.requested_extra_days != null && (
                <Field label={t('fields.requestedExtraDays')} value={String(extracted.requested_extra_days)} onChange={(v) => handleChange('requested_extra_days', v)} />
              )}
              {extracted.classification === 'prolongation' && (
                <View style={s.prolongCard}>
                  {linkedContract ? (
                    <Text style={s.prolongLine}>
                      {t('prolongationLinkedContract', {
                        defaultValue: 'Contrat {{number}} — fin {{end}} — {{client}}',
                        number: linkedContract.contract_number || '—',
                        end: linkedContract.return_date?.slice(0, 10) || '—',
                        client: linkedContract.client_name || '—',
                      })}
                    </Text>
                  ) : (extracted.prolongation_candidates?.length > 1) ? (
                    <View>
                      <Text style={s.prolongLabel}>{t('prolongationPickContract', { defaultValue: 'Quel contrat prolonger ?' })}</Text>
                      {extracted.prolongation_candidates.map((c, idx) => {
                        const id = typeof c === 'string' ? c : c.id
                        const label = typeof c === 'string'
                          ? id
                          : `${c.contract_number || id}${c.end_date ? ` — fin ${c.end_date}` : ''}`
                        const selected = pickedContractId === id
                        return (
                          <TouchableOpacity
                            key={id}
                            onPress={() => setPickedContractId(id)}
                            style={[s.prolongOption, selected && s.prolongOptionSelected]}
                            activeOpacity={0.7}
                          >
                            <Text style={[s.prolongOptionText, selected && s.prolongOptionTextSelected]}>{label}</Text>
                          </TouchableOpacity>
                        )
                      })}
                    </View>
                  ) : null}
                </View>
              )}
            </View>
          ) : (
            <View>
              <Field label={t('fields.firstName')}      value={extracted.firstName}      confidence={conf.firstName}      onChange={(v) => handleChange('firstName', v)} />
              <Field label={t('fields.lastName')}       value={extracted.lastName}       confidence={conf.lastName}       onChange={(v) => handleChange('lastName', v)} />
              <Field label={t('fields.documentNumber')} value={extracted.documentNumber} confidence={conf.documentNumber} onChange={(v) => handleChange('documentNumber', v)} />
              <Field label={t('fields.dateOfBirth')}    value={extracted.dateOfBirth}    confidence={conf.dateOfBirth}    onChange={(v) => handleChange('dateOfBirth', v)} />
              <Field label={t('fields.expiryDate')}     value={extracted.expiryDate}     confidence={conf.expiryDate}     onChange={(v) => handleChange('expiryDate', v)} />
              <Field label={t('fields.documentType')}   value={extracted.documentType}   onChange={(v) => handleChange('documentType', v)} />
              <Field label={t('fields.issuingCountry')} value={extracted.issuingCountry} onChange={(v) => handleChange('issuingCountry', v)} />
            </View>
          )}

          <TouchableOpacity onPress={handleSave} disabled={saving} style={s.saveBtn} activeOpacity={0.8}>
            <Text style={s.saveBtnText}>
              {saving ? t('detail.saving') : (savedFlash ? t('detail.saved') : t('detail.saveCorrections'))}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Smart quote */}
        {showQuote && (
          <View style={s.section}>
            <SmartQuotePanel lead={{ ...lead, status, extracted_data: extracted }} onSent={() => setStatus('offer_sent')} />
          </View>
        )}

        {/* Accepted banner */}
        {showAccept && (
          <View style={s.acceptedCard}>
            <Text style={s.acceptedText}>{t('detail.acceptedNote')}</Text>
            {lead.last_client_note ? (
              <Text style={s.acceptedReply}>{t('detail.clientReply', { text: lead.last_client_note })}</Text>
            ) : null}
          </View>
        )}

        {/* Conversation + attachments */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('detail.conversation')}</Text>
          <ConversationThread messages={lead.conversation} mediaUrls={lead.media_urls} />
        </View>
      </ScrollView>

      {/* Bottom CTA bar — standard (non-prolongation) */}
      {extracted.classification !== 'prolongation' && (
        <View style={s.ctaBar}>
          <TouchableOpacity onPress={() => handleStatus('ignored')} style={[s.ctaBtn, s.ctaBtnGhost]} activeOpacity={0.8}>
            <Text style={s.ctaBtnGhostText}>{t('detail.ignore')}</Text>
          </TouchableOpacity>

          {status === 'pending' && extracted.classification === 'new_lead' && (
            <TouchableOpacity onPress={() => handleStatus('waiting')} style={[s.ctaBtn, s.ctaBtnSoft]} activeOpacity={0.8}>
              <Text style={s.ctaBtnSoftText}>{t('detail.prepareQuote')}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={handleConvert} style={[s.ctaBtn, s.ctaBtnPrimary]} activeOpacity={0.8}>
            <Text style={s.ctaBtnPrimaryText}>{t('detail.convertToContract')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom CTA bar — prolongation variant */}
      {extracted.classification === 'prolongation' && status === 'pending' && (
        <View style={s.ctaBar}>
          <TouchableOpacity onPress={() => handleStatus('ignored')} style={[s.ctaBtn, s.ctaBtnGhost]} activeOpacity={0.8}>
            <Text style={s.ctaBtnGhostText}>{t('prolongationIgnore', { defaultValue: 'Ignorer' })}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleStatus('ignored')} style={[s.ctaBtn, s.ctaBtnGhost, { borderColor: colors.danger }]} activeOpacity={0.8}>
            <Text style={[s.ctaBtnGhostText, { color: colors.danger }]}>{t('prolongationRefuse', { defaultValue: 'Refuser' })}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              const targetId = lead?.prolongation_target_contract_id || pickedContractId
              if (!targetId) { Alert.alert(t('prolongationPickContract', { defaultValue: 'Quel contrat prolonger ?' })); return }
              navigation.navigate('ContractDetail', {
                contractId: targetId,
                openExtendWithPrefill: extracted.end_date || null,
                prolongationLeadIds: [lead.id],
              })
            }}
            style={[s.ctaBtn, s.ctaBtnPrimary]}
            activeOpacity={0.8}
          >
            <Text style={s.ctaBtnPrimaryText}>{t('prolongationCTA', { defaultValue: 'Prolonger contrat →' })}</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: colors.danger, textAlign: 'center', padding: 20, fontFamily: fonts.regular },

  headerBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.canvas,
  },
  backBtn:  { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  backText: { color: colors.ink, fontSize: 22, fontFamily: fonts.regular },

  titleBlock: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 4 },
  title:     { ...typography.screenTitle, fontSize: 24 },
  subtitle:  { fontFamily: fonts.regular, fontSize: 12, color: colors.slate, marginTop: 4 },
  matchWarn: { fontFamily: fonts.medium, fontSize: 11, color: colors.signal, marginTop: 6 },

  summaryCard: {
    marginHorizontal: spacing.md, marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: '#EEF0FF', borderRadius: radius.card,
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.20)',
  },
  eyebrow:     { fontFamily: fonts.bold, fontSize: 11, color: colors.slate, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  summaryText: { fontFamily: fonts.regular, fontSize: 14, color: colors.ink, lineHeight: 20 },

  section:       { marginHorizontal: spacing.md, marginTop: spacing.lg },
  sectionTitle:  { ...typography.sectionTitle, fontSize: 17, marginBottom: spacing.sm },
  classificationLine: { fontFamily: fonts.medium, fontSize: 13, color: colors.info, marginBottom: spacing.sm },

  saveBtn:     { marginTop: 8, alignSelf: 'flex-start', borderRadius: radius.button, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderStrong },
  saveBtnText: { color: colors.ink, fontFamily: fonts.medium, fontSize: 13 },

  acceptedCard: {
    marginHorizontal: spacing.md, marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: '#E8F7EE', borderRadius: radius.card,
    borderWidth: 1, borderColor: 'rgba(30,127,58,0.25)',
  },
  acceptedText:  { fontFamily: fonts.medium, fontSize: 13, color: colors.success },
  acceptedReply: { fontFamily: fonts.regular, fontSize: 12, color: colors.slate, marginTop: 6 },

  ctaBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', gap: 8,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, paddingBottom: spacing.md,
    backgroundColor: colors.canvas, borderTopWidth: 1, borderTopColor: colors.border,
  },
  ctaBtn:           { flex: 1, paddingVertical: 12, borderRadius: radius.button, alignItems: 'center' },
  ctaBtnPrimary:    { backgroundColor: colors.ink },
  ctaBtnPrimaryText:{ color: colors.canvas, fontFamily: fonts.bold, fontSize: 13 },
  ctaBtnSoft:       { backgroundColor: '#EEF0FF', borderWidth: 1, borderColor: 'rgba(99,102,241,0.35)' },
  ctaBtnSoftText:   { color: '#4F46E5', fontFamily: fonts.bold, fontSize: 13 },
  ctaBtnGhost:      { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderStrong },
  ctaBtnGhostText:  { color: colors.danger, fontFamily: fonts.medium, fontSize: 13 },

  prolongCard: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.canvas, marginTop: spacing.sm, marginHorizontal: spacing.md },
  prolongLine: { fontFamily: fonts.regular, fontSize: 13, color: colors.ink },
  prolongLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.slate, marginBottom: spacing.sm },
  prolongOption: { padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.xs },
  prolongOptionSelected: { borderColor: colors.info, backgroundColor: colors.info + '14' },
  prolongOptionText: { fontFamily: fonts.regular, fontSize: 13, color: colors.ink },
  prolongOptionTextSelected: { fontFamily: fonts.medium, color: colors.info },
})
