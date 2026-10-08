import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'

function isRowStart(xml, index) {
  return xml.startsWith('<w:tr>', index) || xml.startsWith('<w:tr ', index)
}

function isCellStart(xml, index) {
  return xml.startsWith('<w:tc>', index) || xml.startsWith('<w:tc ', index)
}

function paraId() {
  return Math.floor(Math.random() * 0xffffffff).toString(16).toUpperCase().padStart(8, '0')
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

function runXml(rPr, tag) {
  const props = (rPr || '').replace(/<w:b\/>|<w:bCs\/>/g, '')
  return `<w:r>${props}<w:t>${tag}</w:t></w:r>`
}

function fillEmptyParagraph(cellXml, tag) {
  const end = cellXml.indexOf('</w:p>')
  if (end < 0) return cellXml
  const rPr = (cellXml.match(/<w:rPr>[\s\S]*?<\/w:rPr>/) || [''])[0]
  return cellXml.slice(0, end) + runXml(rPr, tag) + cellXml.slice(end)
}

function appendParagraph(cellXml, tag) {
  const end = cellXml.lastIndexOf('</w:p>')
  if (end < 0) return fillEmptyParagraph(cellXml, tag)
  const pPr = (cellXml.match(/<w:pPr>[\s\S]*?<\/w:pPr>/) || [''])[0]
  let rPr = (pPr.match(/<w:rPr>[\s\S]*?<\/w:rPr>/) || [''])[0]
  rPr = rPr
    .replace(/<w:color[^/]*\/>/g, '')
    .replace(/<w:sz w:val="\d+"\/>/, '<w:sz w:val="20"/>')
    .replace(/<w:szCs w:val="\d+"\/>/, '<w:szCs w:val="20"/>')
  const paragraph = `<w:p w14:paraId="${paraId()}" w14:textId="77777777">${pPr}${runXml(rPr, tag)}</w:p>`
  return cellXml.slice(0, end + '</w:p>'.length) + paragraph + cellXml.slice(end + '</w:p>'.length)
}

function cellText(cellXml) {
  return cellXml.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

function mapCells(rowXml, tagsByIndex) {
  const starts = []
  let from = 0
  while (from < rowXml.length) {
    const at = rowXml.indexOf('<w:tc', from)
    if (at < 0) break
    if (isCellStart(rowXml, at)) starts.push(at)
    from = at + 4
  }
  if (!starts.length) return rowXml
  let out = rowXml.slice(0, starts[0])
  for (let i = 0; i < starts.length; i += 1) {
    const end = i + 1 < starts.length ? starts[i + 1] : rowXml.length
    let cell = rowXml.slice(starts[i], end)
    const tag = tagsByIndex[i]
    if (tag) cell = cellText(cell) ? appendParagraph(cell, tag) : fillEmptyParagraph(cell, tag)
    out += cell
  }
  return out
}

function rowAfter(xml, label) {
  const at = xml.indexOf(label)
  if (at < 0) throw new Error(`La plantilla no tiene ${label}`)
  const after = xml.indexOf('</w:tr>', at) + '</w:tr>'.length
  let start = xml.indexOf('<w:tr', after)
  while (start >= 0 && !isRowStart(xml, start)) start = xml.indexOf('<w:tr', start + 4)
  if (start < 0) throw new Error(`No hay fila de valores para ${label}`)
  const end = xml.indexOf('</w:tr>', start) + '</w:tr>'.length
  return { start, end }
}

function fillRowAfter(xml, label, tagsByIndex, { dropHeight = false } = {}) {
  const span = rowAfter(xml, label)
  let row = xml.slice(span.start, span.end)
  if (dropHeight) row = row.replace(/<w:trHeight[^/]*\/>/, '')
  row = mapCells(row, tagsByIndex)
  return xml.slice(0, span.start) + row + xml.slice(span.end)
}

function fillBelowMerge(xml, label, tag) {
  const at = xml.indexOf(label)
  if (at < 0) throw new Error(`La plantilla no tiene ${label}`)
  let after = xml.indexOf('</w:tr>', at) + '</w:tr>'.length
  for (let i = 0; i < 6; i += 1) {
    let start = xml.indexOf('<w:tr', after)
    while (start >= 0 && !isRowStart(xml, start)) start = xml.indexOf('<w:tr', start + 4)
    if (start < 0) break
    const end = xml.indexOf('</w:tr>', start) + '</w:tr>'.length
    const row = xml.slice(start, end)
    const firstCellEnd = row.indexOf('</w:tc>')
    const firstCell = row.slice(0, firstCellEnd)
    const continued = firstCell.includes('<w:vMerge/>') || firstCell.includes('<w:vMerge />')
    if (!continued) {
      const filled = mapCells(row, { 0: tag })
      return xml.slice(0, start) + filled + xml.slice(end)
    }
    after = end
  }
  throw new Error(`No hay celda de valor para ${label}`)
}

function placeFields(xml) {
  let out = fillRowAfter(xml, 'SHIPPER/EXPORT', {
    0: '[[shipper]]',
    1: '[[booking_number]]',
  })
  out = fillBelowMerge(out, 'To Order of Shipper', '[[consignee]]')
  out = fillRowAfter(out, 'NOTIFY PARTY', {
    0: '[[notify_party]]',
    1: '[[second_notify]]',
  })
  out = fillRowAfter(out, 'VESSEL', {
    0: '[[vessel]]',
    1: '[[port_of_loading]]',
  })
  out = fillRowAfter(out, 'PORT OF DISCHARGE', {
    0: '[[port_of_discharge]]',
  })
  out = fillRowAfter(out, 'MARKS AND NUMBERS', {
    0: '[[#rows]][[marks_block]]',
    1: '[[packages]]',
    2: '[[description_block]]',
    3: '[[gross_weight]]',
    4: '[[measurements]][[/rows]]',
  }, { dropHeight: true })
  return out
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
  zip.file('word/document.xml', placeFields(file.asText()))

  const payload = normalize({
    ...data,
    notify_party: String(data.notify_party || '').trim(),
    second_notify: String(data.second_notify || '').trim(),
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
