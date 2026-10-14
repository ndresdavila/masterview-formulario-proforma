// Envía la proforma al servicio de Masterview (dashboard HBL), que la guarda en Drive y deja
// pendiente el HBL para su personal. El servicio gratuito se duerme sin tráfico: se despierta al
// abrir el formulario para que el envío no espere el arranque.
const BASE = (import.meta.env.VITE_HBL_API_URL || '').replace(/\/$/, '')
const ATTEMPTS = 3
const TIMEOUT_MS = 90_000

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

const QUEUE_KEY = 'mv-proformas-por-enviar'
const QUEUE_MAX = 5

class Rejected extends Error {}

// El mismo `id` en cada reintento: si un intento llegó pero se perdió la respuesta, no se duplica.
async function deliver(body) {
  let lastError = null
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    try {
      const res = await post(body)
      if (res.ok) return
      lastError = new Error(`Error ${res.status}`)
      // El servidor rechazó los datos: reintentar no sirve.
      if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) throw new Rejected(lastError.message)
    } catch (err) {
      if (err instanceof Rejected) throw err
      lastError = err
    }
    await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)))
  }
  throw lastError
}

function readQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
  } catch {
    return []
  }
}

function writeQueue(queue) {
  try {
    if (queue.length) localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-QUEUE_MAX)))
    else localStorage.removeItem(QUEUE_KEY)
  } catch {
    // Sin almacenamiento (modo privado o lleno): solo queda el envío de ahora.
  }
}

const forget = (id) => writeQueue(readQueue().filter((entry) => entry.id !== id))

async function deliverQueued(entry) {
  try {
    await deliver(entry.body)
    forget(entry.id)
  } catch (err) {
    if (err instanceof Rejected) forget(entry.id)
    console.error('Envío a Masterview pendiente', err)
  }
}

// El cliente no se entera del envío ni de si falla. Se guarda primero en el navegador y se borra al
// llegar; si no llega (sin conexión, pestaña cerrada), se reintenta la próxima vez que se abre.
export async function sendToMasterview({ id, form, cargo, marks, summary, sums }, proformaBlob) {
  if (!BASE) return
  const body = JSON.stringify({ id, form, cargo, marks, summary, sums, proforma: { base64: await toBase64(proformaBlob) } })
  writeQueue([...readQueue(), { id, body }])
  await deliverQueued({ id, body })
}

// Al abrir el formulario: despierta el servicio y reenvía lo que quedó pendiente.
export function wakeMasterview() {
  if (!BASE) return
  fetch(`${BASE}/health`).catch(() => {})
  readQueue().reduce((chain, entry) => chain.then(() => deliverQueued(entry)), Promise.resolve())
}
