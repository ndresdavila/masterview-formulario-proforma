// Tipos de bulto que se pueden mezclar en una misma proforma ("1000 BAGS" y "500 BOXES").
// Los sinónimos cuentan como el mismo tipo.
export const PACKAGE_KINDS = {
  bag: 'bags?|sacks?|sacos?',
  box: 'box(?:es)?|cajas?',
  carton: 'cartons?',
  bale: 'bales?',
  drum: 'drums?',
}
// Los pallets suelen llevar encima los otros bultos ("1450 BAGS ON 29 PALLETS"):
// solo cuentan si no hay otro tipo.
export const PALLET_WORDS = 'pallets?'
// PACKAGES/BULTOS nombran el total de todos los tipos.
export const GENERIC_WORDS = 'packages?|pkgs?|bultos?|paquetes?'

const ALL_WORDS = [...Object.values(PACKAGE_KINDS), PALLET_WORDS, GENERIC_WORDS].join('|')
const COUNT_WITH_WORD = new RegExp(`\\d[\\d.,]*\\s+(${ALL_WORDS})\\b`, 'gi')

function packageKind(word) {
  const lower = word.toLowerCase()
  return Object.keys(PACKAGE_KINDS).find((key) => new RegExp(`^(?:${PACKAGE_KINDS[key]})$`).test(lower))
}

// La palabra de la columna de bultos ("1450 / BAGS") tal como está escrita en la primera
// descripción que la tenga. Si las descripciones mezclan tipos (BAGS y BOXES) va PACKAGES.
export function packageUnit(rows) {
  const words = rows.flatMap((row) => [...String(row.description || '').matchAll(COUNT_WITH_WORD)].map((m) => m[1]))
  const typed = words.filter(packageKind)
  const kinds = new Set(typed.map(packageKind))
  if (kinds.size > 1) return 'PACKAGES'
  const word = typed[0] ?? words[0]
  return word ? word.toUpperCase() : null
}
