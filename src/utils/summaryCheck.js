import { parseAmount } from './amount.js'

function firstAmount(text, pattern) {
  const match = text.match(pattern)
  return match ? parseAmount(match[1]) : null
}

function maxAmount(text, pattern) {
  const values = [...text.matchAll(pattern)]
    .map((match) => parseAmount(match[1]))
    .filter((n) => n != null)
  return values.length ? Math.max(...values) : null
}

// La unidad puede ir o no, también entre paréntesis: "NET WEIGHT (KG): 50,025.00".
const UNIT = String.raw`(?:\(\s*kgs?\.?\s*\)|kgs?\.?)?`

function labeledWeight(text, kind) {
  const pattern = new RegExp(String.raw`(?:total\s+)?${kind}\s+weight\s*${UNIT}\s*:?\s*([\d.,]+)`, 'gi')
  return maxAmount(text, pattern)
}

const spanishWeight = (word) => new RegExp(String.raw`peso\s+${word}(?:\s+total)?\s*${UNIT}\s*:?\s*([\d.,]+)`, 'i')

export function readSummaryFigures(text) {
  const raw = String(text || '')
  if (!raw.trim()) return { packages: null, net: null, gross: null }

  const packages = firstAmount(raw, /total\s+(?:bags?|cajas?|box(?:es)?|packages?|bultos?|paquetes?)\s*:?\s*([\d.,]+)/i)
    ?? maxAmount(raw, /([\d.,]+)\s*(?:bags?|cajas?|box(?:es)?|packages?|bultos?|paquetes?)\b/gi)

  const net = labeledWeight(raw, 'net')
    ?? firstAmount(raw, spanishWeight('neto'))
    ?? maxAmount(raw, /([\d.,]+)\s*KN\b/gi)

  const gross = labeledWeight(raw, 'gross')
    ?? firstAmount(raw, spanishWeight('bruto'))
    ?? maxAmount(raw, /([\d.,]+)\s*KB\b/gi)

  return { packages, net, gross }
}

export function sameAmount(found, expected) {
  if (found == null || expected == null) return false
  return Math.abs(found - expected) < 0.02
}

// Con un solo contenedor el resumen no tiene que repetir los totales: lo que no
// aparezca en el texto se toma de ese contenedor.
export function summaryFiguresFor(text, rows) {
  const found = readSummaryFigures(text)
  if (rows.length !== 1) return { ...found, fromContainer: {} }
  const [only] = rows
  const fromContainer = {}
  const fill = (key, value) => {
    if (found[key] != null) return found[key]
    const n = parseAmount(value)
    if (n != null) fromContainer[key] = true
    return n
  }
  return {
    packages: fill('packages', only.packages),
    net: fill('net', only.netWeight),
    gross: fill('gross', only.grossWeight),
    fromContainer,
  }
}
