import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import { formatWeight, parseAmount } from './amount.js'
import { containerMarks, sortByContainer, weightLines } from './proformaText.js'
import { packageUnit } from './packageWords.js'

// El tipo de contenedor (40HQ, 20DV...) no está en el formulario: queda para completarlo a mano.
const CONTAINER_TYPE = '-----'

// La descripción de cada contenedor va tal cual se escribió (con su cantidad de bultos) y con los
// pesos que la proforma agrega cuando no están escritos.
function containerText(row) {
  return [String(row.description || '').trim(), ...weightLines(row)].filter(Boolean).join('\n')
}

export function hblFileName(booking) {
  const clean = String(booking || '').trim().replace(/[\\/:*?"<>|]+/g, '_')
  return `HBL DRAFT - ${clean || 'SIN BOOKING'}.docx`
}

export function buildHblData({ formData, rows, globalMarks, cargoSummary, sums }) {
  const sorted = sortByContainer(rows)
  const marks = String(globalMarks || '').trim()
  const measurement = parseAmount(sums.cbm)
  return {
    shipper: String(formData.shipper || '').trim(),
    booking_number: String(formData.booking_number || '').trim(),
    consignee: String(formData.consignee || '').trim(),
    notify_party: String(formData.notify_party || '').trim(),
    second_notify: String(formData.second_notify || '').trim(),
    vessel_name: String(formData.vessel || '').trim(),
    voy_number: String(formData.voy_number || '').trim(),
    port_of_loading: String(formData.port_of_loading || '').trim(),
    port_of_discharge: String(formData.port_of_discharge || '').trim(),
    marks_block: [
      ...sorted.map(containerMarks).filter(Boolean),
      ...(marks ? [`MARKS:\n${marks}`] : []),
    ].join('\n'),
    // Como en los HBL emitidos: "1450", sin separador de miles.
    packages_block: [String(parseAmount(sums.packages) ?? ''), packageUnit(sorted) ?? 'PACKAGES'].filter(Boolean).join('\n'),
    // Solo la primera línea lleva la cantidad y el tipo de contenedores.
    description_block: [
      `${sorted.length}X${CONTAINER_TYPE} CONTAINERS STC`,
      ...sorted.map(containerText),
      String(cargoSummary || '').trim(),
    ].filter(Boolean).join('\n'),
    gross_total: sums.gross ? `${sums.gross} KG` : '',
    measurement_total: measurement == null ? '' : `${formatWeight(measurement)} CBM`,
  }
}

export function fillHbl(buffer, data) {
  const doc = new Docxtemplater(new PizZip(buffer), {
    delimiters: { start: '[[', end: ']]' },
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => '',
  })
  doc.render(data)
  return doc.getZip().generate({
    type: 'uint8array',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
  })
}
