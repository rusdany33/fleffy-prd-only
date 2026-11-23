export type PaymentMethod = 'tunai' | 'transfer'
export type Role = 'admin' | 'owner' | 'finance'
export type Verifier = 'owner' | 'finance'
export type Outcome = 'sesuai' | 'tidak_sesuai' | 'perlu_klarifikasi'
export type DecisionType = 'teruskan' | 'tahan'

/** Keadaan permintaan pemeriksaan (FR-03), diturunkan dari data — tidak disimpan. */
export type RequestState = 'tidak_perlu' | 'belum_diminta' | 'menunggu' | 'hasil_tersedia'

export interface Proof {
  amount: number
  transferAt: string // ISO
  sender: string
  note: string
}

export interface VerificationResult {
  outcome: Outcome
  by: Role
  byName: string
  at: string
  note: string
}

export interface VerificationRequest {
  id: string
  verifier: Verifier
  requestedAt: string
  requestedBy: string
  /** Salinan konteks pesanan saat permintaan dibuat (FR-06). */
  snapshot: { code: string; customerName: string; amount: number }
  /** true bila data pesanan berubah setelah permintaan dibuat (aturan bisnis 9). */
  superseded: boolean
  result?: VerificationResult
}

export interface Decision {
  id: string
  type: DecisionType
  reason: string
  by: string
  at: string
  requestId?: string
}

export interface HistoryEntry {
  at: string
  by: string
  text: string
}

export interface Order {
  id: string
  code: string
  customerName: string
  whatsapp: string
  service: string
  pairs: number
  amount: number
  method: PaymentMethod
  note: string
  createdAt: string
  updatedAt: string
  /** Catatan pembayaran (FR-01) — dicatat admin, BUKAN bukti dana diterima. */
  paymentRecordedAt?: string
  proof?: Proof
  requests: VerificationRequest[]
  decisions: Decision[]
  history: HistoryEntry[]
  sample?: boolean
}

export interface Contact {
  verifier: Verifier
  name: string
  phone: string
  note: string
}

export interface Settings {
  role: Role
  names: Record<Role, string>
  contacts: Contact[]
  procedure: string[]
}

export interface AppData {
  version: 1
  orders: Order[]
  settings: Settings
  counter: number
}
