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

const SOFT_RULE = { val: 'dotted', sz: '6', color: 'A6A6A6' }

export function prepareRows(rows) {
  return (rows || []).map((row) => {
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

function borderTag(edge) {
  return `<w:${edge} w:val="${SOFT_RULE.val}" w:sz="${SOFT_RULE.sz}" w:space="0" w:color="${SOFT_RULE.color}"/>`
}

function setCellEdge(cell, edge) {
  const tag = borderTag(edge)
  const existing = new RegExp(`<w:${edge}\\b[^/]*/>`)
  if (existing.test(cell)) return cell.replace(existing, tag)
  if (cell.includes('<w:tcBorders>')) return cell.replace('<w:tcBorders>', `<w:tcBorders>${tag}`)
  const block = `<w:tcBorders>${tag}</w:tcBorders>`
  const close = cell.indexOf('</w:tcPr>')
  if (close >= 0) return cell.slice(0, close) + block + cell.slice(close)
  const open = cell.indexOf('>') + 1
  return `${cell.slice(0, open)}<w:tcPr>${block}</w:tcPr>${cell.slice(open)}`
}

function paintEdge(rowXml, edge) {
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
    out += setCellEdge(rowXml.slice(starts[i], end), edge)
  }
  return out
}

function collectRows(xml) {
  const rows = []
  let from = 0
  while (from < xml.length) {
    const start = xml.indexOf('<w:tr', from)
    if (start < 0) break
    if (!isRowStart(xml, start)) {
      from = start + 4
      continue
    }
    const end = xml.indexOf('</w:tr>', start)
    if (end < 0) break
    rows.push({ start, end: end + '</w:tr>'.length })
    from = end + '</w:tr>'.length
  }
  return rows
}

function xmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function rowCells(rowXml) {
  const starts = []
  let from = 0
  while (from < rowXml.length) {
    const at = rowXml.indexOf('<w:tc', from)
    if (at < 0) break
    if (isCellStart(rowXml, at)) starts.push(at)
    from = at + 4
  }
  return starts.map((start, index) => {
    const end = index + 1 < starts.length ? starts[index + 1] : rowXml.length
    const cell = rowXml.slice(start, end)
    const width = Number((cell.match(/<w:tcW w:w="(\d+)"/) || [])[1] || 0)
    const span = Number((cell.match(/<w:gridSpan w:val="(\d+)"/) || [])[1] || 1)
    return { width, span }
  })
}

function shareWidths(total, weights) {
  const sum = weights.reduce((acc, weight) => acc + weight, 0) || weights.length
  let used = 0
  return weights.map((weight, index) => {
    if (index === weights.length - 1) return total - used
    const share = Math.round((total * weight) / sum)
    used += share
    return share
  })
}

function totalsParagraph(label, value) {
  const labelProps = '<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:b/><w:bCs/><w:sz w:val="16"/><w:szCs w:val="16"/><w:color w:val="334155"/>'
  const valueProps = '<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="16"/><w:szCs w:val="16"/><w:color w:val="334155"/>'
  return `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0"/><w:rPr>${labelProps}</w:rPr></w:pPr><w:r><w:rPr>${labelProps}</w:rPr><w:t>${xmlEscape(label)}:</w:t></w:r><w:r><w:rPr>${valueProps}</w:rPr><w:t xml:space="preserve"> ${xmlEscape(value)}</w:t></w:r></w:p>`
}

function totalsCell(textLabel, textValue, width) {
  return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/><w:vAlign w:val="center"/><w:tcMar><w:top w:w="80" w:type="dxa"/><w:left w:w="60" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:right w:w="60" w:type="dxa"/></w:tcMar></w:tcPr>${totalsParagraph(textLabel, textValue)}</w:tc>`
}

function totalsTable(width, items) {
  const weights = items.map(([label, value]) => label.length + String(value ?? '').length + 2)
  const widths = shareWidths(width, weights)
  const grid = widths.map((cellWidth) => `<w:gridCol w:w="${cellWidth}"/>`).join('')
  const cells = items.map(([label, value], index) => totalsCell(label, value, widths[index])).join('')
  const rule = `w:val="${SOFT_RULE.val}" w:sz="${SOFT_RULE.sz}" w:space="0" w:color="${SOFT_RULE.color}"`
  return `<w:tbl><w:tblPr><w:tblW w:w="${width}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV ${rule}/></w:tblBorders></w:tblPr><w:tblGrid>${grid}</w:tblGrid><w:tr><w:trPr><w:cantSplit/></w:trPr>${cells}</w:tr></w:tbl>`
}

function appendTotalsRow(xml, data) {
  const rows = collectRows(xml)
  const header = rows.findIndex((row) => xml.slice(row.start, row.end).includes('MARKS AND NUMBERS'))
  const footer = rows.findIndex((row) => xml.slice(row.start, row.end).includes('B/L TO BE RELEASED'))
  if (header < 0 || footer < 0 || footer <= header + 1) return xml
  const sample = xml.slice(rows[header + 1].start, rows[header + 1].end)
  const cells = rowCells(sample)
  const width = cells.reduce((sum, cell) => sum + cell.width, 0)
  const span = cells.reduce((sum, cell) => sum + cell.span, 0)
  if (!width || !span) return xml
  const items = [
    ['TOTAL CONTAINERS', data.total_containers],
    ['TOTAL BAGS', data.total_packages],
    ['TOTAL NET WEIGHT', data.total_net],
    ['TOTAL GROSS WEIGHT', data.total_gross],
    ['TOTAL MEASUREMENT', data.total_cbm],
  ]
  const table = totalsTable(width, items)
  const row = `<w:tr><w:trPr><w:cantSplit/></w:trPr><w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/><w:gridSpan w:val="${span}"/><w:tcMar><w:top w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tcMar><w:vAlign w:val="center"/></w:tcPr>${table}<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/></w:pPr></w:p></w:tc></w:tr>`
  const at = rows[footer].start
  return xml.slice(0, at) + row + xml.slice(at)
}

function softenCargoDividers(xml) {
  const rows = collectRows(xml)
  const header = rows.findIndex((row) => xml.slice(row.start, row.end).includes('MARKS AND NUMBERS'))
  const footer = rows.findIndex((row) => xml.slice(row.start, row.end).includes('B/L TO BE RELEASED'))
  if (header < 0 || footer < 0 || footer - header < 3) return xml
  const pieces = rows.map((row) => xml.slice(row.start, row.end))
  for (let i = header + 1; i < footer - 1; i += 1) {
    pieces[i] = paintEdge(pieces[i], 'bottom')
    pieces[i + 1] = paintEdge(pieces[i + 1], 'top')
  }
  let built = ''
  let cursor = 0
  for (let i = 0; i < rows.length; i += 1) {
    built += xml.slice(cursor, rows[i].start) + pieces[i]
    cursor = rows[i].end
  }
  return built + xml.slice(cursor)
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
  const rendered = doc.getZip()
  const renderedXml = rendered.file('word/document.xml')
  if (renderedXml) {
    const withTotals = appendTotalsRow(renderedXml.asText(), payload)
    rendered.file('word/document.xml', softenCargoDividers(withTotals))
  }
  return rendered.generate({
    type: 'uint8array',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
  })
}
