import { readCargoFigures } from './cargoFigures.js'
import { formatWeight } from './amount.js'

const COUNT_WORD =/(?:bags|cajas|boxes|packages|bultos|paquetes)/i

function hasPackageCount(text) {
  return new RegExp(`\\d[\\d.,]*\\s+${COUNT_WORD.source}\\b`, 'i').test(text)
}

function countWord(description) {
  const found = description.match(new RegExp(`\\b(${COUNT_WORD.source})\\b`, 'i'))
  return (found?.[1] || 'BAGS').toUpperCase()
}

export function sortByContainer(rows) {
  const key = (row) => String(row?.container || '').trim()
  return [...rows].sort((a, b) => key(a).localeCompare(key(b), 'en', { numeric: true, sensitivity: 'base' }))
}

export function containerMarks(row) {
  const lines = []
  if (String(row.container || '').trim()) lines.push('CONTAINER:', String(row.container).trim())
  if (String(row.seals || '').trim()) lines.push('SEALS:', String(row.seals).trim())
  return lines.join('\n')
}

export function containerDescription(row) {
  const description = String(row.description || '').trim()
  const packages = String(row.packages || '').trim()
  const goods = hasPackageCount(description) || !packages
    ? description
    : `${packages} ${countWord(description)}${description ? `\n${description}` : ''}`
  return [goods, ...weightLines(row)].filter(Boolean).join('\n')
}

// Los pesos que ya vienen escritos en la descripción no se repiten debajo.
export function weightLines(row) {
  const written = readCargoFigures(row.description)
  const net = formatWeight(row.netWeight)
  const gross = formatWeight(row.grossWeight)
  const lines = []
  if (net && written.netWeight == null) lines.push(`NET WEIGHT: ${net}`)
  if (gross && written.grossWeight == null) lines.push(`GROSS WEIGHT: ${gross}`)
  return lines
}

export function notifyText(notify, second) {
  const main = String(notify || '').trim()
  const extra = String(second || '').trim()
  if (!extra) return main
  const gap = '\n\u00A0\n'
  return [main, `Second Notify:\n${extra}`].filter(Boolean).join(gap)
}

export function vesselLine(vessel, voyage) {
  return [String(vessel || '').trim(), String(voyage || '').trim()].filter(Boolean).join(' ')
}

export function summaryDescription(summary) {
  return String(summary || '').trim()
}
