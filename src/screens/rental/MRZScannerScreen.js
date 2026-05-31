import { useRef, useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import TextRecognition from '@react-native-ml-kit/text-recognition'
import { parse } from 'mrz'

function formatMRZDate(dateStr) {
  if (!dateStr || dateStr.length !== 6) return ''
  const yy = dateStr.slice(0, 2)
  const mm = dateStr.slice(2, 4)
  const dd = dateStr.slice(4, 6)
  const year = parseInt(yy) > 30 ? `19${yy}` : `20${yy}`
  return `${dd}/${mm}/${year}`
}

function cleanStr(str) {
  return (str || '').replace(/</g, ' ').trim()
}

function extractAndParseMRZ(rawText) {
  const lines = rawText.split('\n').map(l => l.replace(/\s/g, '').toUpperCase())
  const mrzLines = lines.filter(l => /^[A-Z0-9<]{30,44}$/.test(l))
  if (mrzLines.length < 2) return null
  try {
    // TD3: passport (2 lines x 44)
    if (mrzLines[0].length === 44 && mrzLines.length >= 2) {
      const result = parse([mrzLines[0], mrzLines[1]])
      if (result.valid) return result
    }
    // TD1: ID card (3 lines x 30)
    if (mrzLines[0].length === 30 && mrzLines.length >= 3) {
      const result = parse([mrzLines[0], mrzLines[1], mrzLines[2]])
      if (result.valid) return result
    }
    // Try all combinations
    for (let i = 0; i <= mrzLines.length - 2; i++) {
      try {
        const result = parse(mrzLines.slice(i, i + 3))
        if (result.valid) return result
      } catch {}
    }
  } catch {}
  return null
}

export default function MRZScannerScreen({ onResult, onCancel }) {
  const [permission, requestPermission] = useCameraPermissions()
  const [status, setStatus] = useState('Pointez vers le bas du document...')
  const [scanning, setScanning] = useState(false)
  const cameraRef = useRef(null)
  const scanned = useRef(false)
  const intervalRef = useRef(null)

  const attemptScan = useCallback(async () => {
    if (scanned.current || !cameraRef.current) return
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: true,
        shutterSound: false,
      })
      const recognized = await TextRecognition.recognize(photo.uri)
      const parsed = extractAndParseMRZ(recognized.text || '')
      if (parsed) {
        scanned.current = true
        clearInterval(intervalRef.current)
        const f = parsed.fields
        onResult({
          first_name:  cleanStr(f.firstName),
          last_name:   cleanStr(f.lastName),
          birth_date:  formatMRZDate(f.birthDate),
          expiry:      formatMRZDate(f.expirationDate),
          doc_number:  (f.documentNumber || '').replace(/</g, ''),
          nationality: cleanStr(f.nationality),
          doc_type:    f.documentType || '',
        })
      } else {
        setStatus('Zone MRZ non détectée, continuez à tenir le document...')
      }
    } catch {
      // silent retry
    }
  }, [onResult])

  useEffect(() => {
    if (!permission?.granted) return
    // Scan every 1.5 seconds
    intervalRef.current = setInterval(attemptScan, 1500)
    return () => clearInterval(intervalRef.current)
  }, [permission, attemptScan])

  if (!permission) {
    return (
      <View style={s.center}>
        <ActivityIndicator color="#e94560" />
      </View>
    )
  }

  if (!permission.granted) {
    return (
      <View style={s.center}>
        <Text style={s.text}>Permission caméra requise</Text>
        <TouchableOpacity style={s.btn} onPress={requestPermission}>
          <Text style={s.btnText}>Autoriser</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.cancelBtn} onPress={onCancel}>
          <Text style={s.cancelText}>Annuler</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={s.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      {/* Overlay */}
      <View style={s.overlay}>
        <View style={s.topOverlay} />
        <View style={s.middle}>
          <View style={s.sideOverlay} />
          <View style={s.scanWindow}>
            <View style={[s.corner, s.topLeft]} />
            <View style={[s.corner, s.topRight]} />
            <View style={[s.corner, s.bottomLeft]} />
            <View style={[s.corner, s.bottomRight]} />
          </View>
          <View style={s.sideOverlay} />
        </View>
        <View style={s.bottomOverlay}>
          <ActivityIndicator color="#e94560" style={{ marginBottom: 8 }} />
          <Text style={s.hint}>{status}</Text>
          <Text style={s.hint2}>{'Cadrez la zone MRZ (lignes <<< en bas du document)'}</Text>
          <TouchableOpacity style={s.cancelBtn} onPress={() => { clearInterval(intervalRef.current); onCancel() }}>
            <Text style={s.cancelText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const CORNER = 22
const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#000' },
  center:        { flex: 1, backgroundColor: '#0f0f1a', justifyContent: 'center', alignItems: 'center', gap: 16 },
  text:          { color: '#fff', fontSize: 14, textAlign: 'center', paddingHorizontal: 20 },
  overlay:       { ...StyleSheet.absoluteFillObject },
  topOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' },
  middle:        { flexDirection: 'row', height: 110 },
  sideOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' },
  scanWindow:    { width: 310 },
  bottomOverlay: { flex: 1.8, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', paddingTop: 20, gap: 6 },
  hint:          { color: '#fff', fontSize: 13, fontWeight: '600', textAlign: 'center', paddingHorizontal: 20 },
  hint2:         { color: '#aaa', fontSize: 11, textAlign: 'center', paddingHorizontal: 20 },
  btn:           { backgroundColor: '#e94560', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 10 },
  btnText:       { color: '#fff', fontWeight: '700' },
  cancelBtn:     { marginTop: 16, backgroundColor: '#333', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 10 },
  cancelText:    { color: '#fff', fontWeight: '600', fontSize: 14 },
  corner:        { position: 'absolute', width: CORNER, height: CORNER, borderColor: '#e94560', borderWidth: 3 },
  topLeft:       { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  topRight:      { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bottomLeft:    { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  bottomRight:   { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
})
