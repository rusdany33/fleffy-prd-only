import { describe, expect, it } from 'vitest'
import {
  activeRequest, canForward, createOrder, decide, fundsConfirmed, isForwarded, requestState, searchOrders,
  sendRequest, submitResult, summary, updateOrder, validateOrder, type OrderInput,
} from './logic'
import { seedData } from './seed'
import type { AppData } from './types'

const input = (o: Partial<OrderInput> = {}): OrderInput => ({
  customerName: 'Uji Coba', whatsapp: '081211112222', service: 'Deep Cleaning', pairs: 2, amount: 150000,
  method: 'transfer', note: '', recordPayment: true,
  proof: { amount: 150000, transferAt: new Date().toISOString(), sender: 'UJI', note: '' }, ...o,
})

function fresh(): { d: AppData; id: string } {
  const empty: AppData = { ...seedData(), orders: [], counter: 0 }
  const r = createOrder(empty, input(), 'Ari')
  return { d: r.data, id: r.order.id }
}
const get = (d: AppData, id: string) => d.orders.find((o) => o.id === id)!

describe('Pencatatan (FR-07) & validasi', () => {
  it('menolak data wajib kosong dan nominal 0', () => {
    const e = validateOrder(input({ customerName: '  ', amount: 0 }))
    expect(e.customerName).toBeTruthy()
    expect(e.amount).toBeTruthy()
  })
  it('membuat kode pesanan unik', () => {
    const { d } = fresh()
    const r2 = createOrder(d, input(), 'Ari')
    expect(r2.order.code).not.toBe(d.orders[0].code)
  })
})

describe('V1 — catatan pembayaran ≠ dana dipastikan (FR-01)', () => {
  it('pembayaran tercatat tetapi dana belum dipastikan', () => {
    const { d, id } = fresh()
    const o = get(d, id)
    expect(o.paymentRecordedAt).toBeTruthy()
    expect(fundsConfirmed(o)).toBe(false)
    expect(requestState(o)).toBe('belum_diminta')
  })
  it('mengirim permintaan tidak memastikan dana', () => {
    const { d, id } = fresh()
    const d2 = sendRequest(d, id, 'owner', 'Ari')
    expect(requestState(get(d2, id))).toBe('menunggu')
    expect(fundsConfirmed(get(d2, id))).toBe(false)
  })
})

describe('V5 — konteks dipakai ulang (FR-06)', () => {
  it('permintaan menyalin kode, pelanggan, nominal', () => {
    const { d, id } = fresh()
    const r = activeRequest(get(sendRequest(d, id, 'finance', 'Ari'), id))!
    expect(r.snapshot).toEqual({ code: get(d, id).code, customerName: 'Uji Coba', amount: 150000 })
  })
})

describe('Aturan bisnis 4 — satu permintaan aktif', () => {
  it('tidak bisa kirim ulang saat menunggu', () => {
    const { d, id } = fresh()
    const d2 = sendRequest(d, id, 'owner', 'Ari')
    expect(() => sendRequest(d2, id, 'owner', 'Ari')).toThrow()
  })
  it('bisa kirim ulang setelah Tidak sesuai', () => {
    const { d, id } = fresh()
    let x = sendRequest(d, id, 'owner', 'Ari')
    x = submitResult(x, id, 'owner', 'Bayu', 'tidak_sesuai', 'belum masuk')
    x = sendRequest(x, id, 'finance', 'Ari')
    expect(requestState(get(x, id))).toBe('menunggu')
    expect(get(x, id).requests.filter((r) => !r.superseded)).toHaveLength(1)
  })
  it('pembayaran tunai tidak memerlukan pemeriksaan', () => {
    const { d } = fresh()
    const r = createOrder(d, input({ method: 'tunai', proof: undefined }), 'Ari')
    expect(() => sendRequest(r.data, r.order.id, 'owner', 'Ari')).toThrow()
  })
})

describe('V6 — hasil hanya oleh Pemeriksa (NFR-05)', () => {
  it('admin tidak bisa memasukkan hasil', () => {
    const { d, id } = fresh()
    const d2 = sendRequest(d, id, 'owner', 'Ari')
    expect(() => submitResult(d2, id, 'admin', 'Ari', 'sesuai', '')).toThrow()
  })
  it('hasil Tidak sesuai wajib catatan', () => {
    const { d, id } = fresh()
    const d2 = sendRequest(d, id, 'owner', 'Ari')
    expect(() => submitResult(d2, id, 'owner', 'Bayu', 'tidak_sesuai', '')).toThrow()
  })
})

describe('V3/V4 — keputusan (FR-05)', () => {
  it('Teruskan ditolak sebelum ada hasil', () => {
    const { d, id } = fresh()
    expect(() => decide(d, id, 'teruskan', '', 'admin', 'Ari')).toThrow()
    const d2 = sendRequest(d, id, 'owner', 'Ari')
    expect(canForward(get(d2, id)).ok).toBe(false)
    expect(() => decide(d2, id, 'teruskan', '', 'admin', 'Ari')).toThrow()
  })
  it('Teruskan ditolak bila hasil Perlu klarifikasi', () => {
    const { d, id } = fresh()
    let x = sendRequest(d, id, 'owner', 'Ari')
    x = submitResult(x, id, 'owner', 'Bayu', 'perlu_klarifikasi', 'nama pengirim beda')
    expect(() => decide(x, id, 'teruskan', '', 'admin', 'Ari')).toThrow()
  })
  it('Teruskan berhasil setelah Sesuai, dengan rujukan hasil', () => {
    const { d, id } = fresh()
    let x = sendRequest(d, id, 'owner', 'Ari')
    x = submitResult(x, id, 'owner', 'Bayu', 'sesuai', '')
    x = decide(x, id, 'teruskan', '', 'admin', 'Ari')
    const o = get(x, id)
    expect(isForwarded(o)).toBe(true)
    expect(o.decisions.at(-1)!.requestId).toBe(activeRequest(o)!.id)
  })
  it('Tahan wajib alasan', () => {
    const { d, id } = fresh()
    expect(() => decide(d, id, 'tahan', ' ', 'admin', 'Ari')).toThrow()
    expect(decide(d, id, 'tahan', 'menunggu owner', 'admin', 'Ari').orders[0].decisions).toHaveLength(1)
  })
  it('pemeriksa tidak bisa mencatat keputusan', () => {
    const { d, id } = fresh()
    expect(() => decide(d, id, 'tahan', 'x', 'owner', 'Bayu')).toThrow()
  })
})

describe('Aturan bisnis 9 — data berubah setelah permintaan', () => {
  it('ubah nominal membatalkan permintaan & keputusan', () => {
    const { d, id } = fresh()
    let x = sendRequest(d, id, 'owner', 'Ari')
    x = submitResult(x, id, 'owner', 'Bayu', 'sesuai', '')
    x = decide(x, id, 'teruskan', '', 'admin', 'Ari')
    x = updateOrder(x, id, input({ amount: 175000, proof: get(x, id).proof }), 'Ari')
    const o = get(x, id)
    expect(requestState(o)).toBe('belum_diminta')
    expect(fundsConfirmed(o)).toBe(false)
    expect(isForwarded(o)).toBe(false)
  })
  it('ubah catatan saja tidak membatalkan permintaan', () => {
    const { d, id } = fresh()
    let x = sendRequest(d, id, 'owner', 'Ari')
    x = updateOrder(x, id, input({ note: 'sepatu putih', proof: get(x, id).proof }), 'Ari')
    expect(requestState(get(x, id))).toBe('menunggu')
  })
})

describe('V2 — dua pesanan bernominal sama (FR-02)', () => {
  it('dapat dibedakan lewat kode dan dicari lewat nama', () => {
    const s = seedData()
    const same = s.orders.filter((o) => o.amount === 150000)
    expect(same).toHaveLength(2)
    expect(same[0].code).not.toBe(same[1].code)
    expect(searchOrders(s.orders, 'nadia')).toHaveLength(1)
    expect(searchOrders(s.orders, same[0].code)).toHaveLength(1)
  })
})

describe('FR-08 — ringkasan beranda', () => {
  it('menghitung keadaan dari data contoh', () => {
    expect(summary(seedData().orders)).toEqual({ belum_diminta: 1, menunggu: 1, hasil_tersedia: 2, siap: 2 })
  })
})
