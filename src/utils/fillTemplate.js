import PizZip from 'pizzip'

function escapeXml(value) {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function lookup(data, key) {
  const parts = String(key).split('.')
  let current = data
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return ''
    current = current[part]
  }
  return current ?? ''
}

function applyPlaceholders(xml, data) {
  return xml.replace(/\[\[([a-zA-Z0-9_.]+)\]\]/g, (_, key) => escapeXml(lookup(data, key)))
}

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
  return { start, end, xml: xml.slice(start, end) }
}

function uniqueParagraphIds(xml) {
  let seq = 0xa1000000
  const next = () => (seq++).toString(16).toUpperCase()
  return xml
    .replace(/w14:paraId="[^"]+"/g, () => `w14:paraId="${next()}"`)
    .replace(/w14:textId="[^"]+"/g, () => `w14:textId="${next()}"`)
}

function repeatRows(xml, rows) {
  const dataRow = takeRow(xml, '[[row.marks_block]]')
  const open = takeRow(xml, '{%tr for row in rows %}')
  const close = takeRow(xml, '{%tr endfor %}')
  const filled = (rows || []).map((row) => applyPlaceholders(dataRow.xml, { row })).join('')
  const spans = [
    { ...open, replacement: '' },
    { ...dataRow, replacement: filled },
    { ...close, replacement: '' },
  ].sort((a, b) => b.start - a.start)
  let out = xml
  for (const span of spans) {
    out = out.slice(0, span.start) + span.replacement + out.slice(span.end)
  }
  return out
}

function paragraphWithLine(sample, escapedLine) {
  const open = sample.match(/^<w:p(?: [^>]*)?>/)?.[0] || '<w:p>'
  const pPr = sample.match(/<w:pPr>[\s\S]*?<\/w:pPr>/)?.[0] || ''
  const rPr = sample.match(/<w:rPr>[\s\S]*?<\/w:rPr>/)?.[0] || ''
  return `${open}${pPr}<w:r>${rPr}<w:t xml:space="preserve">${escapedLine}</w:t></w:r></w:p>`
}

function expandNewlines(xml) {
  return xml.replace(/<w:p(?: [^>]*)?>[\s\S]*?<\/w:p>/g, (para) => {
    const parts = [...para.matchAll(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g)]
    const joined = parts.map((match) => match[1]).join('')
    if (!joined.includes('\n')) return para
    return joined.split('\n').map((line) => paragraphWithLine(para, line)).join('')
  })
}

export function prepareRows(rows) {
  return (rows || []).map((row) => {
    const marks = [row.marks_numbers, row.container_numbers].filter(Boolean).join('\n')
    return {
      ...row,
      marks_block: row.marks_block || marks,
      description_block: row.description_block || row.description || '',
    }
  })
}

export function fillTemplate(buffer, data) {
  const zip = new PizZip(buffer)
  const file = zip.file('word/document.xml')
  if (!file) throw new Error('La plantilla no tiene document.xml')
  let xml = file.asText()
  const payload = { ...data, rows: prepareRows(data.rows) }
  xml = repeatRows(xml, payload.rows)
  xml = applyPlaceholders(xml, payload)
  xml = expandNewlines(xml)
  xml = uniqueParagraphIds(xml)
  zip.file('word/document.xml', xml)
  return zip.generate({
    type: 'uint8array',
    compression: 'DEFLATE',
  })
}
