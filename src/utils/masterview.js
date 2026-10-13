// Envía la proforma al servicio de Masterview (dashboard HBL), que la guarda en Drive y deja
// pendiente el HBL para su personal. El cliente solo ve que la proforma se envió.
const BASE = (import.meta.env.VITE_HBL_API_URL || '').replace(/\/$/, '')
const ATTEMPTS = 3
const TIMEOUT_MS = 90_000

export const sendsToMasterview = Boolean(BASE)

// El servicio gratuito se duerme sin tráfico: se despierta al abrir el formulario para que el
// envío no espere el arranque.
export function wakeMasterview() {
  if (BASE) fetch(`${BASE}/health`).catch(() => {})
}

function toBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

async function post(body) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fetch(`${BASE}/api/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

// El mismo `id` en cada reintento: si un intento llegó pero se perdió la respuesta, no se duplica.
export async function sendToMasterview({ id, form, cargo, marks, summary, sums }, proformaBlob) {
  const body = JSON.stringify({ id, form, cargo, marks, summary, sums, proforma: { base64: await toBase64(proformaBlob) } })
  let lastError = null
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    try {
      const res = await post(body)
      if (res.ok) return
      const data = await res.json().catch(() => ({}))
      lastError = new Error(data.error || `Error ${res.status}`)
      if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) throw lastError
    } catch (err) {
      if (err === lastError) throw err
      lastError = err
    }
    await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)))
  }
  throw lastError || new Error('No se pudo enviar la proforma')
}
