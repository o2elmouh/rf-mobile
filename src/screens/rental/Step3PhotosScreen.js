import { useState } from 'react'
import {
  View, Text, TouchableOpacity, Image,
  StyleSheet, Alert, ScrollView,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { colors, radius, spacing, fonts, typography, btnPrimary, btnPrimaryText, btnSecondary, btnSecondaryText } from '../../theme'

const SLOTS = [
  { key: 'front', label: 'Avant' },
  { key: 'rear',  label: 'Arrière' },
  { key: 'left',  label: 'Gauche' },
  { key: 'right', label: 'Droite' },
]

export default function Step3PhotosScreen({ onNext, onBack }) {
  const [photos, setPhotos] = useState({ front: null, rear: null, left: null, right: null })

  const pickPhoto = async (slotKey) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Accès à la galerie requis pour ajouter des photos.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    })
    if (!result.canceled && result.assets?.length > 0) {
      setPhotos(p => ({ ...p, [slotKey]: result.assets[0].uri }))
    }
  }

  const takePhoto = async (slotKey) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Accès à la caméra requis pour prendre des photos.')
      return
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    })
    if (!result.canceled && result.assets?.length > 0) {
      setPhotos(p => ({ ...p, [slotKey]: result.assets[0].uri }))
    }
  }

  const handleSlotPress = (slotKey) => {
    Alert.alert('Ajouter une photo', 'Choisissez la source', [
      { text: 'Caméra',      onPress: () => takePhoto(slotKey) },
      { text: 'Galerie',     onPress: () => pickPhoto(slotKey) },
      { text: 'Annuler',     style: 'cancel' },
    ])
  }

  const handleRemove = (slotKey) => {
    setPhotos(p => ({ ...p, [slotKey]: null }))
  }

  const takenCount = Object.values(photos).filter(Boolean).length

  return (
    <ScrollView style={s.container} contentContainerStyle={s.scrollContent}>
      <Text style={s.info}>{takenCount}/4 photos prises</Text>

      <View style={s.grid}>
        {SLOTS.map(slot => (
          <View key={slot.key} style={s.slotWrapper}>
            <TouchableOpacity style={s.slot} onPress={() => handleSlotPress(slot.key)}>
              {photos[slot.key] ? (
                <Image source={{ uri: photos[slot.key] }} style={s.thumb} />
              ) : (
                <View style={s.placeholder}>
                  <Text style={s.cameraIcon}>📷</Text>
                  <Text style={s.slotLabel}>{slot.label}</Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={s.slotFooter}>
              <Text style={s.slotLabelBelow}>{slot.label}</Text>
              {photos[slot.key] && (
                <TouchableOpacity onPress={() => handleRemove(slot.key)}>
                  <Text style={s.removeText}>Supprimer</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </View>

      <View style={s.navRow}>
        <TouchableOpacity style={s.backBtn} onPress={onBack}>
          <Text style={s.backBtnText}>← Retour</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.skipBtn} onPress={() => onNext({})}>
          <Text style={s.skipBtnText}>Passer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.nextBtn} onPress={() => onNext(photos)}>
          <Text style={s.nextBtnText}>Suivant →</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.canvas },
  scrollContent:  { padding: spacing.md, paddingBottom: spacing.xl + 16 },
  info:           { color: colors.slate, fontFamily: fonts.regular, fontSize: 13, marginBottom: spacing.md, textAlign: 'center' },
  grid:           { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  slotWrapper:    { width: '47%' },
  slot:           { backgroundColor: colors.white, borderRadius: radius.card, height: 130, overflow: 'hidden', borderWidth: 1, borderColor: colors.borderStrong, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  thumb:          { width: '100%', height: '100%', resizeMode: 'cover' },
  placeholder:    { alignItems: 'center' },
  cameraIcon:     { fontSize: 30, marginBottom: 6 },
  slotLabel:      { color: colors.slate, fontFamily: fonts.regular, fontSize: 13 },
  slotFooter:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, paddingHorizontal: 2 },
  slotLabelBelow: { color: colors.ink, fontFamily: fonts.medium, fontSize: 12 },
  removeText:     { color: colors.danger, fontFamily: fonts.regular, fontSize: 11 },
  navRow:         { flexDirection: 'row', gap: 8, marginTop: spacing.lg, marginBottom: 30 },
  backBtn:        { ...btnSecondary, flex: 1, marginTop: 0 },
  backBtnText:    { ...btnSecondaryText },
  skipBtn:        { ...btnSecondary, flex: 1, marginTop: 0 },
  skipBtnText:    { ...btnSecondaryText },
  nextBtn:        { ...btnPrimary, flex: 2, marginTop: 0 },
  nextBtnText:    { ...btnPrimaryText },
})
