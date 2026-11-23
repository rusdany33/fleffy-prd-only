import { useState } from 'react'
import { useStore } from '../store'
import { VERIFIER_LABEL } from '../logic'
import type { Contact } from '../types'
import { Badge } from '../components/ui'

export function HelpIndex() {
  return (
    <>
      <h1>Bantuan Pemeriksaan</h1>
      <ul className="list">
        <li><a className="row" href="#/bantuan/status"><div className="row-main"><strong>Arti status pembayaran</strong><div className="muted small">Bedanya “dicatat” dan “dana dipastikan”.</div></div></a></li>
        <li><a className="row" href="#/bantuan/menunggu"><div className="row-main"><strong>Panduan saat menunggu</strong><div className="muted small">Apa yang dilakukan saat hasil pemeriksaan belum tersedia.</div></div></a></li>
        <li><a className="row" href="#/bantuan/kontak"><div className="row-main"><strong>Kontak pemeriksa</strong><div className="muted small">Siapa yang dapat dihubungi untuk memeriksa rekening.</div></div></a></li>
      </ul>
    </>
  )
}

export function HelpStatus() {
  return (
    <>
      <a className="back" href="#/bantuan">← Bantuan</a>
      <h1>Arti status pembayaran</h1>
      <section className="card">
        <h2>Dua informasi yang berbeda</h2>
        <table className="table">
          <thead><tr><th>Status</th><th>Artinya</th><th>Dicatat oleh</th></tr></thead>
          <tbody>
            <tr><td><Badge tone="amber">Dicatat · dana belum dipastikan</Badge></td><td>Kasir sudah mencatat pembayaran transfer. Uang <b>belum tentu</b> masuk rekening.</td><td>Admin / Kasir</td></tr>
            <tr><td><Badge tone="green">✓ Dana dipastikan</Badge></td><td>Pemeriksa sudah mengecek mutasi rekening dan hasilnya <b>Sesuai</b> untuk pesanan ini.</td><td>Owner / Finance</td></tr>
          </tbody>
        </table>
      </section>
      <section className="card">
        <h2>Keadaan pemeriksaan</h2>
        <dl className="kv">
          <dt>Belum diminta</dt><dd>Belum ada permintaan ke pemeriksa.</dd>
          <dt>Menunggu hasil</dt><dd>Permintaan sudah dikirim. Mengirim permintaan <b>bukan</b> berarti dana diterima.</dd>
          <dt>Hasil tersedia</dt><dd>Pemeriksa sudah memberi hasil: <b>Sesuai</b>, <b>Tidak sesuai</b>, atau <b>Perlu klarifikasi</b>.</dd>
        </dl>
      </section>
      <section className="card">
        <h2>Kapan pesanan boleh diteruskan?</h2>
        <p>Hanya jika hasil pemeriksaan untuk pesanan yang sama adalah <b>Sesuai</b>. Selain itu, pesanan ditahan.</p>
        <p className="small muted">Jika nominal atau data pelanggan diubah setelah permintaan dikirim, permintaan lama tidak berlaku dan perlu dikirim ulang.</p>
      </section>
    </>
  )
}

export function HelpWaiting() {
  const { data } = useStore()
  return (
    <>
      <a className="back" href="#/bantuan">← Bantuan</a>
      <h1>Panduan saat menunggu</h1>
      <section className="card">
        <h2>Prosedur usaha</h2>
        <ol>{data.settings.procedure.map((p, i) => <li key={i}>{p}</li>)}</ol>
        <p className="small muted">Prosedur ditetapkan oleh usaha. Aplikasi tidak memperkirakan kapan pemeriksaan selesai.</p>
      </section>
      <section className="card">
        <h2>Yang boleh dan tidak boleh disampaikan ke pelanggan</h2>
        <ul>
          <li>✓ “Pembayaran sudah kami catat dan sedang diperiksa.”</li>
          <li>✗ “Dana sudah masuk.” (sebelum ada hasil Sesuai)</li>
          <li>✗ “Pasti selesai dalam 10 menit.” (waktu pemeriksaan tidak diketahui)</li>
        </ul>
      </section>
      <a className="btn" href="#/bantuan/kontak">Lihat kontak pemeriksa</a>
    </>
  )
}

export function HelpContacts() {
  const { data, run } = useStore()
  const [edit, setEdit] = useState<Contact[] | null>(null)
  const isAdmin = data.settings.role === 'admin'

  const save = () => {
    if (!edit) return
    if (edit.some((c) => !c.name.trim() || !/^[0-9+\s-]{8,20}$/.test(c.phone.trim()))) {
      run(() => { throw new Error('Nama dan nomor telepon pemeriksa wajib diisi dengan benar.') })
      return
    }
    if (run((d) => ({ ...d, settings: { ...d.settings, contacts: edit, names: { ...d.settings.names, ...Object.fromEntries(edit.map((c) => [c.verifier, c.name.trim()])) } } }), 'Kontak pemeriksa disimpan.')) setEdit(null)
  }

  return (
    <>
      <a className="back" href="#/bantuan">← Bantuan</a>
      <div className="page-head"><h1>Kontak pemeriksa</h1>{isAdmin && !edit && <button className="btn sm" onClick={() => setEdit(data.settings.contacts.map((c) => ({ ...c })))}>Ubah</button>}</div>
      {(edit ?? data.settings.contacts).map((c, i) => (
        <section className="card" key={c.verifier}>
          <h2>{VERIFIER_LABEL[c.verifier]}</h2>
          {edit ? (
            <>
              <label className="block">Nama<input value={c.name} onChange={(e) => setEdit(edit.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} /></label>
              <label className="block">Telepon<input value={c.phone} onChange={(e) => setEdit(edit.map((x, j) => (j === i ? { ...x, phone: e.target.value } : x)))} /></label>
              <label className="block">Keterangan<input value={c.note} onChange={(e) => setEdit(edit.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)))} /></label>
            </>
          ) : (
            <>
              <p><strong>{c.name}</strong> · {c.phone}</p>
              <p className="small muted">{c.note}</p>
              <div className="actions-row">
                <a className="btn sm" href={`tel:${c.phone}`}>Telepon</a>
                <a className="btn sm" href={`https://wa.me/${c.phone.replace(/^0/, '62').replace(/\D/g, '')}`} target="_blank" rel="noreferrer">WhatsApp</a>
              </div>
            </>
          )}
        </section>
      ))}
      {edit && <div className="actions-row"><button className="btn" onClick={() => setEdit(null)}>Batal</button><button className="btn primary" onClick={save}>Simpan</button></div>}
    </>
  )
}
