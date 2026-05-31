import { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, ScrollView, Alert,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { colors, radius, spacing, fonts, typography, btnPrimary, btnPrimaryText } from '../../theme'

const SLOTS = [
  { key: 'avant',   label: 'Avant' },
  { key: 'arriere', label: 'Arrière' },
  { key: 'gauche',  label: 'Gauche' },
  { key: 'droite',  label: 'Droite' },
]

export default function ReturnPhotosStep({ onNext, onSkip }) {
  const [photos, setPhotos] = useState({})

  const pickPhoto = async (slotKey) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Veuillez autoriser l\'accès à la galerie photo.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    })
    if (!result.canceled && result.assets?.length > 0) {
      setPhotos(prev => ({ ...prev, [slotKey]: result.assets[0].uri }))
    }
  }

  const takePhoto = async (slotKey) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Veuillez autoriser l\'accès à la caméra.')
      return
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    })
    if (!result.canceled && result.assets?.length > 0) {
      setPhotos(prev => ({ ...prev, [slotKey]: result.assets[0].uri }))
    }
  }

  const handleSlotPress = (slotKey) => {
    Alert.alert(
      'Ajouter une photo',
      '',
      [
        { text: 'Prendre une photo', onPress: () => takePhoto(slotKey) },
        { text: 'Choisir depuis la galerie', onPress: () => pickPhoto(slotKey) },
        { text: 'Annuler', style: 'cancel' },
      ]
    )
  }

  const removePhoto = (slotKey) => {
    setPhotos(prev => { const n = { ...prev }; delete n[slotKey]; return n })
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.stepTitle}>Photos du véhicule</Text>
      <Text style={s.hint}>Photographiez l'état du véhicule au retour</Text>

      <View style={s.grid}>
        {SLOTS.map(slot => (
          <View key={slot.key} style={s.slotWrapper}>
            {photos[slot.key] ? (
              <View style={s.slot}>
                <Image source={{ uri: photos[slot.key] }} style={s.thumbnail} />
                <TouchableOpacity style={s.removeBtn} onPress={() => removePhoto(slot.key)}>
                  <Text style={s.removeBtnText}>✕</Text>
                </TouchableOpacity>
                <Text style={s.slotLabel}>{slot.label}</Text>
              </View>
            ) : (
              <TouchableOpacity style={s.emptySlot} onPress={() => handleSlotPress(slot.key)} activeOpacity={0.7}>
                <Text style={s.cameraIcon}>📷</Text>
                <Text style={s.slotLabel}>{slot.label}</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>

      <TouchableOpacity style={s.btn} onPress={() => onNext(photos)}>
        <Text style={s.btnText}>Suivant →</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.skipBtn} onPress={() => onSkip()}>
        <Text style={s.skipText}>Passer cette étape</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.canvas },
  content:      { padding: spacing.lg, paddingBottom: 40 },
  stepTitle:    { ...typography.cardTitle, marginBottom: 6 },
  hint:         { color: colors.slate, fontFamily: fonts.regular, fontSize: 13, marginBottom: spacing.lg },
  grid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: spacing.xl },
  slotWrapper:  { width: '47%' },
  slot:         { borderRadius: radius.card, overflow: 'hidden', position: 'relative' },
  emptySlot:    { backgroundColor: colors.white, borderRadius: radius.card, borderWidth: 1, borderColor: colors.borderStrong, borderStyle: 'dashed', height: 120, justifyContent: 'center', alignItems: 'center' },
  thumbnail:    { width: '100%', height: 120, borderRadius: radius.card },
  slotLabel:    { color: colors.ink, fontFamily: fonts.medium, fontSize: 12, textAlign: 'center', marginTop: 6 },
  cameraIcon:   { fontSize: 28, marginBottom: 6 },
  removeBtn:    { position: 'absolute', top: 6, right: 6, backgroundColor: colors.ink, borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  removeBtnText:{ color: colors.canvas, fontFamily: fonts.bold, fontSize: 12 },
  btn:          { ...btnPrimary, marginBottom: 12, marginTop: 0 },
  btnText:      { ...btnPrimaryText },
  skipBtn:      { alignItems: 'center', paddingVertical: 10 },
  skipText:     { color: colors.slate, fontFamily: fonts.regular, fontSize: 14 },
})
