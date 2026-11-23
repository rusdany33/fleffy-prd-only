import { useState, type FormEvent } from 'react'
import { useStore } from '../store'
import { back, go } from '../router'
import { activeRequest, createOrder, rupiah, updateOrder, validateOrder, type OrderInput } from '../logic'
import { SERVICES } from '../seed'
import { Field } from '../components/ui'
import type { Order } from '../types'

const toLocalInput = (iso: string) => {
  const d = new Date(iso)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

export function OrderForm({ order }: { order?: Order }) {
  const { data, run } = useStore()
  const by = data.settings.names.admin
  const [f, setF] = useState({
    customerName: order?.customerName ?? '',
    whatsapp: order?.whatsapp ?? '',
    service: order?.service ?? SERVICES[0],
    pairs: String(order?.pairs ?? 1),
    amount: order ? String(order.amount) : '',
    method: order?.method ?? 'transfer',
    note: order?.note ?? '',
    recordPayment: order ? !!order.paymentRecordedAt : true,
    hasProof: order ? !!order.proof : true,
    proofAmount: order?.proof ? String(order.proof.amount) : '',
    proofAt: order?.proof ? toLocalInput(order.proof.transferAt) : '',
    proofSender: order?.proof?.sender ?? '',
    proofNote: order?.proof?.note ?? '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof f, v: string | boolean) => setF((s) => ({ ...s, [k]: v }))

  if (data.settings.role !== 'admin') {
    return <div className="card"><h1>{order ? 'Ubah Pesanan' : 'Buat Pesanan'}</h1><p>Pencatatan pesanan dilakukan oleh Admin/Kasir. Ganti peran di bagian atas untuk melanjutkan.</p></div>
  }

  const input = (): OrderInput => ({
    customerName: f.customerName, whatsapp: f.whatsapp, service: f.service, pairs: Number(f.pairs), amount: Number(f.amount),
    method: f.method as OrderInput['method'], note: f.note, recordPayment: f.recordPayment,
    proof: f.method === 'transfer' && f.hasProof
      ? { amount: Number(f.proofAmount), transferAt: f.proofAt ? new Date(f.proofAt).toISOString() : '', sender: f.proofSender.trim(), note: f.proofNote.trim() }
      : undefined,
  })

  const willInvalidate = order && activeRequest(order) && (
    Number(f.amount) !== order.amount || f.method !== order.method || f.customerName.trim() !== order.customerName
  )

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    const i = input()
    const errs = validateOrder(i)
    setErrors(errs)
    if (Object.keys(errs).length) {
      document.getElementById(Object.keys(errs)[0])?.focus()
      return
    }
    setBusy(true)
    if (order) {
      if (run((d) => updateOrder(d, order.id, i, by), 'Perubahan pesanan disimpan.')) go(`/pesanan/${order.id}`)
    } else {
      let newId = ''
      const ok = run((d) => { const r = createOrder(d, i, by); newId = r.order.id; return r.data }, 'Pesanan berhasil dibuat.')
      if (ok) go(`/pesanan/${newId}`)
    }
    setBusy(false)
  }

  const amountMismatch = f.method === 'transfer' && f.hasProof && f.proofAmount && f.amount && Number(f.proofAmount) !== Number(f.amount)

  return (
    <form className="form" onSubmit={submit} noValidate>
      <h1>{order ? `Ubah Pesanan ${order.code}` : 'Buat Pesanan'}</h1>

      <fieldset>
        <legend>Pelanggan & layanan</legend>
        <Field label="Nama pelanggan *" htmlFor="customerName" error={errors.customerName}>
          <input id="customerName" value={f.customerName} maxLength={100} onChange={(e) => set('customerName', e.target.value)} autoComplete="off" />
        </Field>
        <Field label="Nomor WhatsApp" htmlFor="whatsapp" error={errors.whatsapp}>
          <input id="whatsapp" inputMode="tel" value={f.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} />
        </Field>
        <div className="grid2">
          <Field label="Layanan *" htmlFor="service" error={errors.service}>
            <select id="service" value={f.service} onChange={(e) => set('service', e.target.value)}>
              {SERVICES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Jumlah pasang *" htmlFor="pairs" error={errors.pairs}>
            <input id="pairs" type="number" min={1} value={f.pairs} onChange={(e) => set('pairs', e.target.value)} />
          </Field>
        </div>
        <Field label="Nominal tagihan (Rp) *" htmlFor="amount" error={errors.amount} hint={f.amount ? rupiah(Number(f.amount)) : undefined}>
          <input id="amount" type="number" min={0} inputMode="numeric" value={f.amount} onChange={(e) => set('amount', e.target.value)} />
        </Field>
        <Field label="Catatan" htmlFor="note" error={errors.note}>
          <textarea id="note" rows={2} maxLength={500} value={f.note} onChange={(e) => set('note', e.target.value)} />
        </Field>
      </fieldset>

      <fieldset>
        <legend>Pembayaran</legend>
        <div className="seg" role="radiogroup" aria-label="Metode pembayaran">
          {(['transfer', 'tunai'] as const).map((m) => (
            <label key={m} className={f.method === m ? 'on' : ''}>
              <input type="radio" name="method" checked={f.method === m} onChange={() => set('method', m)} />{m === 'transfer' ? 'Bank Transfer' : 'Tunai'}
            </label>
          ))}
        </div>
        <label className="check">
          <input type="checkbox" checked={f.recordPayment} onChange={(e) => set('recordPayment', e.target.checked)} />
          Catat pembayaran sekarang
        </label>
        {f.method === 'transfer' && (
          <p className="note">Mencatat pembayaran transfer <b>tidak</b> berarti dana sudah diterima. Dana baru dipastikan setelah ada hasil pemeriksaan <b>Sesuai</b> dari Owner/Finance.</p>
        )}
        {f.method === 'transfer' && (
          <>
            <label className="check">
              <input type="checkbox" checked={f.hasProof} onChange={(e) => set('hasProof', e.target.checked)} />
              Pelanggan sudah mengirim bukti transfer
            </label>
            {f.hasProof && (
              <div className="sub">
                <div className="grid2">
                  <Field label="Nominal pada bukti (Rp) *" htmlFor="proofAmount" error={errors.proofAmount}>
                    <input id="proofAmount" type="number" min={0} value={f.proofAmount} onChange={(e) => set('proofAmount', e.target.value)} />
                  </Field>
                  <Field label="Tanggal & waktu transfer *" htmlFor="proofAt" error={errors.proofAt}>
                    <input id="proofAt" type="datetime-local" value={f.proofAt} onChange={(e) => set('proofAt', e.target.value)} />
                  </Field>
                </div>
                {amountMismatch && <p className="warn" role="status">Nominal pada bukti berbeda dengan nominal tagihan.</p>}
                <Field label="Nama pengirim / rekening pengirim *" htmlFor="proofSender" error={errors.proofSender}>
                  <input id="proofSender" value={f.proofSender} onChange={(e) => set('proofSender', e.target.value)} />
                </Field>
                <Field label="Keterangan bukti" htmlFor="proofNote" hint="Misalnya: dikirim via WhatsApp pukul 10.12">
                  <input id="proofNote" value={f.proofNote} onChange={(e) => set('proofNote', e.target.value)} />
                </Field>
              </div>
            )}
          </>
        )}
      </fieldset>

      {willInvalidate && <p className="warn">Perubahan data ini membuat permintaan pemeriksaan sebelumnya tidak berlaku. Kamu perlu mengirim permintaan ulang.</p>}

      <div className="actions-row sticky">
        <button type="button" className="btn" onClick={() => back(order ? `/pesanan/${order.id}` : '/pesanan')}>Batal</button>
        <button type="submit" className="btn primary" disabled={busy}>{busy ? 'Menyimpan…' : order ? 'Simpan Perubahan' : 'Simpan Pesanan'}</button>
      </div>
    </form>
  )
}
