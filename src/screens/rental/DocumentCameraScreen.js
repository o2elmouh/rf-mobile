import { useRef, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'

export default function DocumentCameraScreen({ onCapture, onCancel, title }) {
  const [permission, requestPermission] = useCameraPermissions()
  const [capturing, setCapturing] = useState(false)
  const cameraRef = useRef(null)

  const handleCapture = async () => {
    if (!cameraRef.current || capturing) return
    setCapturing(true)
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 })
      onCapture(photo.uri)
    } catch {
      setCapturing(false)
    }
  }

  if (!permission) return <View style={s.container} />

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
        {/* Top bar */}
        <View style={s.topBar}>
          <Text style={s.title}>{title || 'Scanner le document'}</Text>
        </View>

        {/* Bottom bar */}
        <View style={s.bottomBar}>
          <View style={s.actions}>
            <TouchableOpacity style={s.cancelBtn} onPress={onCancel}>
              <Text style={s.cancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.captureBtn, capturing && s.captureBtnDisabled]} onPress={handleCapture} disabled={capturing}>
              {capturing
                ? <ActivityIndicator color="#fff" />
                : <View style={s.captureInner} />
              }
            </TouchableOpacity>
            <View style={{ width: 80 }} />
          </View>
        </View>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  container:         { flex: 1, backgroundColor: '#000' },
  center:            { flex: 1, backgroundColor: '#0f0f1a', justifyContent: 'center', alignItems: 'center', gap: 16 },
  text:              { color: '#fff', fontSize: 14 },
  overlay:           { ...StyleSheet.absoluteFillObject, flexDirection: 'column' },
  topBar:            { backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', paddingTop: 50, paddingBottom: 16 },
  title:             { color: '#fff', fontSize: 16, fontWeight: '700' },
  bottomBar:         { flex: 1, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 40 },
  actions:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 20 },
  cancelBtn:         { backgroundColor: '#333', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  cancelText:        { color: '#fff', fontWeight: '600', fontSize: 14 },
  captureBtn:        { width: 68, height: 68, borderRadius: 34, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#e94560' },
  captureBtnDisabled:{ opacity: 0.5 },
  captureInner:      { width: 52, height: 52, borderRadius: 26, backgroundColor: '#e94560' },
  btn:               { backgroundColor: '#e94560', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 10 },
  btnText:           { color: '#fff', fontWeight: '700' },
})
