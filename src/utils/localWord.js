import templateUrl from '../assets/Template.docx?url'
import { fillTemplate } from './fillTemplate.js'

const DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

// El mismo Word que se descarga, en memoria: lo usa también la vista previa.
export async function buildLocalProforma(data) {
  const response = await fetch(templateUrl)
  if (!response.ok) throw new Error('No se encontró la plantilla de la proforma')
  const bytes = fillTemplate(await response.arrayBuffer(), data)
  return new Blob([bytes], { type: DOCX_TYPE })
}

export async function downloadLocalProforma({ data, fileName }) {
  const blob = await buildLocalProforma(data)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}
