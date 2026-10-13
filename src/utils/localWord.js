import templateUrl from '../assets/Template.docx?url'
import { fillTemplate } from './fillTemplate.js'

const DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

async function readTemplate(url, name) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`No se encontró la plantilla ${name}`)
  return response.arrayBuffer()
}

function download(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

// El mismo Word que se descarga, en memoria: lo usa también la vista previa.
export async function buildLocalProforma(data) {
  const bytes = fillTemplate(await readTemplate(templateUrl, 'de la proforma'), data)
  return new Blob([bytes], { type: DOCX_TYPE })
}

// Descarga la proforma y devuelve el mismo Word para enviarlo a Masterview.
export async function downloadLocalProforma({ data, fileName }) {
  const blob = await buildLocalProforma(data)
  download(blob, fileName)
  return blob
}
