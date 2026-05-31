import * as ImageManipulator from 'expo-image-manipulator'
import { apiPostMultipart, ApiError } from './api'

// Resize + compress before upload (server limit is 10MB, but Claude Vision
// costs scale with image size; ~1024px wide is the sweet spot for ID cards).
async function prepImage(uri) {
  return ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1024 } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
  )
}

function mapDocumentType(t) {
  if (t === 'ID_CARD') return 'CIN'
  if (t === 'DRIVING_LICENSE') return 'DRIVING_LICENCE'
  if (t === 'PASSPORT') return 'PASSPORT'
  return 'OTHER'
}

// Calls the Express server's POST /ocr/scan-claude (Claude Vision behind auth).
// `hint` ∈ 'cin' | 'license' | 'passport' — passes user intent to the model.
// Normalizes the server response into the legacy field-name shape the
// rental wizard already consumes (snake_case, separated cin/licence/passport).
export async function analyzeDocument(uri, hint) {
  const img = await prepImage(uri)

  const form = new FormData()
  form.append('document', {
    uri: img.uri,
    name: 'document.jpg',
    type: 'image/jpeg',
  })
  if (hint) form.append('hint', hint)

  let data
  try {
    data = await apiPostMultipart('/ocr/scan-claude', form)
  } catch (e) {
    if (e instanceof ApiError && e.status === 429) {
      throw new Error('Limite de scans atteinte (20/heure). Réessayez plus tard.')
    }
    if (e instanceof ApiError && e.status === 503) {
      throw new Error('Service OCR indisponible. Réessayez plus tard.')
    }
    throw new Error(e?.message || 'Erreur réseau lors du scan. Réessayez.')
  }

  if (data?.error === 'INCOMPLETE') {
    const miss = Array.isArray(data.missing) && data.missing.length
      ? ` (manquant : ${data.missing.join(', ')})`
      : ''
    throw new Error(`Document non lisible${miss}. Réessayez avec une meilleure photo.`)
  }

  const docType = mapDocumentType(data?.documentType)
  const out = {
    doc_type:    docType,
    first_name:  data?.firstName  || '',
    last_name:   data?.lastName   || '',
    birth_date:  data?.dateOfBirth || '',
    nationality: data?.issuingCountry || '',
  }
  if (docType === 'CIN') {
    out.cin_number = data?.documentNumber || ''
    out.cin_expiry = data?.expiryDate || ''
  } else if (docType === 'PASSPORT') {
    out.passport_number = data?.documentNumber || ''
    out.passport_expiry = data?.expiryDate || ''
  } else if (docType === 'DRIVING_LICENCE') {
    out.licence_number = data?.documentNumber || ''
    out.licence_expiry = data?.expiryDate || ''
  }
  return out
}
