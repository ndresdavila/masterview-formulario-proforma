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

function paraId() {
  return Math.floor(Math.random() * 0xffffffff).toString(16).toUpperCase().padStart(8, '0')
}

function addSecondNotify(xml, second) {
  if (!String(second || '').trim()) return xml
  const at = xml.indexOf('[[notify_party]]')
  if (at < 0) return xml
  const pEnd = xml.indexOf('</w:p>', at) + '</w:p>'.length
  const label = `<w:p w14:paraId="${paraId()}" w14:textId="77777777" w:rsidR="00D16C2C" w:rsidRDefault="00D16C2C"><w:pPr><w:pStyle w:val="TableParagraph"/><w:pBdr><w:top w:val="single" w:sz="8" w:space="1" w:color="000080"/></w:pBdr><w:spacing w:before="120" w:line="194" w:lineRule="exact"/><w:ind w:left="25"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:b/><w:sz w:val="17"/><w:szCs w:val="17"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:b/><w:sz w:val="17"/><w:szCs w:val="17"/></w:rPr><w:t>Second Notify:</w:t></w:r></w:p>`
  const body = `<w:p w14:paraId="${paraId()}" w14:textId="77777777" w:rsidR="00D16C2C" w:rsidRDefault="00D16C2C" w:rsidP="00915A80"><w:pPr><w:pStyle w:val="TableParagraph"/><w:spacing w:before="8"/><w:ind w:left="25" w:right="918"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr><w:t>[[second_notify_body]]</w:t></w:r></w:p>`
  return xml.slice(0, pEnd) + label + body + xml.slice(pEnd)
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
  zip.file('word/document.xml', addSecondNotify(removeLoopRows(file.asText()), data.second_notify))

  const payload = normalize({
    ...data,
    notify_party: String(data.notify_party || '').split(/\n+\u00A0?\nSecond Notify:/)[0].trim(),
    second_notify_body: String(data.second_notify || '').trim(),
    rows: prepareRows(data.rows),
  })
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
