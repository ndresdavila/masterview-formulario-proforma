import templateUrl from '../assets/Template.docx?url'
import hblTemplateUrl from '../assets/HBL.docx?url'
import { fillTemplate } from './fillTemplate.js'
import { fillHbl } from './hbl.js'

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

export async function downloadLocalProforma({ data, fileName }) {
  download(await buildLocalProforma(data), fileName)
}

export async function downloadLocalHbl({ data, fileName }) {
  const bytes = fillHbl(await readTemplate(hblTemplateUrl, 'del HBL'), data)
  download(new Blob([bytes], { type: DOCX_TYPE }), fileName)
}
