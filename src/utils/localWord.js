import templateUrl from '../assets/Template.docx?url'
import { fillTemplate } from './fillTemplate.js'

export async function downloadLocalProforma({ data, fileName }) {
  const response = await fetch(templateUrl)
  if (!response.ok) throw new Error('No se encontró la plantilla de la proforma')
  const bytes = fillTemplate(await response.arrayBuffer(), data)
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}
