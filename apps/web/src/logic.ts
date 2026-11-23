import type {
  AppData, Decision, Order, Outcome, PaymentMethod, Proof, RequestState, Role,
  VerificationRequest, Verifier,
} from './types'

export class RuleError extends Error {}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

export const isVerifierRole = (r: Role): r is Verifier => r === 'owner' || r === 'finance'

export const ROLE_LABEL: Record<Role, string> = { admin: 'Admin / Kasir', owner: 'Owner (Pemeriksa)', finance: 'Finance (Pemeriksa)' }
export const VERIFIER_LABEL: Record<Verifier, string> = { owner: 'Owner', finance: 'Finance' }
export const OUTCOME_LABEL: Record<Outcome, string> = { sesuai: 'Sesuai', tidak_sesuai: 'Tidak sesuai', perlu_klarifikasi: 'Perlu klarifikasi' }
export const STATE_LABEL: Record<RequestState, string> = {
  tidak_perlu: 'Tidak perlu pemeriksaan', belum_diminta: 'Belum diminta', menunggu: 'Menunggu hasil', hasil_tersedia: 'Hasil tersedia',
}

// ---------- Turunan (derived) ----------

/** Permintaan aktif = permintaan terbaru yang belum digantikan. */
export function activeRequest(o: Order): VerificationRequest | undefined {
  for (let i = o.requests.length - 1; i >= 0; i--) if (!o.requests[i].superseded) return o.requests[i]
  return undefined
}

export function requestState(o: Order): RequestState {
  if (o.method !== 'transfer') return 'tidak_perlu'
  const r = activeRequest(o)
  if (!r) return 'belum_diminta'
  return r.result ? 'hasil_tersedia' : 'menunggu'
}

/** Dana dipastikan hanya bila hasil pemeriksaan aktif = Sesuai (aturan bisnis 3). */
export const fundsConfirmed = (o: Order) => o.method === 'transfer' && activeRequest(o)?.result?.outcome === 'sesuai'

/** Aturan bisnis 4: satu permintaan aktif; ulang hanya setelah Tidak sesuai / Perlu klarifikasi. */
export function canRequest(o: Order): { ok: boolean; reason?: string } {
  if (o.method !== 'transfer') return { ok: false, reason: 'Pemeriksaan hanya untuk pembayaran Bank Transfer.' }
  if (!o.paymentRecordedAt) return { ok: false, reason: 'Catat pembayaran terlebih dahulu.' }
  const r = activeRequest(o)
  if (!r) return { ok: true }
  if (!r.result) return { ok: false, reason: 'Masih ada permintaan yang menunggu hasil.' }
  if (r.result.outcome === 'sesuai') return { ok: false, reason: 'Hasil pemeriksaan sudah Sesuai.' }
  return { ok: true }
}

export function latestDecision(o: Order): Decision | undefined {
  return o.decisions[o.decisions.length - 1]
}

/** Pesanan diteruskan hanya jika keputusan terakhir Teruskan untuk permintaan aktif yang Sesuai. */
export function isForwarded(o: Order): boolean {
  const d = latestDecision(o)
  if (!d || d.type !== 'teruskan') return false
  if (o.method === 'tunai') return true
  const r = activeRequest(o)
  return !!r && d.requestId === r.id && r.result?.outcome === 'sesuai'
}

export function canForward(o: Order): { ok: boolean; reason?: string } {
  if (isForwarded(o)) return { ok: false, reason: 'Pesanan sudah diteruskan ke teknisi.' }
  if (o.method === 'tunai') return { ok: true }
  const st = requestState(o)
  if (st === 'belum_diminta') return { ok: false, reason: 'Belum ada permintaan pemeriksaan. Dana belum dipastikan.' }
  if (st === 'menunggu') return { ok: false, reason: 'Hasil pemeriksaan belum tersedia. Dana belum dipastikan.' }
  const out = activeRequest(o)!.result!.outcome
  if (out !== 'sesuai') return { ok: false, reason: `Hasil pemeriksaan "${OUTCOME_LABEL[out]}". Pesanan harus ditahan.` }
  return { ok: true }
}

/** Status tindak lanjut pesanan untuk ditampilkan. */
export function followUpLabel(o: Order): 'Diteruskan ke teknisi' | 'Siap diteruskan' | 'Ditahan' {
  if (isForwarded(o)) return 'Diteruskan ke teknisi'
  if (canForward(o).ok) return 'Siap diteruskan'
  return 'Ditahan'
}

export function summary(orders: Order[]) {
  const t = orders.filter((o) => o.method === 'transfer')
  return {
    belum_diminta: t.filter((o) => requestState(o) === 'belum_diminta').length,
    menunggu: t.filter((o) => requestState(o) === 'menunggu').length,
    hasil_tersedia: t.filter((o) => requestState(o) === 'hasil_tersedia').length,
    siap: orders.filter((o) => !isForwarded(o) && canForward(o).ok).length,
  }
}

export function searchOrders(orders: Order[], q: string): Order[] {
  const s = q.trim().toLowerCase()
  const list = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  if (!s) return list
  return list.filter((o) => o.code.toLowerCase().includes(s) || o.customerName.toLowerCase().includes(s) || o.whatsapp.includes(s))
}

// ---------- Validasi ----------

export interface OrderInput {
  customerName: string
  whatsapp: string
  service: string
  pairs: number
  amount: number
  method: PaymentMethod
  note: string
  recordPayment: boolean
  proof?: Proof
}

export function validateOrder(i: OrderInput): Record<string, string> {
  const e: Record<string, string> = {}
  if (!i.customerName.trim()) e.customerName = 'Nama pelanggan wajib diisi.'
  else if (i.customerName.trim().length > 100) e.customerName = 'Maksimal 100 karakter.'
  if (i.whatsapp && !/^[0-9+\s-]{8,20}$/.test(i.whatsapp.trim())) e.whatsapp = 'Nomor WhatsApp tidak valid.'
  if (!i.service.trim()) e.service = 'Layanan wajib dipilih.'
  if (!Number.isInteger(i.pairs) || i.pairs < 1) e.pairs = 'Jumlah pasang minimal 1.'
  if (!Number.isFinite(i.amount) || i.amount <= 0) e.amount = 'Nominal tagihan harus lebih dari 0.'
  if (i.note.length > 500) e.note = 'Maksimal 500 karakter.'
  if (i.method === 'transfer' && i.proof) {
    if (!Number.isFinite(i.proof.amount) || i.proof.amount <= 0) e.proofAmount = 'Nominal pada bukti harus lebih dari 0.'
    if (!i.proof.transferAt) e.proofAt = 'Tanggal/waktu transfer wajib diisi.'
    if (!i.proof.sender.trim()) e.proofSender = 'Nama pengirim wajib diisi.'
  }
  return e
}

// ---------- Aksi (mengembalikan data baru) ----------

const now = () => new Date().toISOString()

function patch(data: AppData, id: string, fn: (o: Order) => Order): AppData {
  const idx = data.orders.findIndex((o) => o.id === id)
  if (idx < 0) throw new RuleError('Pesanan tidak ditemukan.')
  const orders = [...data.orders]
  orders[idx] = fn(orders[idx])
  return { ...data, orders }
}

export function makeCode(counter: number, d = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `FLF-${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}-${String(counter).padStart(3, '0')}`
}

export function createOrder(data: AppData, i: OrderInput, by: string): { data: AppData; order: Order } {
  const errors = validateOrder(i)
  if (Object.keys(errors).length) throw new RuleError('Periksa kembali isian yang ditandai.')
  const t = now()
  const counter = data.counter + 1
  const order: Order = {
    id: uid(), code: makeCode(counter), customerName: i.customerName.trim(), whatsapp: i.whatsapp.trim(),
    service: i.service, pairs: i.pairs, amount: i.amount, method: i.method, note: i.note.trim(),
    createdAt: t, updatedAt: t, paymentRecordedAt: i.recordPayment ? t : undefined,
    proof: i.method === 'transfer' ? i.proof : undefined,
    requests: [], decisions: [], history: [{ at: t, by, text: 'Pesanan dibuat.' + (i.recordPayment ? ' Pembayaran dicatat.' : '') }],
  }
  return { data: { ...data, counter, orders: [...data.orders, order] }, order }
}

export function updateOrder(data: AppData, id: string, i: OrderInput, by: string): AppData {
  const errors = validateOrder(i)
  if (Object.keys(errors).length) throw new RuleError('Periksa kembali isian yang ditandai.')
  return patch(data, id, (o) => {
    const t = now()
    const changed: string[] = []
    if (o.customerName !== i.customerName.trim()) changed.push('pelanggan')
    if (o.service !== i.service || o.pairs !== i.pairs) changed.push('layanan')
    if (o.amount !== i.amount) changed.push('nominal')
    if (o.method !== i.method) changed.push('metode pembayaran')
    const proofChanged = JSON.stringify(o.proof ?? null) !== JSON.stringify((i.method === 'transfer' ? i.proof : undefined) ?? null)
    if (proofChanged) changed.push('bukti')
    // Aturan bisnis 9: perubahan data yang diperiksa membuat permintaan perlu dikirim ulang.
    const invalidates = changed.some((c) => c === 'nominal' || c === 'metode pembayaran' || c === 'bukti' || c === 'pelanggan')
    const hadActive = !!activeRequest(o)
    const history = [...o.history]
    if (changed.length || o.whatsapp !== i.whatsapp.trim() || o.note !== i.note.trim()) {
      history.push({ at: t, by, text: `Pesanan diubah${changed.length ? ` (${changed.join(', ')})` : ''}.` })
    }
    if (invalidates && hadActive) history.push({ at: t, by: 'Sistem', text: 'Data pesanan berubah. Permintaan pemeriksaan sebelumnya tidak berlaku dan perlu dikirim ulang.' })
    let paymentRecordedAt = o.paymentRecordedAt
    if (i.recordPayment && !paymentRecordedAt) { paymentRecordedAt = t; history.push({ at: t, by, text: 'Pembayaran dicatat.' }) }
    if (!i.recordPayment && paymentRecordedAt) { paymentRecordedAt = undefined; history.push({ at: t, by, text: 'Catatan pembayaran dibatalkan.' }) }
    return {
      ...o, customerName: i.customerName.trim(), whatsapp: i.whatsapp.trim(), service: i.service, pairs: i.pairs, amount: i.amount,
      method: i.method, note: i.note.trim(), proof: i.method === 'transfer' ? i.proof : undefined, paymentRecordedAt, updatedAt: t,
      requests: invalidates ? o.requests.map((r) => ({ ...r, superseded: true })) : o.requests,
      history,
    }
  })
}

export function sendRequest(data: AppData, id: string, verifier: Verifier, by: string): AppData {
  return patch(data, id, (o) => {
    const c = canRequest(o)
    if (!c.ok) throw new RuleError(c.reason)
    const t = now()
    const prev = activeRequest(o)
    const req: VerificationRequest = {
      id: uid(), verifier, requestedAt: t, requestedBy: by, superseded: false,
      snapshot: { code: o.code, customerName: o.customerName, amount: o.amount },
    }
    return {
      ...o, updatedAt: t,
      requests: [...o.requests.map((r) => (r.id === prev?.id ? { ...r, superseded: true } : r)), req],
      history: [...o.history, { at: t, by, text: `${prev ? 'Permintaan pemeriksaan ulang' : 'Permintaan pemeriksaan'} dikirim ke ${VERIFIER_LABEL[verifier]}.` }],
    }
  })
}

export function submitResult(data: AppData, id: string, role: Role, byName: string, outcome: Outcome, note: string): AppData {
  if (!isVerifierRole(role)) throw new RuleError('Hanya Pemeriksa (Owner/Finance) yang dapat memasukkan hasil pemeriksaan.')
  if (outcome !== 'sesuai' && !note.trim()) throw new RuleError('Catatan wajib diisi untuk hasil Tidak sesuai atau Perlu klarifikasi.')
  return patch(data, id, (o) => {
    const r = activeRequest(o)
    if (!r) throw new RuleError('Tidak ada permintaan pemeriksaan aktif untuk pesanan ini.')
    if (r.result) throw new RuleError('Hasil untuk permintaan ini sudah dimasukkan.')
    if (r.snapshot.amount !== o.amount || r.snapshot.code !== o.code) throw new RuleError('Permintaan tidak lagi sesuai dengan data pesanan.')
    const t = now()
    return {
      ...o, updatedAt: t,
      requests: o.requests.map((x) => (x.id === r.id ? { ...x, result: { outcome, by: role, byName, at: t, note: note.trim() } } : x)),
      history: [...o.history, { at: t, by: `${byName} (${ROLE_LABEL[role]})`, text: `Hasil pemeriksaan: ${OUTCOME_LABEL[outcome]}.${note.trim() ? ` Catatan: ${note.trim()}` : ''}` }],
    }
  })
}

export function decide(data: AppData, id: string, type: 'teruskan' | 'tahan', reason: string, role: Role, by: string): AppData {
  if (role !== 'admin') throw new RuleError('Keputusan tindak lanjut dicatat oleh Admin.')
  return patch(data, id, (o) => {
    if (type === 'teruskan') {
      const c = canForward(o)
      if (!c.ok) throw new RuleError(c.reason)
    } else if (!reason.trim()) throw new RuleError('Alasan menahan pesanan wajib diisi.')
    const t = now()
    const r = activeRequest(o)
    const d: Decision = { id: uid(), type, reason: reason.trim(), by, at: t, requestId: r?.id }
    return {
      ...o, updatedAt: t, decisions: [...o.decisions, d],
      history: [...o.history, { at: t, by, text: type === 'teruskan' ? 'Keputusan: Teruskan ke teknisi.' : `Keputusan: Tahan. Alasan: ${reason.trim()}` }],
    }
  })
}

// ---------- Format ----------

export const rupiah = (n: number) => 'Rp' + Math.round(n).toLocaleString('id-ID')

export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export function since(iso: string, ref = Date.now()): string {
  const m = Math.max(0, Math.floor((ref - new Date(iso).getTime()) / 60000))
  if (m < 1) return 'baru saja'
  if (m < 60) return `${m} menit`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} jam ${m % 60} menit`
  return `${Math.floor(h / 24)} hari ${h % 24} jam`
}
