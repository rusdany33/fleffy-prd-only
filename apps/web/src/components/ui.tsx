import type { ReactNode } from 'react'
import type { Order } from '../types'
import { activeRequest, followUpLabel, fundsConfirmed, OUTCOME_LABEL, requestState, STATE_LABEL } from '../logic'

export function Badge({ tone, children }: { tone: 'gray' | 'blue' | 'amber' | 'green' | 'red'; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

/** FR-01: catatan pembayaran selalu terpisah dari kepastian dana. */
export function PaymentBadge({ o }: { o: Order }) {
  if (o.method === 'tunai') return <Badge tone="gray">Tunai{o.paymentRecordedAt ? ' · dicatat' : ' · belum dicatat'}</Badge>
  if (!o.paymentRecordedAt) return <Badge tone="gray">Transfer · belum dicatat</Badge>
  if (fundsConfirmed(o)) return <Badge tone="green">✓ Dana dipastikan</Badge>
  return <Badge tone="amber">Dicatat · dana belum dipastikan</Badge>
}

export function StateBadge({ o }: { o: Order }) {
  const st = requestState(o)
  if (st === 'tidak_perlu') return null
  if (st === 'hasil_tersedia') {
    const out = activeRequest(o)!.result!.outcome
    return <Badge tone={out === 'sesuai' ? 'green' : 'red'}>Hasil: {OUTCOME_LABEL[out]}</Badge>
  }
  return <Badge tone={st === 'menunggu' ? 'blue' : 'gray'}>{st === 'menunggu' ? '⏳ ' : ''}{STATE_LABEL[st]}</Badge>
}

export function FollowBadge({ o }: { o: Order }) {
  const f = followUpLabel(o)
  return <Badge tone={f === 'Diteruskan ke teknisi' ? 'green' : f === 'Siap diteruskan' ? 'blue' : 'gray'}>{f}</Badge>
}

export function Field({ label, error, hint, children, htmlFor }: { label: string; error?: string; hint?: string; children: ReactNode; htmlFor: string }) {
  return (
    <div className={`field${error ? ' has-error' : ''}`}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && !error && <small className="hint">{hint}</small>}
      {error && <small className="error" role="alert">{error}</small>}
    </div>
  )
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="empty"><p><strong>{title}</strong></p>{children}</div>
}

export function SampleNote({ o }: { o: Order }) {
  return o.sample ? <span className="sample" title="Data contoh fiktif">Contoh</span> : null
}
