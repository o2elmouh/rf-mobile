import { useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Modal, Pressable,
} from 'react-native'
import * as ImageManipulator from 'expo-image-manipulator'
import { detectDamage } from '../../lib/db'
import { ApiError } from '../../lib/api'
import {
  colors, radius, spacing, fonts, typography, input,
  btnPrimary, btnPrimaryText, btnSecondary, btnSecondaryText,
} from '../../theme'

const SEVERITY = {
  minor:    { label: 'Mineur',    hue: colors.signalSoft },
  major:    { label: 'Majeur',    hue: colors.danger },
  cosmetic: { label: 'Cosmétique', hue: colors.slate },
}
const CONFIDENCE = {
  high:   'Confiance élevée',
  medium: 'Confiance moyenne',
  low:    'Confiance faible',
}

async function compressToDataUrl(uri) {
  const out = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1280 } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true },
  )
  return `data:image/jpeg;base64,${out.base64}`
}

export default function AiDamagePanel({ contract, afterPhotos, beforePhotos, onNext, onBack, onSkip }) {
  const [analysing, setAnalysing] = useState(false)
  const [result,    setResult]    = useState(null) // server response (mutable)
  const [editing,   setEditing]   = useState(null) // index of damage being edited, or 'new'

  const afterUris  = Object.values(afterPhotos  || {}).filter(Boolean)
  const beforeUris = Object.values(beforePhotos || {}).filter(Boolean)

  const runAnalysis = async () => {
    if (afterUris.length === 0) {
      Alert.alert('Aucune photo', 'Ajoutez au moins une photo de retour avant d\'analyser.')
      return
    }
    setAnalysing(true)
    try {
      const [after, before] = await Promise.all([
        Promise.all(afterUris.slice(0, 6).map(compressToDataUrl)),
        Promise.all(beforeUris.slice(0, 6).map(compressToDataUrl)),
      ])
      const data = await detectDamage({
        afterPhotos:    after,
        beforePhotos:   before,
        contractNumber: contract?.contract_number || '',
        vehicleName:    contract?.vehicle_label || contract?.vehicle_name || '',
        clientName:     contract?.client_name || '',
      })
      setResult({
        hasDamage:      !!data?.hasDamage,
        confidence:     data?.confidence || 'low',
        damages:        Array.isArray(data?.damages) ? data.damages : [],
        summary:        data?.summary || '',
        recommendation: data?.recommendation || '',
      })
    } catch (e) {
      const msg = e instanceof ApiError && e.status === 429
        ? 'Limite IA atteinte (30/heure). Réessayez plus tard.'
        : e instanceof ApiError && e.status === 503
          ? 'Service IA indisponible.'
          : (e?.body?.error || e?.message || 'Échec de l\'analyse.')
      Alert.alert('Erreur', msg)
    } finally {
      setAnalysing(false)
    }
  }

  const removeDamage = (idx) => {
    setResult(r => ({ ...r, damages: r.damages.filter((_, i) => i !== idx) }))
  }
  const upsertDamage = (idx, damage) => {
    setResult(r => {
      const next = [...r.damages]
      if (idx === 'new') next.push(damage)
      else next[idx] = damage
      return { ...r, damages: next, hasDamage: next.length > 0 }
    })
    setEditing(null)
  }

  // Continue advances the wizard with the (possibly edited) damages list.
  const handleContinue = () => {
    onNext({
      damages:        result?.damages || [],
      hasDamage:      !!result?.hasDamage,
      confidence:     result?.confidence,
      summary:        result?.summary,
      recommendation: result?.recommendation,
    })
  }

  // ── Render: pre-analysis CTA ──────────────────────────────────
  if (!result && !analysing) {
    return (
      <ScrollView style={s.container} contentContainerStyle={s.content}>
        <Text style={s.stepTitle}>Analyse IA des dommages</Text>
        <Text style={s.hint}>
          {afterUris.length > 0
            ? `${afterUris.length} photo${afterUris.length > 1 ? 's' : ''} de retour à analyser` +
              (beforeUris.length > 0 ? ` (${beforeUris.length} de référence)` : '')
            : 'Aucune photo de retour — l\'analyse est facultative.'}
        </Text>

        <View style={s.infoCard}>
          <Text style={s.infoTitle}>Comment ça marche</Text>
          <Text style={s.infoText}>
            Claude Vision compare les photos avant/après et identifie les nouveaux dommages.
            Vous pourrez corriger ou ajouter manuellement avant de clôturer.
          </Text>
        </View>

        <TouchableOpacity
          style={[btnPrimary, afterUris.length === 0 && { opacity: 0.5 }]}
          onPress={runAnalysis}
          disabled={afterUris.length === 0}
          activeOpacity={0.85}
        >
          <Text style={btnPrimaryText}>Lancer l'analyse</Text>
        </TouchableOpacity>

        <TouchableOpacity style={btnSecondary} onPress={onSkip} activeOpacity={0.85}>
          <Text style={btnSecondaryText}>Passer l'analyse</Text>
        </TouchableOpacity>
      </ScrollView>
    )
  }

  // ── Render: analysing ─────────────────────────────────────────
  if (analysing) {
    return (
      <View style={s.loadingWrap}>
        <ActivityIndicator color={colors.ink} size="large" />
        <Text style={s.loadingText}>Analyse en cours…</Text>
        <Text style={s.loadingSub}>Compression et envoi des photos à Claude Vision</Text>
      </View>
    )
  }

  // ── Render: results (editable) ────────────────────────────────
  const recommendationHue =
    /facturer/i.test(result.recommendation) ? colors.danger
    : /aucun frais/i.test(result.recommendation) ? colors.success
    : colors.signalSoft

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.stepTitle}>Résultat de l'analyse</Text>

      {/* Confidence + summary */}
      <View style={s.summaryCard}>
        <Text style={s.summaryEyebrow}>{CONFIDENCE[result.confidence] || result.confidence}</Text>
        <Text style={s.summaryText}>
          {result.hasDamage
            ? (result.summary || `${result.damages.length} dommage(s) détecté(s).`)
            : (result.summary || 'Aucun dommage détecté.')}
        </Text>
      </View>

      {/* Recommendation banner */}
      {result.recommendation ? (
        <View style={[s.recoBanner, { borderLeftColor: recommendationHue }]}>
          <Text style={[s.recoLabel, { color: recommendationHue }]}>RECOMMANDATION</Text>
          <Text style={s.recoText}>{result.recommendation}</Text>
        </View>
      ) : null}

      {/* Damages list */}
      <View style={s.listHeader}>
        <Text style={typography.eyebrow}>DOMMAGES ({result.damages.length})</Text>
        <TouchableOpacity onPress={() => setEditing('new')}>
          <Text style={s.addLink}>+ Ajouter</Text>
        </TouchableOpacity>
      </View>

      {result.damages.length === 0 ? (
        <Text style={s.emptyDamages}>Aucun dommage enregistré.</Text>
      ) : result.damages.map((d, idx) => {
        const sev = SEVERITY[d.severity] || { label: d.severity || '—', hue: colors.slate }
        return (
          <View key={idx} style={s.damageCard}>
            <View style={s.damageRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.damageZone}>{d.zone || '—'}</Text>
                <Text style={s.damageDesc}>{d.description || ''}</Text>
              </View>
              <View style={[s.sevBadge, { backgroundColor: sev.hue + '1A' }]}>
                <Text style={[s.sevText, { color: sev.hue }]}>{sev.label}</Text>
              </View>
            </View>
            <View style={s.damageActions}>
              <TouchableOpacity onPress={() => setEditing(idx)}>
                <Text style={s.editLink}>Modifier</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeDamage(idx)}>
                <Text style={s.removeLink}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          </View>
        )
      })}

      <View style={{ height: spacing.lg }} />

      <TouchableOpacity style={btnPrimary} onPress={handleContinue} activeOpacity={0.85}>
        <Text style={btnPrimaryText}>Continuer →</Text>
      </TouchableOpacity>
      <TouchableOpacity style={btnSecondary} onPress={() => { setResult(null) }} activeOpacity={0.85}>
        <Text style={btnSecondaryText}>Relancer l'analyse</Text>
      </TouchableOpacity>

      {editing !== null && (
        <DamageEditor
          initial={editing === 'new' ? { zone: '', description: '', severity: 'minor' } : result.damages[editing]}
          onCancel={() => setEditing(null)}
          onSave={(d) => upsertDamage(editing, d)}
        />
      )}
    </ScrollView>
  )
}

function DamageEditor({ initial, onCancel, onSave }) {
  const [zone,        setZone]        = useState(initial.zone || '')
  const [description, setDescription] = useState(initial.description || '')
  const [severity,    setSeverity]    = useState(initial.severity || 'minor')

  const submit = () => {
    if (!zone.trim()) { Alert.alert('La zone est requise.'); return }
    onSave({ zone: zone.trim(), description: description.trim(), severity })
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={m.backdrop} onPress={onCancel}>
        <Pressable style={m.sheet} onPress={e => e.stopPropagation()}>
          <View style={m.handle} />
          <Text style={m.title}>Dommage</Text>

          <Text style={m.label}>Zone</Text>
          <TextInput
            style={m.input}
            value={zone}
            onChangeText={setZone}
            placeholder="ex. Pare-choc avant"
            placeholderTextColor={colors.dustTaupe}
          />

          <Text style={m.label}>Description</Text>
          <TextInput
            style={[m.input, { height: 80 }]}
            value={description}
            onChangeText={setDescription}
            placeholder="ex. Rayure 15cm"
            placeholderTextColor={colors.dustTaupe}
            multiline
          />

          <Text style={m.label}>Gravité</Text>
          <View style={m.sevRow}>
            {Object.keys(SEVERITY).map(k => {
              const active = severity === k
              return (
                <TouchableOpacity
                  key={k}
                  style={[m.sevPill, active && { backgroundColor: SEVERITY[k].hue, borderColor: SEVERITY[k].hue }]}
                  onPress={() => setSeverity(k)}
                  activeOpacity={0.7}
                >
                  <Text style={[m.sevPillText, active && { color: colors.canvas }]}>{SEVERITY[k].label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: spacing.md }}>
            <TouchableOpacity style={[btnSecondary, { flex: 1, marginTop: 0 }]} onPress={onCancel} activeOpacity={0.85}>
              <Text style={btnSecondaryText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[btnPrimary, { flex: 1, marginTop: 0 }]} onPress={submit} activeOpacity={0.85}>
              <Text style={btnPrimaryText}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.canvas },
  content:     { padding: spacing.lg, paddingBottom: spacing.xl + 16 },
  stepTitle:   { ...typography.cardTitle, marginBottom: 6 },
  hint:        { color: colors.slate, fontFamily: fonts.regular, fontSize: 13, marginBottom: spacing.lg },

  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: spacing.lg, backgroundColor: colors.canvas },
  loadingText: { ...typography.cardTitle, marginTop: spacing.md },
  loadingSub:  { color: colors.slate, fontFamily: fonts.regular, fontSize: 13, textAlign: 'center' },

  infoCard:  { backgroundColor: colors.softBone, borderRadius: radius.card, padding: spacing.md, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border },
  infoTitle: { ...typography.cardTitle, fontSize: 14, marginBottom: 6 },
  infoText:  { color: colors.slate, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },

  summaryCard:    { backgroundColor: colors.white, borderRadius: radius.card, padding: spacing.md, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  summaryEyebrow: { ...typography.eyebrow, marginBottom: 4 },
  summaryText:    { color: colors.ink, fontFamily: fonts.medium, fontSize: 14, lineHeight: 19 },

  recoBanner: { backgroundColor: colors.white, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 3, padding: spacing.md, marginBottom: spacing.md },
  recoLabel:  { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.5, marginBottom: 4 },
  recoText:   { color: colors.ink, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },

  listHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md, marginBottom: spacing.sm },
  addLink:      { color: colors.ink, fontFamily: fonts.medium, fontSize: 13 },
  emptyDamages: { color: colors.slate, fontFamily: fonts.regular, fontSize: 13, padding: spacing.md, textAlign: 'center' },

  damageCard:   { backgroundColor: colors.white, borderRadius: radius.card, padding: spacing.md, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  damageRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  damageZone:   { color: colors.ink, fontFamily: fonts.medium, fontSize: 14, marginBottom: 2 },
  damageDesc:   { color: colors.slate, fontFamily: fonts.regular, fontSize: 12 },
  sevBadge:     { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  sevText:      { fontFamily: fonts.bold, fontSize: 10 },
  damageActions:{ flexDirection: 'row', gap: 16, marginTop: 8 },
  editLink:     { color: colors.ink, fontFamily: fonts.medium, fontSize: 12 },
  removeLink:   { color: colors.danger, fontFamily: fonts.regular, fontSize: 12 },
})

const m = StyleSheet.create({
  backdrop:    { flex: 1, backgroundColor: 'rgba(20,20,19,0.55)', justifyContent: 'flex-end' },
  sheet:       { backgroundColor: colors.canvas, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.md, paddingBottom: spacing.xl, borderTopWidth: 1, borderColor: colors.border },
  handle:      { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong, marginBottom: 12 },
  title:       { ...typography.cardTitle, marginBottom: spacing.md },
  label:       { color: colors.slate, fontFamily: fonts.regular, fontSize: 12, marginBottom: 6, marginTop: spacing.sm },
  input:       { ...input, marginBottom: 8 },
  sevRow:      { flexDirection: 'row', gap: 8 },
  sevPill:     { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.white },
  sevPillText: { color: colors.ink, fontFamily: fonts.medium, fontSize: 12 },
})
