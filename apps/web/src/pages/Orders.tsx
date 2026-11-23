import { useState } from 'react'
import { useStore } from '../store'
import type { Route } from '../router'
import { dateTime, rupiah, searchOrders } from '../logic'
import type { Order } from '../types'
import { Empty, FollowBadge, PaymentBadge, SampleNote, StateBadge } from '../components/ui'

export function OrderRow({ o, from, meta }: { o: Order; from?: string; meta?: string }) {
  return (
    <li>
      <a className="row" href={`#/pesanan/${o.id}${from ? `?from=${encodeURIComponent(from)}` : ''}`}>
        <div className="row-main">
          <div className="row-title"><code>{o.code}</code> <SampleNote o={o} /></div>
          <div><strong>{o.customerName}</strong> · {o.service} ({o.pairs} psg)</div>
          <div className="muted small">{dateTime(o.createdAt)}</div>
          {meta && <div className="small meta">{meta}</div>}
        </div>
        <div className="row-side">
          <strong>{rupiah(o.amount)}</strong>
          <PaymentBadge o={o} />
          <StateBadge o={o} />
          <FollowBadge o={o} />
        </div>
      </a>
    </li>
  )
}

export function Orders({ route }: { route: Route }) {
  const { data } = useStore()
  const [q, setQState] = useState(route.query.get('q') ?? '')
  const list = searchOrders(data.orders, q)
  // Pencarian dipertahankan di URL agar tetap ada saat kembali dari Detail Pesanan.
  const setQ = (v: string) => {
    setQState(v)
    history.replaceState(null, '', `#/pesanan${v ? `?q=${encodeURIComponent(v)}` : ''}`)
  }

  return (
    <>
      <div className="page-head">
        <h1>Pesanan</h1>
        {data.settings.role === 'admin' && <a className="btn primary" href="#/pesanan/baru">+ Buat Pesanan</a>}
      </div>
      <input className="search" type="search" placeholder="Cari kode pesanan, nama pelanggan, atau nomor WA" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari pesanan" />
      {list.length === 0 ? (
        <Empty title={q ? 'Tidak ada pesanan yang cocok.' : 'Belum ada pesanan.'}>
          {q ? <button className="btn" onClick={() => setQ('')}>Hapus pencarian</button> : <a className="btn primary" href="#/pesanan/baru">Buat Pesanan</a>}
        </Empty>
      ) : <ul className="list">{list.map((o) => <OrderRow key={o.id} o={o} from={`/pesanan${q ? `?q=${encodeURIComponent(q)}` : ''}`} />)}</ul>}
    </>
  )
}
