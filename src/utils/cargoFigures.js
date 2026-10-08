import { formatAmount, formatWeight, parseAmount } from './amount.js'

const NUM = '(\\d[\\d.,]*\\d|\\d)'
const UNIT = '(?:\\(?\\s*(?:kgs?|cbm|m3|m³)\\.?\\s*\\)?\\s*)?'
const KG_INLINE = '(?:\\(?[ \\t]*kgs?\\.?[ \\t]*\\)?[ \\t]*)?'
const END = '(?![a-z])'

// Cifra antes de la etiqueta, en la misma línea: "25,047.00 NW", "21,600 KGS NET", "58 CBM".
const after = (label) => new RegExp(`${NUM}[ \\t]*${KG_INLINE}(?:${label})${END}`, 'gi')
// Etiqueta antes de la cifra: "NET WEIGHT: 25,047.00 KG", "PESO BRUTO (KG): 4.118,40".
const before = (label) => new RegExp(`(?:${label})${END}\\s*(?:total)?\\s*${UNIT}:?\\s*${UNIT}${NUM}`, 'gi')

const PACKAGES = after('bags|sacks|sacos|cajas|boxes|cartons|packages|pkgs|bultos|paquetes|pallets|bales|drums')

const FIELDS = {
  netWeight: {
    after: after('n\\.?\\s?w\\.?|kn|net|neto'),
    before: before('net\\s*(?:weight|wt\\.?)|peso\\s+neto|n\\.\\s?w\\.'),
  },
  grossWeight: {
    after: after('g\\.?\\s?w\\.?|kb|gross|bruto'),
    before: before('gross\\s*(?:weight|wt\\.?)|peso\\s+bruto|g\\.\\s?w\\.'),
  },
  measurements: {
    after: after('cbm|m3|m³|cu\\.?\\s?m'),
    before: before('measurements?|volumen|volume|cbm'),
  },
}

function matches(text, pattern, numberAt) {
  return [...text.matchAll(pattern)]
    .map((match) => ({ at: numberAt(match), n: parseAmount(match[1]) }))
    .filter((found) => found.n != null)
}

const atStart = (match) => match.index
const atEnd = (match) => match.index + match[0].length - match[1].length

// Una cifra con etiqueta delante ("PESO BRUTO: 25.100,50 N.W. 10") ya tiene dueño,
// así que no se vuelve a leer como la cifra de la etiqueta que le sigue.
function readFields(text) {
  const labelled = Object.fromEntries(
    Object.entries(FIELDS).map(([field, p]) => [field, matches(text, p.before, atEnd)]),
  )
  const claimed = new Set(Object.values(labelled).flat().map((found) => found.at))
  return Object.fromEntries(
    Object.entries(FIELDS).map(([field, p]) => {
      const trailing = matches(text, p.after, atStart).filter((found) => !claimed.has(found.at))
      const all = [...labelled[field], ...trailing].sort((a, b) => a.at - b.at)
      return [field, all.map((found) => found.n)]
    }),
  )
}

const sum = (values) => values.reduce((acc, n) => acc + n, 0)

// Una descripción con varios productos ("352 PACKAGES ... NET WEIGHT 3.991,68",
// "1056 PACKAGES ... NET WEIGHT 11.975,04") se suma; con un solo producto se toma
// el mayor, porque suele traer el peso por saco y el total ("69.00 NW ... 25,047.00 NW").
export function readCargoFigures(text) {
  const raw = String(text || '')
  const packages = matches(raw, PACKAGES, atStart).map((found) => found.n)
  const { netWeight, grossWeight, measurements } = readFields(raw)
  const several = packages.length > 1
  const pick = (values) => {
    if (!values.length) return null
    return several && values.length === packages.length ? sum(values) : Math.max(...values)
  }
  return {
    packages: several ? sum(packages) : packages[0] ?? null,
    netWeight: pick(netWeight),
    grossWeight: pick(grossWeight),
    measurements: pick(measurements),
  }
}

export function cargoFieldsFromDescription(text) {
  const figures = readCargoFigures(text)
  const show = (n, format) => (n == null ? '' : format(n))
  return {
    packages: show(figures.packages, formatAmount),
    netWeight: show(figures.netWeight, formatWeight),
    grossWeight: show(figures.grossWeight, formatWeight),
    measurements: show(figures.measurements, formatAmount),
  }
}
