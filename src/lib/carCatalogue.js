// Exact port of the web app's `pages/fleet/constants.js` CAR_CATALOGUE.
// Keep in sync with the web app verbatim.

export const CAR_CATALOGUE = {
  'Dacia':         ['Logan', 'Sandero', 'Duster', 'Dokker', 'Lodgy', 'Spring'],
  'Renault':       ['Clio', 'Megane', 'Symbol', 'Kadjar', 'Captur', 'Koleos', 'Talisman', 'Scenic'],
  'Peugeot':       ['208', '301', '308', '2008', '3008', '5008', 'Partner', 'Expert'],
  'Citroën':       ['C3', 'C4', 'C5 Aircross', 'Berlingo', 'Jumpy'],
  'Volkswagen':    ['Polo', 'Golf', 'Passat', 'Tiguan', 'T-Roc', 'Touareg', 'Caddy', 'Transporter'],
  'Toyota':        ['Yaris', 'Corolla', 'Camry', 'C-HR', 'RAV4', 'Hilux', 'Land Cruiser', 'Prado'],
  'Hyundai':       ['i10', 'i20', 'i30', 'Tucson', 'Santa Fe', 'Elantra', 'Accent', 'Creta'],
  'Kia':           ['Picanto', 'Rio', 'Cerato', 'Sportage', 'Sorento', 'Stonic', 'Niro'],
  'Ford':          ['Fiesta', 'Focus', 'Mondeo', 'Kuga', 'EcoSport', 'Ranger', 'Transit'],
  'Fiat':          ['500', 'Punto', 'Tipo', 'Bravo', 'Doblo', 'Ducato'],
  'Seat':          ['Ibiza', 'Leon', 'Arona', 'Ateca', 'Tarraco'],
  'Skoda':         ['Fabia', 'Octavia', 'Superb', 'Karoq', 'Kodiaq'],
  'Opel':          ['Corsa', 'Astra', 'Insignia', 'Mokka', 'Grandland'],
  'Nissan':        ['Micra', 'Juke', 'Qashqai', 'X-Trail', 'Navara', 'Patrol'],
  'Mitsubishi':    ['Colt', 'Lancer', 'Outlander', 'Eclipse Cross', 'L200', 'Pajero'],
  'Suzuki':        ['Alto', 'Swift', 'Vitara', 'S-Cross', 'Jimny'],
  'Honda':         ['Jazz', 'Civic', 'Accord', 'CR-V', 'HR-V'],
  'Mazda':         ['Mazda2', 'Mazda3', 'Mazda6', 'CX-3', 'CX-5', 'CX-30'],
  'Mercedes-Benz': ['Classe A', 'Classe C', 'Classe E', 'Classe S', 'GLA', 'GLC', 'GLE', 'Sprinter', 'Vito'],
  'BMW':           ['Série 1', 'Série 3', 'Série 5', 'X1', 'X3', 'X5', 'X6'],
  'Audi':          ['A1', 'A3', 'A4', 'A6', 'Q2', 'Q3', 'Q5', 'Q7'],
  'Land Rover':    ['Defender', 'Discovery', 'Discovery Sport', 'Freelander', 'Range Rover', 'Range Rover Sport', 'Range Rover Evoque'],
  'Jeep':          ['Renegade', 'Compass', 'Cherokee', 'Grand Cherokee', 'Wrangler'],
  'Chevrolet':     ['Spark', 'Aveo', 'Cruze', 'Captiva', 'Trax'],
  'Chery':         ['Tiggo 4', 'Tiggo 7', 'Arrizo 5'],
  'BYD':           ['Atto 3', 'Han', 'Tang', 'Seal'],
  'MG':            ['MG3', 'MG5', 'MG6', 'ZS', 'HS', 'EHS'],
}

export const MAKES = Object.keys(CAR_CATALOGUE).sort()
export const YEARS = Array.from(
  { length: new Date().getFullYear() - 1999 },
  (_, i) => new Date().getFullYear() - i,
)
export const COLORS = ['Blanc', 'Noir', 'Gris', 'Argent', 'Rouge', 'Bleu', 'Vert', 'Beige', 'Marron', 'Orange', 'Jaune', 'Violet', 'Autre']
