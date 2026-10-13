import { parseAmount } from './amount.js'
import { GENERIC_WORDS, PACKAGE_KINDS, PALLET_WORDS } from './packageWords.js'

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

function labeledWeight(text, kind) {
  const pattern = new RegExp(`(?:total\\s+)?${kind}\\s+weight\\s*:?\\s*([\\d.,]+)`, 'gi')
  return maxAmount(text, pattern)
}

// Bultos de un tipo: "TOTAL BAGS: 1450" o, si no está, la mayor cifra junto a la palabra
// (el resumen puede repetir los bultos de cada contenedor además del total).
function packagesOfKind(text, words) {
  return firstAmount(text, new RegExp(`total\\s+(?:${words})\\b\\s*:?\\s*([\\d.,]+)`, 'i'))
    ?? maxAmount(text, new RegExp(`([\\d.,]+)\\s*(?:${words})\\b`, 'gi'))
}

// Con varios tipos ("1000 BAGS" y "500 BOXES") el total es la suma de cada tipo, salvo que el
// resumen ya diga el total ("TOTAL PACKAGES: 1500" o "1500 PACKAGES").
function readPackages(text) {
  const total = firstAmount(text, new RegExp(`total\\s+(?:${GENERIC_WORDS})\\b\\s*:?\\s*([\\d.,]+)`, 'i'))
  if (total != null) return total
  const kinds = Object.values(PACKAGE_KINDS)
    .map((words) => packagesOfKind(text, words))
    .filter((n) => n != null)
  const typed = kinds.length ? kinds.reduce((a, b) => a + b, 0) : packagesOfKind(text, PALLET_WORDS)
  const generic = packagesOfKind(text, GENERIC_WORDS)
  if (typed == null) return generic
  return generic == null ? typed : Math.max(typed, generic)
}

export function readSummaryFigures(text) {
  const raw = String(text || '')
  if (!raw.trim()) return { packages: null, net: null, gross: null }

  const packages = readPackages(raw)

  const net = labeledWeight(raw, 'net')
    ?? firstAmount(raw, /peso\s+neto(?:\s+total)?\s*:?\s*([\d.,]+)/i)
    ?? maxAmount(raw, /([\d.,]+)\s*KN\b/gi)

  const gross = labeledWeight(raw, 'gross')
    ?? firstAmount(raw, /peso\s+bruto(?:\s+total)?\s*:?\s*([\d.,]+)/i)
    ?? maxAmount(raw, /([\d.,]+)\s*KB\b/gi)

  return { packages, net, gross }
}

export function sameAmount(found, expected) {
  if (found == null || expected == null) return false
  return Math.abs(found - expected) < 0.02
}
