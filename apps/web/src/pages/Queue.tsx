import { useState } from 'react'
import { useStore } from '../store'
import type { Route } from '../router'
import { activeRequest, canForward, isForwarded, isVerifierRole, requestState, since, VERIFIER_LABEL } from '../logic'
import type { Order } from '../types'
import { Empty } from '../components/ui'
import { OrderRow } from './Orders'

const FILTERS = [
  { key: 'semua', label: 'Semua transfer' },
  { key: 'belum_diminta', label: 'Belum diminta' },
  { key: 'menunggu', label: 'Menunggu hasil' },
  { key: 'hasil_tersedia', label: 'Hasil tersedia' },
  { key: 'siap', label: 'Siap diteruskan' },
  { key: 'diteruskan', label: 'Sudah diteruskan' },
] as const
type FilterKey = (typeof FILTERS)[number]['key']

function match(o: Order, f: FilterKey) {
  if (f === 'semua') return true
  if (f === 'siap') return !isForwarded(o) && canForward(o).ok
  if (f === 'diteruskan') return isForwarded(o)
  return requestState(o) === f
}

export function Queue({ route }: { route: Route }) {
  const { data } = useStore()
  const role = data.settings.role
  const init = (route.query.get('f') as FilterKey) || (isVerifierRole(role) ? 'menunggu' : 'semua')
  const [f, setF] = useState<FilterKey>(FILTERS.some((x) => x.key === init) ? init : 'semua')
  const setFilter = (k: FilterKey) => { setF(k); history.replaceState(null, '', `#/pemeriksaan?f=${k}`) }

  const transfers = data.orders.filter((o) => o.method === 'transfer')
  const list = transfers.filter((o) => match(o, f)).sort((a, b) => {
    const ra = activeRequest(a)?.requestedAt ?? a.createdAt
    const rb = activeRequest(b)?.requestedAt ?? b.createdAt
    return ra.localeCompare(rb) // terlama di atas
  })
  const mine = isVerifierRole(role) ? transfers.filter((o) => requestState(o) === 'menunggu' && activeRequest(o)?.verifier === role).length : 0

  return (
    <>
      <h1>Pemeriksaan Pembayaran</h1>
      <p className="muted">Antrean pesanan Bank Transfer menurut keadaan pemeriksaan.</p>
      {isVerifierRole(role) && <p className="banner info">Ada <b>{mine}</b> permintaan yang ditujukan kepada {VERIFIER_LABEL[role]} dan menunggu hasil.</p>}
      <div className="chips" role="tablist" aria-label="Saring antrean">
        {FILTERS.map((x) => (
          <button key={x.key} role="tab" aria-selected={f === x.key} className={f === x.key ? 'chip on' : 'chip'} onClick={() => setFilter(x.key)}>
            {x.label} <span>{transfers.filter((o) => match(o, x.key)).length}</span>
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <Empty title="Tidak ada pesanan pada kategori ini."><button className="btn" onClick={() => setFilter('semua')}>Tampilkan semua</button></Empty>
      ) : (
        <ul className="list">
          {list.map((o) => {
            const r = activeRequest(o)
            return (
              <OrderRow key={o.id} o={o} from={`/pemeriksaan?f=${f}`}
                meta={r ? `Pemeriksa: ${VERIFIER_LABEL[r.verifier]} · ${r.result ? 'hasil sudah masuk' : `menunggu ${since(r.requestedAt)}`}` : undefined} />
            )
          })}
        </ul>
      )}
    </>
  )
}
