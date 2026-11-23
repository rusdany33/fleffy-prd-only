import type { AppData, Order } from './types'
import { makeCode } from './logic'

const ago = (min: number) => new Date(Date.now() - min * 60000).toISOString()

export const SERVICES = ['Deep Cleaning', 'Fast Cleaning', 'Unyellowing', 'Repaint', 'Reglue']

/** Data contoh fiktif untuk demonstrasi — ditandai `sample: true`. */
export function seedData(): AppData {
  const d = new Date()
  const base = (n: number, o: Partial<Order>): Order => ({
    id: `seed-${n}`, code: makeCode(n, d), customerName: '', whatsapp: '', service: 'Deep Cleaning', pairs: 1, amount: 0,
    method: 'transfer', note: '', createdAt: ago(300 - n * 30), updatedAt: ago(300 - n * 30), paymentRecordedAt: ago(300 - n * 30),
    requests: [], decisions: [], history: [{ at: ago(300 - n * 30), by: 'Ari', text: 'Pesanan dibuat. Pembayaran dicatat.' }],
    sample: true, ...o,
  })
  const orders: Order[] = [
    base(1, {
      customerName: 'Dimas Pratama', whatsapp: '081234567801', pairs: 2, amount: 150000,
      proof: { amount: 150000, transferAt: ago(270), sender: 'DIMAS PRATAMA', note: 'Bukti dikirim via WhatsApp pukul 10.12' },
    }),
    base(2, {
      customerName: 'Nadia Rahma', whatsapp: '081234567802', pairs: 2, amount: 150000,
      proof: { amount: 150000, transferAt: ago(235), sender: 'NADIA R', note: 'Bukti dikirim via WhatsApp pukul 10.47' },
      requests: [{ id: 'req-2', verifier: 'owner', requestedAt: ago(200), requestedBy: 'Ari', superseded: false, snapshot: { code: makeCode(2, d), customerName: 'Nadia Rahma', amount: 150000 } }],
      history: [
        { at: ago(240), by: 'Ari', text: 'Pesanan dibuat. Pembayaran dicatat.' },
        { at: ago(200), by: 'Ari', text: 'Permintaan pemeriksaan dikirim ke Owner.' },
      ],
    }),
    base(3, {
      customerName: 'Raka Aditya', whatsapp: '081234567803', service: 'Unyellowing', pairs: 1, amount: 85000,
      proof: { amount: 85000, transferAt: ago(205), sender: 'RAKA ADITYA', note: '' },
      requests: [{
        id: 'req-3', verifier: 'finance', requestedAt: ago(190), requestedBy: 'Ari', superseded: false,
        snapshot: { code: makeCode(3, d), customerName: 'Raka Aditya', amount: 85000 },
        result: { outcome: 'sesuai', by: 'finance', byName: 'Sinta', at: ago(150), note: 'Mutasi masuk Rp85.000 a.n. RAKA ADITYA' },
      }],
      history: [
        { at: ago(210), by: 'Ari', text: 'Pesanan dibuat. Pembayaran dicatat.' },
        { at: ago(190), by: 'Ari', text: 'Permintaan pemeriksaan dikirim ke Finance.' },
        { at: ago(150), by: 'Sinta (Finance (Pemeriksa))', text: 'Hasil pemeriksaan: Sesuai. Catatan: Mutasi masuk Rp85.000 a.n. RAKA ADITYA' },
      ],
    }),
    base(4, {
      customerName: 'Putri Ayu', whatsapp: '081234567804', service: 'Fast Cleaning', pairs: 1, amount: 50000,
      proof: { amount: 50000, transferAt: ago(175), sender: 'PUTRI AYU L', note: '' },
      requests: [{
        id: 'req-4', verifier: 'owner', requestedAt: ago(170), requestedBy: 'Ari', superseded: false,
        snapshot: { code: makeCode(4, d), customerName: 'Putri Ayu', amount: 50000 },
        result: { outcome: 'tidak_sesuai', by: 'owner', byName: 'Pak Bayu', at: ago(120), note: 'Belum ada mutasi Rp50.000 hari ini' },
      }],
      history: [
        { at: ago(180), by: 'Ari', text: 'Pesanan dibuat. Pembayaran dicatat.' },
        { at: ago(170), by: 'Ari', text: 'Permintaan pemeriksaan dikirim ke Owner.' },
        { at: ago(120), by: 'Pak Bayu (Owner (Pemeriksa))', text: 'Hasil pemeriksaan: Tidak sesuai. Catatan: Belum ada mutasi Rp50.000 hari ini' },
      ],
    }),
    base(5, { customerName: 'Bagus Santoso', whatsapp: '081234567805', service: 'Repaint', pairs: 1, amount: 120000, method: 'tunai' }),
  ]
  return {
    version: 1, orders, counter: orders.length,
    settings: {
      role: 'admin',
      names: { admin: 'Ari', owner: 'Pak Bayu', finance: 'Sinta' },
      contacts: [
        { verifier: 'owner', name: 'Pak Bayu', phone: '081200000001', note: 'Pemeriksa utama rekening usaha.' },
        { verifier: 'finance', name: 'Sinta', phone: '081200000002', note: 'Pemeriksa pengganti bila Owner tidak merespons.' },
      ],
      procedure: [
        'Pastikan permintaan sudah terkirim ke pemeriksa yang benar dan data pesanan sudah sesuai.',
        'Jika belum ada hasil dalam waktu yang disepakati usaha, hubungi ulang pemeriksa melalui kontak di halaman Kontak Pemeriksa.',
        'Jika pemeriksa utama tidak dapat dihubungi, hubungi pemeriksa pengganti.',
        'Selama menunggu, tahan pesanan dan jangan menyatakan dana sudah diterima kepada pelanggan.',
      ],
    },
  }
}
