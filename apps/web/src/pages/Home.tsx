import { useStore } from '../store'
import { isForwarded, requestState, summary } from '../logic'
import { seedData } from '../seed'
import { OrderRow } from './Orders'

export function Home() {
  const { data, setData, toast } = useStore()
  const s = summary(data.orders)
  const name = data.settings.names[data.settings.role]
  const attention = data.orders
    .filter((o) => !isForwarded(o) && (requestState(o) === 'belum_diminta' || requestState(o) === 'hasil_tersedia'))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(0, 5)

  const reset = () => {
    if (!confirm('Kembalikan semua data ke data contoh? Data yang sudah kamu masukkan akan hilang.')) return
    setData({ ...seedData(), settings: { ...seedData().settings, role: data.settings.role } })
    toast('ok', 'Data contoh dimuat ulang.')
  }

  return (
    <>
      <h1>Halo, {name}</h1>
      <p className="muted">Ringkasan pembayaran Bank Transfer yang perlu diperiksa sebelum pesanan diteruskan ke teknisi.</p>
      <div className="stats">
        <a className="stat" href="#/pemeriksaan?f=belum_diminta"><b>{s.belum_diminta}</b><span>Belum diminta</span></a>
        <a className="stat" href="#/pemeriksaan?f=menunggu"><b>{s.menunggu}</b><span>Menunggu hasil</span></a>
        <a className="stat" href="#/pemeriksaan?f=hasil_tersedia"><b>{s.hasil_tersedia}</b><span>Hasil tersedia</span></a>
        <a className="stat good" href="#/pemeriksaan?f=siap"><b>{s.siap}</b><span>Siap diteruskan</span></a>
      </div>
      <div className="actions-row">
        <a className="btn primary" href="#/pesanan/baru">+ Buat Pesanan</a>
        <a className="btn" href="#/pemeriksaan">Buka antrean pemeriksaan</a>
      </div>
      <section className="card">
        <h2>Perlu tindakan</h2>
        {attention.length === 0 ? <p className="muted">Tidak ada pesanan yang perlu tindakan sekarang.</p> : (
          <ul className="list">{attention.map((o) => <OrderRow key={o.id} o={o} />)}</ul>
        )}
      </section>
      <p className="muted small">Aplikasi ini memakai data contoh fiktif yang ditandai “Contoh”. <button className="link" onClick={reset}>Muat ulang data contoh</button></p>
    </>
  )
}
