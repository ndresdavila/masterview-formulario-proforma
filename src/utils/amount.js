// Acepta 50318.00, 50,318.00, 24978,00 y 32.575,00.
export function parseAmount(raw) {
  const s = String(raw ?? '').trim().replace(/\s/g, '')
  if (!s) return null
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  let norm = s
  if (lastComma >= 0 && lastDot >= 0) {
    norm = lastComma > lastDot
      ? s.replace(/\./g, '').replace(',', '.')
      : s.replace(/,/g, '')
  } else if (lastComma >= 0) {
    const frac = s.slice(lastComma + 1)
    const head = s.slice(0, lastComma)
    norm = frac.length === 3 && !head.includes(',') && head.length <= 3
      ? s.replace(/,/g, '')
      : s.replace(/\./g, '').replace(',', '.')
  } else if (lastDot >= 0) {
    const frac = s.slice(lastDot + 1)
    const head = s.slice(0, lastDot)
    if (frac.length === 3 && !head.includes('.') && head.length <= 3) norm = s.replace(/\./g, '')
  }
  const n = Number(norm)
  return Number.isFinite(n) ? n : null
}

export function formatAmount(n) {
  if (n == null || !Number.isFinite(n)) return ''
  return n.toLocaleString('en-US', {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  })
}
