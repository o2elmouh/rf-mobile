// Formats any DB date value (`yyyy-mm-dd`, ISO timestamp, or null)
// into a French-style `dd/mm/yyyy` for display. Returns '—' on empty.
export function fmtDate(input) {
  if (!input) return '—'
  const d = new Date(input)
  if (isNaN(d.getTime())) return String(input)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

// Coerces a date string from the inputs we receive (user-typed
// `dd/mm/yyyy`, OCR scanner output, or already-ISO `yyyy-mm-dd`)
// into the `yyyy-mm-dd` Postgres expects. Returns null for empty
// or unparseable input so saves don't crash.
export function normalizeDate(input) {
  if (input == null) return null
  const s = String(input).trim()
  if (!s) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/)
  if (m) {
    const [, dd, mm, yyyy] = m
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
  }
  return null
}
