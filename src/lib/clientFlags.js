// Exact port of the web app's flag taxonomy in `pages/Clients.jsx`.
// `flag_category` is one of these strings (or null). `flag_note` is freeform.
// The DB stores both as columns on `clients`; the API wraps them into a
// `{ category, note }` object on read.

export const FLAG_CATEGORIES = ['Impayé', 'Dommage non remboursé', 'Litige', 'Blacklist', 'Autre']

// Color tokens chosen to map cleanly onto the mobile theme. Bg uses
// the same hue at 18% alpha; the border / text use the full hue.
export const FLAG_STYLES = {
  'Impayé':                 { hue: '#E8A020', label: 'Impayé' },
  'Dommage non remboursé':  { hue: '#E8A020', label: 'Dommage non remboursé' },
  'Litige':                 { hue: '#5B9BD5', label: 'Litige' },
  'Blacklist':              { hue: '#E05252', label: 'Blacklist' },
  'Autre':                  { hue: '#9996A0', label: 'Autre' },
}

export function flagStyle(category) {
  return FLAG_STYLES[category] || FLAG_STYLES['Autre']
}
