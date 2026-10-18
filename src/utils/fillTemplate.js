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
  const rPr = (pPr.match(/<w:rPr>[\s\S]*?<\/w:rPr>/) || [''])[0].replace(/<w:color[^/]*\/>/g, '')
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

// Espacio en blanco al pie de cada contenedor (una línea) para que no queden pegados.
const ROW_GAP = '<w:tcMar><w:bottom w:w="240" w:type="dxa"/></w:tcMar>'

function fillRowAfter(xml, label, tagsByIndex, { dropHeight = false, rowGap = false } = {}) {
  const span = rowAfter(xml, label)
  let row = xml.slice(span.start, span.end)
  // Sin alto fijo, y cada contenedor entero en una página: Word no parte la fila entre hojas.
  if (dropHeight) row = row.replace(/<w:trHeight[^/]*\/>/, '<w:cantSplit/>')
  if (rowGap) row = row.replace(/<\/w:tcPr>/g, `${ROW_GAP}</w:tcPr>`)
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

function borderTag(edge, clear = false) {
  if (clear) return `<w:${edge} w:val="nil"/>`
  return `<w:${edge} w:val="${SOFT_RULE.val}" w:sz="${SOFT_RULE.sz}" w:space="0" w:color="${SOFT_RULE.color}"/>`
}

function setCellEdge(cell, edge, clear = false) {
  const tag = borderTag(edge, clear)
  // Solo dentro de tcBorders: tcMar también tiene <w:bottom/> y no es un borde.
  const borders = cell.match(/<w:tcBorders>[\s\S]*?<\/w:tcBorders>/)
  if (borders) {
    const existing = new RegExp(`<w:${edge}\\b[^/]*/>`)
    const next = existing.test(borders[0])
      ? borders[0].replace(existing, tag)
      : borders[0].replace('<w:tcBorders>', `<w:tcBorders>${tag}`)
    return cell.replace(borders[0], next)
  }
  const block = `<w:tcBorders>${tag}</w:tcBorders>`
  const anchor = cell.match(/<w:gridSpan[^/]*\/>/) || cell.match(/<w:tcW[^/]*\/>/)
  if (anchor) {
    const at = cell.indexOf(anchor[0]) + anchor[0].length
    return cell.slice(0, at) + block + cell.slice(at)
  }
  const open = cell.indexOf('>') + 1
  return `${cell.slice(0, open)}<w:tcPr>${block}</w:tcPr>${cell.slice(open)}`
}

function directCellStarts(rowXml) {
  const starts = []
  let from = 0
  let tables = 0
  while (from < rowXml.length) {
    const cellAt = rowXml.indexOf('<w:tc', from)
    const openAt = rowXml.indexOf('<w:tbl>', from)
    const closeAt = rowXml.indexOf('</w:tbl>', from)
    const next = [cellAt, openAt, closeAt].filter((at) => at >= 0).sort((a, b) => a - b)[0]
    if (next == null) break
    if (next === openAt) {
      tables += 1
      from = openAt + 7
      continue
    }
    if (next === closeAt) {
      tables = Math.max(0, tables - 1)
      from = closeAt + 8
      continue
    }
    if (tables === 0 && isCellStart(rowXml, cellAt)) starts.push(cellAt)
    from = cellAt + 4
  }
  return starts
}

function paintEdge(rowXml, edge, clear = false) {
  const starts = directCellStarts(rowXml)
  if (!starts.length) return rowXml
  let out = rowXml.slice(0, starts[0])
  for (let i = 0; i < starts.length; i += 1) {
    const end = i + 1 < starts.length ? starts[i + 1] : rowXml.length
    out += setCellEdge(rowXml.slice(starts[i], end), edge, clear)
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

// Ancho aproximado de Arial en milésimas de em, para saber si los totales caben en una línea.
const BOLD_CAPS = { I: 278, J: 556, L: 611, T: 611, F: 611, Z: 611, E: 667, P: 667, S: 667, V: 667, X: 667, Y: 667, K: 722, A: 722, B: 722, C: 722, D: 722, H: 722, N: 722, R: 722, U: 722, G: 778, O: 778, Q: 778, M: 833, W: 944 }

function textEm(text, bold) {
  let width = 0
  for (const ch of String(text)) {
    if (/[0-9]/.test(ch)) width += 556
    else if (/[A-Z]/.test(ch)) width += bold ? (BOLD_CAPS[ch] || 722) : 667
    else if (ch === ':') width += 333
    else width += 278
  }
  return width / 1000
}

const TOTALS_PADDING = 60
const TOTALS_MAX_SIZE = 16
const TOTALS_MIN_SIZE = 9

function totalsParagraph(label, value, size) {
  const font = '<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>'
  const sizeProps = `<w:sz w:val="${size}"/><w:szCs w:val="${size}"/><w:color w:val="334155"/>`
  const labelProps = `${font}<w:b/><w:bCs/>${sizeProps}`
  const valueProps = `${font}${sizeProps}`
  return `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0"/><w:rPr>${labelProps}</w:rPr></w:pPr><w:r><w:rPr>${labelProps}</w:rPr><w:t>${xmlEscape(label)}:</w:t></w:r><w:r><w:rPr>${valueProps}</w:rPr><w:t xml:space="preserve">\u00A0${xmlEscape(value).replace(/ /g, '\u00A0')}</w:t></w:r></w:p>`
}

function totalsCell(textLabel, textValue, width, size) {
  return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/><w:noWrap/><w:tcMar><w:top w:w="80" w:type="dxa"/><w:left w:w="${TOTALS_PADDING}" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:right w:w="${TOTALS_PADDING}" w:type="dxa"/></w:tcMar><w:vAlign w:val="center"/></w:tcPr>${totalsParagraph(textLabel, textValue, size)}</w:tc>`
}

// Cada total va en una sola línea: el ancho de cada celda sigue el largo de su texto y, si
// todo no cabe a 8 pt, se baja la letra de esta fila hasta que quepa.
function totalsTable(width, items) {
  const ems = items.map(([label, value]) => textEm(`${label}:`, true) + textEm(` ${value ?? ''}`, false))
  const room = width - items.length * TOTALS_PADDING * 2
  // w:sz va en medios puntos y un punto son 20 twips; la medida ya es algo generosa.
  const fit = Math.floor(room / (ems.reduce((a, b) => a + b, 0) * 10))
  const size = Math.max(TOTALS_MIN_SIZE, Math.min(TOTALS_MAX_SIZE, fit))
  const widths = shareWidths(width, ems.map((em) => em * size * 10 + TOTALS_PADDING * 2))
  const grid = widths.map((cellWidth) => `<w:gridCol w:w="${cellWidth}"/>`).join('')
  const cells = items.map(([label, value], index) => totalsCell(label, value, widths[index], size)).join('')
  const rule = `w:val="${SOFT_RULE.val}" w:sz="${SOFT_RULE.sz}" w:space="0" w:color="${SOFT_RULE.color}"`
  return `<w:tbl><w:tblPr><w:tblW w:w="${width}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV ${rule}/></w:tblBorders></w:tblPr><w:tblGrid>${grid}</w:tblGrid><w:tr><w:trPr><w:cantSplit/></w:trPr>${cells}</w:tr></w:tbl>`
}

function withUnit(value, unit) {
  const text = String(value ?? '').trim()
  return text ? `${text} ${unit}` : ''
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
    ['TOTAL NET WEIGHT', withUnit(data.total_net, 'KG')],
    ['TOTAL GROSS WEIGHT', withUnit(data.total_gross, 'KG')],
    ['CBM', data.total_cbm],
  ]
  const table = totalsTable(width, items)
  const row = `<w:tr><w:trPr><w:cantSplit/></w:trPr><w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/><w:gridSpan w:val="${span}"/>${`<w:tcBorders>${borderTag('top')}</w:tcBorders>`}<w:tcMar><w:top w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tcMar><w:vAlign w:val="center"/></w:tcPr>${table}<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/></w:pPr></w:p></w:tc></w:tr>`
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
    const aboveTotals = pieces[i + 1].includes('TOTAL CONTAINERS')
    pieces[i] = paintEdge(pieces[i], 'bottom', aboveTotals)
    if (!aboveTotals) pieces[i + 1] = paintEdge(pieces[i + 1], 'top')
  }
  let built = ''
  let cursor = 0
  for (let i = 0; i < rows.length; i += 1) {
    built += xml.slice(cursor, rows[i].start) + pieces[i]
    cursor = rows[i].end
  }
  return built + xml.slice(cursor)
}

// La plantilla trae 0,42 cm arriba y 0,44 cm abajo: con varios contenedores la tabla
// llega al borde de la hoja. En twips (567 = 1 cm).
const PAGE_MARGIN = { top: 567, bottom: 851 }

// Word exige un párrafo después de la tabla. Con su alto normal, cuando la tabla llena la hoja
// ese párrafo vacío cae solo en una página en blanco; se deja de una línea mínima.
const TAIL_PARAGRAPH = '<w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/><w:rPr><w:sz w:val="2"/><w:szCs w:val="2"/></w:rPr></w:pPr>'

function pageMargins(xml) {
  const withMargins = xml.replace(/<w:pgMar\b[^>]*\/>/g, (tag) => tag
    .replace(/w:top="\d+"/, `w:top="${PAGE_MARGIN.top}"`)
    .replace(/w:bottom="\d+"/, `w:bottom="${PAGE_MARGIN.bottom}"`))
  return withMargins.replace(
    /(<\/w:tbl>\s*<w:p\b[^>]*>)(?:<w:pPr>[\s\S]*?<\/w:pPr>)?(<\/w:p>\s*<w:sectPr\b)/,
    `$1${TAIL_PARAGRAPH}$2`,
  )
}

// GROSS WEIGHT mide 936 twips y "25,228.50" se parte en dos líneas. La última columna de la
// cuadrícula (MEASUREMENT, que solo lleva números cortos) se divide en dos: la parte izquierda
// se suma a GROSS WEIGHT en las filas de carga y en las demás filas la celda abarca ambas,
// así el encabezado (BOOKING / BILL OF LADING) no se mueve.
const GROSS_WEIGHT_WIDTH = 1500

function rowBounds(rowXml) {
  let col = 0
  return directCellStarts(rowXml).map((start, index, starts) => {
    const end = index + 1 < starts.length ? starts[index + 1] : rowXml.length
    const span = Number((rowXml.slice(start, end).match(/<w:gridSpan w:val="(\d+)"/) || [])[1] || 1)
    col += span
    return { start, end, span, last: col }
  })
}

function setCellSpan(cellXml, span, width) {
  let cell = cellXml
  if (width != null) cell = cell.replace(/<w:tcW w:w="\d+"/, `<w:tcW w:w="${width}"`)
  if (/<w:gridSpan w:val="\d+"\/>/.test(cell)) return cell.replace(/<w:gridSpan w:val="\d+"\/>/, `<w:gridSpan w:val="${span}"/>`)
  return cell.replace(/(<w:tcW[^>]*\/>)/, `$1<w:gridSpan w:val="${span}"/>`)
}

function widenGrossWeight(xml) {
  const grid = xml.match(/<w:tblGrid>([\s\S]*?)<\/w:tblGrid>/)
  if (!grid) return xml
  const cols = [...grid[1].matchAll(/<w:gridCol w:w="(\d+)"\/>/g)].map((m) => Number(m[1]))
  const total = cols.length
  const grossCol = total - 1
  const extra = GROSS_WEIGHT_WIDTH - cols[grossCol - 1]
  if (total < 3 || extra <= 0 || cols[total - 1] - extra < 1200) return xml

  const newGrid = [...cols.slice(0, -1), extra, cols[total - 1] - extra]
    .map((w) => `<w:gridCol w:w="${w}"/>`).join('')
  let out = xml.replace(grid[0], `<w:tblGrid>${newGrid}</w:tblGrid>`)
  // Con autoajuste Word redistribuye las demás columnas al ver la columna nueva; fijas, se
  // respetan los anchos de la plantilla.
  out = out.replace(/<w:tblPr>([\s\S]*?)<\/w:tblPr>/, (tblPr, inner) => (
    /<w:tblLayout\b/.test(inner) ? tblPr : `<w:tblPr>${inner.replace(/(<w:tblW[^>]*\/>)/, '$1<w:tblLayout w:type="fixed"/>')}</w:tblPr>`
  ))

  const rows = collectRows(out)
  let built = ''
  let cursor = 0
  for (const { start, end } of rows) {
    const row = out.slice(start, end)
    const cells = rowBounds(row)
    const lastCell = cells[cells.length - 1]
    const grossCell = cells.find((c) => c.last === grossCol && c.span === 1 && cells.some((p) => p.last === grossCol - 1))
    let next = row
    if (lastCell?.last === total) {
      const pieces = cells.map((c) => row.slice(c.start, c.end))
      if (grossCell) {
        const gi = cells.indexOf(grossCell)
        const grossW = Number((pieces[gi].match(/<w:tcW w:w="(\d+)"/) || [])[1] || 0)
        const lastW = Number((pieces[pieces.length - 1].match(/<w:tcW w:w="(\d+)"/) || [])[1] || 0)
        pieces[gi] = setCellSpan(pieces[gi], 2, grossW + extra)
        pieces[pieces.length - 1] = setCellSpan(pieces[pieces.length - 1], lastCell.span, Math.max(lastW - extra, 0))
      } else {
        pieces[pieces.length - 1] = setCellSpan(pieces[pieces.length - 1], lastCell.span + 1)
      }
      next = row.slice(0, cells[0].start) + pieces.join('')
    }
    built += out.slice(cursor, start) + next
    cursor = end
  }
  return built + out.slice(cursor)
}

// En la plantilla "VOY" está separado de "VESSEL" con espacios, así que el número de viaje no
// tiene dónde alinearse. Se cambia por una tabulación al borde derecho de la celda, la misma
// que lleva la fila del valor: VOY y su número quedan uno debajo del otro.
const CELL_MARGINS = 216

function voyageTabStop(cellXml) {
  const width = Number((cellXml.match(/<w:tcW w:w="(\d+)"/) || [])[1] || 0)
  return `<w:tabs><w:tab w:val="right" w:pos="${Math.max(width - CELL_MARGINS, 0)}"/></w:tabs>`
}

function withTabStop(paragraphXml, tabs) {
  if (paragraphXml.includes('<w:pPr>')) return paragraphXml.replace('<w:pPr>', `<w:pPr>${tabs}`)
  return paragraphXml.replace(/(<w:p\b[^>]*>)/, `$1<w:pPr>${tabs}</w:pPr>`)
}

function alignVoyage(xml) {
  const at = xml.indexOf('>VESSEL')
  if (at < 0) return xml
  const cellStart = xml.lastIndexOf('<w:tc>', at)
  const cellEnd = xml.indexOf('</w:tc>', at)
  const cell = xml.slice(cellStart, cellEnd)
  if (!cell.includes('>VOY<')) return xml
  const pStart = cell.indexOf('<w:p ')
  const pEnd = cell.indexOf('</w:p>') + '</w:p>'.length
  const runs = cell.slice(pStart, pEnd).split(/(?=<w:r[ >])/)
  const paragraph = runs
    .filter((run) => !/^<w:r[ >]/.test(run) || !/<w:t xml:space="preserve">\s+<\/w:t>/.test(run))
    .map((run) => run
      .replace(/<w:t xml:space="preserve">VESSEL\s+<\/w:t>/, '<w:t>VESSEL</w:t>')
      .replace('<w:t>VOY</w:t>', '<w:tab/><w:t>VOY</w:t>'))
    .join('')
  const nextCell = cell.slice(0, pStart) + withTabStop(paragraph, voyageTabStop(cell)) + cell.slice(pEnd)
  return xml.slice(0, cellStart) + nextCell + xml.slice(cellEnd)
}

function voyageTabInValue(xml) {
  const at = xml.indexOf('[[vessel_name]]')
  if (at < 0) return xml
  const cellStart = xml.lastIndexOf('<w:tc>', at)
  const pStart = xml.lastIndexOf('<w:p ', at)
  const pEnd = xml.indexOf('</w:p>', at) + '</w:p>'.length
  const tabs = voyageTabStop(xml.slice(cellStart, at))
  let paragraph = withTabStop(xml.slice(pStart, pEnd), tabs)
  // El número de viaje usa la misma letra que el nombre del buque.
  const rPr = (paragraph.match(/<w:r>(<w:rPr>[\s\S]*?<\/w:rPr>)<w:t>\[\[vessel_name\]\]/) || [])[1] || ''
  paragraph = paragraph.replace('<w:r><w:tab/>', `<w:r>${rPr}<w:tab/>`)
  return xml.slice(0, pStart) + paragraph + xml.slice(pEnd)
}

// El logo (imagen flotante sobre la tabla) llega justo a la línea superior de la tabla y tapa el
// borde. Se sube 4 pt y se le deja 4 pt libres debajo: la tabla queda donde estaba y la línea se ve.
// En EMU (12700 = 1 pt).
const LOGO_LIFT = 50800
const LOGO_GAP = 50800

function liftLogo(xml) {
  return xml.replace(/<wp:anchor\b[^>]*>[\s\S]*?<\/wp:positionV>/, (anchor) => anchor
    .replace(/distB="\d+"/, `distB="${LOGO_GAP}"`)
    .replace(/(<wp:positionV relativeFrom="paragraph"><wp:posOffset>)(-?\d+)(<\/wp:posOffset>)/,
      (_, open, offset, close) => `${open}${Number(offset) - LOGO_LIFT}${close}`))
}

// "CONTACT:" va subrayado al pie de su celda y el subrayado se monta en el borde de abajo.
const CONTACT_GAP = '<w:spacing w:after="100"/>'

// En la plantilla, la celda "CONTACT:" de NOTIFY PARTY tiene el borde de abajo en blanco. Word
// dibuja encima la línea negra de la fila siguiente, pero el navegador (vista previa) se queda con
// la blanca y la línea desaparece. El borde de abajo de esas celdas va siempre en negro.
const WHITE_BOTTOM = /<w:bottom w:val="single"([^>]*?) w:color="FFFFFF"(?: w:themeColor="background1")?\/>/

function separateContact(xml) {
  const spaced = xml.replace(/<w:p\b[^>]*>(?:(?!<\/w:p>)[\s\S])*?>CONTACT:<\/w:t>[\s\S]*?<\/w:p>/g, (paragraph) => (
    paragraph.includes('<w:pPr>') ? paragraph.replace('<w:pPr>', `<w:pPr>${CONTACT_GAP}`) : paragraph
  ))
  return spaced.replace(/<w:tc>(?:(?!<\/w:tc>)[\s\S])*?>CONTACT:<\/w:t>[\s\S]*?<\/w:tc>/g, (cell) => (
    cell.replace(WHITE_BOTTOM, '<w:bottom w:val="single"$1 w:color="auto"/>')
  ))
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
  out = alignVoyage(out)
  out = fillRowAfter(out, 'VESSEL', {
    0: '[[vessel_name]]</w:t></w:r><w:r><w:tab/><w:t>[[voy_number]]',
    1: '[[port_of_loading]]',
  })
  out = voyageTabInValue(out)
  out = fillRowAfter(out, 'PORT OF DISCHARGE', {
    0: '[[port_of_discharge]]',
  })
  out = fillRowAfter(out, 'MARKS AND NUMBERS', {
    0: '[[#rows]][[marks_block]]',
    1: '[[packages]]',
    2: '[[description_block]]',
    3: '[[gross_weight]]',
    4: '[[measurements]][[/rows]]',
  }, { dropHeight: true, rowGap: true })
  return out
}

// Mismo tamaño de letra que la plantilla del HBL (medios puntos): partes y carga a 8 pt; booking,
// buque/viaje y puertos a 8,5 pt.
const VALUE_SIZE = 16
const VALUE_SIZES = { booking_number: 17, vessel_name: 17, voy_number: 17, port_of_loading: 17, port_of_discharge: 17 }

function withSize(rPr, size) {
  const sz = `<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>`
  const clean = rPr.replace(/<w:sz w:val="\d+"\/>|<w:szCs w:val="\d+"\/>/g, '')
  return clean.replace('</w:rPr>', `${sz}</w:rPr>`)
}

function valueSizes(xml) {
  return xml.replace(/<w:p\b[^>]*>(?:(?!<\/w:p>)[\s\S])*?\[\[[\s\S]*?<\/w:p>/g, (paragraph) => {
    const name = [...paragraph.matchAll(/\[\[([#/]?)(\w+)\]\]/g)].find((m) => !m[1])?.[2]
    const size = VALUE_SIZES[name] ?? VALUE_SIZE
    return paragraph
      .replace(/<w:rPr>[\s\S]*?<\/w:rPr>/g, (rPr) => withSize(rPr, size))
      .replace(/<w:r>(?!<w:rPr>)/g, `<w:r>${withSize('<w:rPr></w:rPr>', size)}`)
  })
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
  zip.file('word/document.xml', pageMargins(separateContact(liftLogo(valueSizes(placeFields(widenGrossWeight(file.asText())))))))

  const payload = normalize({
    ...data,
    notify_party: String(data.notify_party || '').trim(),
    second_notify: String(data.second_notify || '').trim(),
    vessel_name: String(data.vessel_name ?? data.vessel ?? '').trim(),
    voy_number: String(data.voy_number || '').trim(),
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
