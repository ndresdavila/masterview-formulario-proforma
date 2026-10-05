import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'

function isRowStart(xml, index) {
  return xml.startsWith('<w:tr>', index) || xml.startsWith('<w:tr ', index)
}

function takeRow(xml, marker) {
  const at = xml.indexOf(marker)
  if (at < 0) throw new Error(`La plantilla no tiene ${marker}`)
  let start = xml.lastIndexOf('<w:tr', at)
  while (start >= 0 && !isRowStart(xml, start)) {
    start = xml.lastIndexOf('<w:tr', start - 1)
  }
  if (start < 0) throw new Error(`No se encontró la fila de ${marker}`)
  const end = xml.indexOf('</w:tr>', at) + '</w:tr>'.length
  return { start, end }
}

function removeLoopRows(xml) {
  const spans = [takeRow(xml, '{%tr for row in rows %}'), takeRow(xml, '{%tr endfor %}')]
    .sort((a, b) => b.start - a.start)
  let out = xml
  for (const span of spans) {
    out = out.slice(0, span.start) + out.slice(span.end)
  }
  return out
    .replace('[[row.marks_block]]', '[[#rows]][[marks_block]]')
    .replace('[[row.packages]]', '[[packages]]')
    .replace('[[row.description_block]]', '[[description_block]]')
    .replace('[[row.gross_weight]]', '[[gross_weight]]')
    .replace('[[row.measurements]]', '[[/rows]][[measurements]]')
}

function glue(left, right) {
  const a = String(left || '').replace(/\s+$/, '')
  const b = String(right || '').replace(/^\s+/, '')
  if (!a) return b
  if (!b) return a
  return `${a}\n\u00A0\n${b}`
}

export function prepareRows(rows) {
  const prepared = (rows || []).map((row) => {
    const marks = [row.marks_numbers, row.container_numbers].filter(Boolean).join('\n')
    return {
      ...row,
      marks_block: row.marks_block || marks,
      description_block: row.description_block ?? row.description ?? '',
      packages: row.packages ?? '',
      gross_weight: row.gross_weight ?? '',
      measurements: row.measurements ?? '',
    }
  })
  if (prepared.length < 2) return prepared
  const last = prepared[prepared.length - 1]
  const totalsOnly = !String(last.packages).trim() && !String(last.gross_weight).trim() && !String(last.measurements).trim()
  if (!totalsOnly) return prepared
  const prev = { ...prepared[prepared.length - 2] }
  prev.marks_block = glue(prev.marks_block, last.marks_block)
  prev.description_block = glue(prev.description_block, last.description_block)
  return [...prepared.slice(0, -2), prev]
}

function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalize(item)]))
  }
  if (typeof value === 'string') return value.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  if (value == null) return ''
  return value
}

export function fillTemplate(buffer, data) {
  const zip = new PizZip(buffer)
  const file = zip.file('word/document.xml')
  if (!file) throw new Error('La plantilla no tiene document.xml')
  zip.file('word/document.xml', removeLoopRows(file.asText()))

  const payload = normalize({ ...data, rows: prepareRows(data.rows) })
  const doc = new Docxtemplater(zip, {
    delimiters: { start: '[[', end: ']]' },
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => '',
  })
  doc.render(payload)
  return doc.getZip().generate({
    type: 'uint8array',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
  })
}
