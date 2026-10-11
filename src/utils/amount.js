// Cifra con un solo tipo de separador (solo comas o solo puntos):
// - "25,047" o "1,234,567": grupos de 3 → separan miles.
// - "24978,00" o "25,228,50": el último grupo no es de 3 → es el decimal y los anteriores, miles.
// Devuelve el número con punto decimal, o null si los grupos no tienen sentido ("1,23,4").
function oneSeparator(s, sep) {
  const groups = s.split(sep)
  const first = groups[0]
  const last = groups[groups.length - 1]
  if (groups.length === 2) {
    return last.length === 3 && first.length >= 1 && first.length <= 3 ? first + last : `${first}.${last}`
  }
  const middle = groups.slice(1, -1)
  if (!first.length || first.length > 3 || !middle.every((g) => g.length === 3)) return null
  return last.length === 3 ? groups.join('') : `${[first, ...middle].join('')}.${last}`
}

// Acepta 50318.00, 50,318.00, 24978,00, 32.575,00, 1,234,567 y 25,228,50 (dos comas, la última decimal).
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
    norm = oneSeparator(s, ',')
  } else if (lastDot >= 0) {
    norm = oneSeparator(s, '.')
  }
  if (norm == null) return null
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

// Los pesos siempre van con dos decimales: 24978 → 24,978.00. Lo que no se puede leer se deja igual.
export function formatWeight(raw) {
  const n = typeof raw === 'number' ? raw : parseAmount(raw)
  if (n == null || !Number.isFinite(n)) return String(raw ?? '').trim()
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
