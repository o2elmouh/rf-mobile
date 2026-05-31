/**
 * Format a WhatsApp sender identifier (Baileys JID or Gmail address) for display.
 *
 * Mirrors web `utils/phoneFormat.js` — keep in sync.
 *
 * Behaviour:
 *   - Gmail addresses (containing "@" but not a WhatsApp suffix) pass through unchanged
 *   - Strips the `@s.whatsapp.net` / `@lid` / `@c.us` suffix
 *   - Strips the multi-device suffix (":NN" before the @)
 *   - Identifies the country code via longest-prefix match
 *   - Formats as "+CC XXX XXX XXX..." (3-digit chunks after the CC)
 *   - Unknown CC or out-of-range digit count → returns cleaned digits, no "+" prefix
 */

const COUNTRY_CODES = [
  // 3-digit
  '212', '213', '216', '218',                             // MA, DZ, TN, LY
  '351',                                                  // PT
  '961', '962', '963', '964', '965', '966', '967', '968', // LB, JO, SY, IQ, KW, SA, YE, OM
  '970', '971', '972', '973', '974',                      // PS, AE, IL, BH, QA
  '380',                                                  // UA

  // 2-digit
  '20',                                                   // EG
  '27',                                                   // ZA
  '30', '31', '32', '33', '34', '36', '39',               // GR, NL, BE, FR, ES, HU, IT
  '40', '41', '43', '44', '45', '46', '47', '48', '49',   // RO, CH, AT, GB, DK, SE, NO, PL, DE
  '51', '52', '53', '54', '55', '56', '57', '58',         // PE, MX, CU, AR, BR, CL, CO, VE
  '60', '61', '62', '63', '64', '65', '66',               // MY, AU, ID, PH, NZ, SG, TH
  '81', '82', '84', '86',                                 // JP, KR, VN, CN
  '90', '91', '92', '93', '94', '95', '98',               // TR, IN, PK, AF, LK, MM, IR

  // 1-digit (NANP + RU/KZ) — must be last so 2-digit matches win
  '1',
  '7',
]

export function formatPhone(senderId) {
  if (!senderId || typeof senderId !== 'string') return ''

  const isWhatsAppJid = /@(s\.whatsapp\.net|lid|c\.us)$/i.test(senderId)
  if (senderId.includes('@') && !isWhatsAppJid) return senderId

  const localPart = senderId.split('@')[0]
  const digits = localPart.split(':')[0].replace(/\D/g, '')

  if (!digits) return ''
  if (digits.length < 8 || digits.length > 15) return digits

  let cc = null
  for (const code of COUNTRY_CODES) {
    if (digits.startsWith(code)) {
      cc = code
      break
    }
  }

  if (!cc) return digits

  const rest = digits.slice(cc.length)
  const groups = []
  for (let i = 0; i < rest.length; i += 3) {
    groups.push(rest.slice(i, i + 3))
  }

  return `+${cc} ${groups.join(' ')}`.trim()
}
