const COUNT_WORD = /(?:bags|cajas|boxes|packages|bultos|paquetes)/i

function hasPackageCount(text) {
  return new RegExp(`\\d[\\d.,]*\\s+${COUNT_WORD.source}\\b`, 'i').test(text)
}

function countWord(description) {
  const found = description.match(new RegExp(`\\b(${COUNT_WORD.source})\\b`, 'i'))
  return (found?.[1] || 'BAGS').toUpperCase()
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
  const lines = [goods]
  const net = String(row.netWeight || '').trim()
  const gross = String(row.grossWeight || '').trim()
  if (net) lines.push(`NET WEIGHT: ${net}`)
  if (gross) lines.push(`GROSS WEIGHT: ${gross}`)
  return lines.filter(Boolean).join('\n')
}

export function notifyText(notify, second) {
  const main = String(notify || '').trim()
  const extra = String(second || '').trim()
  if (!extra) return main
  return [main, `Second Notify:\n${extra}`].filter(Boolean).join('\n\n')
}

export function vesselLine(vessel, voyage) {
  return [String(vessel || '').trim(), String(voyage || '').trim()].filter(Boolean).join(' ')
}

function withoutLeadingCount(summary) {
  return String(summary || '')
    .split(/\r?\n/)
    .map((line) => line.replace(new RegExp(`^\\s*\\d[\\d.,]*\\s+(?=${COUNT_WORD.source}\\b)`, 'i'), ''))
    .join('\n')
    .trim()
}

export function summaryDescription(summary, sums) {
  const head = [
    sums?.packages ? `TOTAL BAGS: ${sums.packages}` : '',
    sums?.net ? `TOTAL NET WEIGHT: ${sums.net}` : '',
    sums?.gross ? `TOTAL GROSS WEIGHT: ${sums.gross}` : '',
  ].filter(Boolean)
  const body = withoutLeadingCount(summary)
  return [...head, body].filter(Boolean).join('\n')
}
