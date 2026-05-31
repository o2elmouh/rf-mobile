// Moroccan license plate helpers — exact port of the web app
// `pages/fleet/constants.js`. Plates are stored in `vehicles.plate_number`
// as `serial|letter|region` (e.g. `12345|ب|01`) and displayed RTL as
// `01 ب 12345`. Keep this in sync with the web app verbatim.

export const AR_LETTERS = [
  'أ','ب','ت','ث','ج','ح','خ','د','ذ','ر','ز','س','ش','ص',
  'ض','ط','ظ','ع','غ','ف','ق','ك','ل','م','ن','ه','و','ي',
]

export function parsePlate(plate = '') {
  const parts = String(plate || '').split('|')
  return {
    serial: parts[0] || '',
    letter: parts[1] || 'أ',
    region: parts[2] || '01',
  }
}

export function buildPlate(serial, letter, region) {
  return `${serial}|${letter}|${region}`
}

export function displayPlate(plate = '') {
  const { serial, letter, region } = parsePlate(plate)
  if (!serial) return plate
  return `${region} ${letter} ${serial}`
}
