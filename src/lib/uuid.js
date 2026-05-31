// Cryptographically safe UUID v4 for React Native (no crypto.randomUUID support)
export function generateUUID() {
  const bytes = new Uint8Array(16)
  for (let i = 0; i < 16; i++) {
    bytes[i] = Math.floor(Math.random() * 256)
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`
}

// Unique contract number: RF-YYYY-XXXXXXXX (8 random chars)
export function generateContractNumber() {
  const year = new Date().getFullYear()
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase()
  return `RF-${year}-${rand}`
}
