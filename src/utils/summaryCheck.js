import { parseAmount } from './amount'

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

export function readSummaryFigures(text) {
  const raw = String(text || '')
  if (!raw.trim()) return { packages: null, net: null, gross: null }

  const packages = firstAmount(raw, /total\s+(?:bags|cajas|boxes|packages|bultos|paquetes)\s*:?\s*([\d.,]+)/i)
    ?? maxAmount(raw, /([\d.,]+)\s*(?:bags|cajas|boxes|packages|bultos|paquetes)\b/gi)

  const net = firstAmount(raw, /total\s+net\s+weight\s*:?\s*([\d.,]+)/i)
    ?? firstAmount(raw, /peso\s+neto(?:\s+total)?\s*:?\s*([\d.,]+)/i)
    ?? maxAmount(raw, /([\d.,]+)\s*KN\b/gi)

  const gross = firstAmount(raw, /total\s+gross\s+weight\s*:?\s*([\d.,]+)/i)
    ?? firstAmount(raw, /peso\s+bruto(?:\s+total)?\s*:?\s*([\d.,]+)/i)
    ?? maxAmount(raw, /([\d.,]+)\s*KB\b/gi)

  return { packages, net, gross }
}

export function sameAmount(found, expected) {
  if (found == null || expected == null) return false
  return Math.abs(found - expected) < 0.02
}
