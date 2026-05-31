// Wave 1.3 — vehicle reference photo storage.
// Bucket: `vehicle-photos`. Path: {agency_id}/{vehicle_id}/{filename}.
// Bucket is private; we issue 1-hour signed URLs for display.

import * as ImageManipulator from 'expo-image-manipulator'
import { supabase, getAgencyId } from './supabase'

// atob is provided by react-native-url-polyfill/auto (already loaded in supabase.js).
const b64decode = (s) => globalThis.atob(s)

const BUCKET = 'vehicle-photos'

function folder(agencyId, vehicleId) {
  return `${agencyId}/${vehicleId}`
}

// Compress before upload — ID photos go to <500KB even from a 12MP camera.
async function prepImage(uri) {
  return ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1600 } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true },
  )
}

// List photos for a vehicle and resolve them to signed URLs.
// Returns: [{ name, path, url, createdAt }]
export async function listVehiclePhotos(vehicleId) {
  const agencyId = await getAgencyId()
  if (!agencyId || !vehicleId) return []

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(folder(agencyId, vehicleId), { limit: 100, sortBy: { column: 'created_at', order: 'desc' } })
  if (error) {
    console.error('[vehiclePhotos] list', error)
    return []
  }
  if (!data || data.length === 0) return []

  // Filter out the placeholder ".emptyFolderPlaceholder" supabase sometimes returns.
  const files = data.filter(f => f.name && !f.name.startsWith('.'))
  const paths = files.map(f => `${folder(agencyId, vehicleId)}/${f.name}`)

  // createSignedUrls is one round-trip for the batch.
  const { data: signed, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, 3600)
  if (signErr) {
    console.error('[vehiclePhotos] sign', signErr)
    return []
  }

  return files.map((f, i) => ({
    name:      f.name,
    path:      paths[i],
    url:       signed?.[i]?.signedUrl || null,
    createdAt: f.created_at,
  }))
}

export async function uploadVehiclePhoto(vehicleId, sourceUri) {
  const agencyId = await getAgencyId()
  if (!agencyId) throw new Error('Not authenticated')
  if (!vehicleId) throw new Error('Vehicle id required')

  const img = await prepImage(sourceUri)
  if (!img.base64) throw new Error('Image compression failed')

  // Convert base64 → ArrayBuffer for Supabase upload (RN fetch + Blob is unreliable on Android).
  const bin = b64decode(img.base64)
  const len = bin.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i)

  const filename = `${Date.now()}-${Math.floor(Math.random() * 1e6)}.jpg`
  const path = `${folder(agencyId, vehicleId)}/${filename}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes.buffer, { contentType: 'image/jpeg', upsert: false })
  if (error) throw error
  return { path, name: filename }
}

export async function deleteVehiclePhoto(path) {
  if (!path) return
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) throw error
}

