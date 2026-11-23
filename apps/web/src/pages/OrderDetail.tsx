import { useState } from 'react'
import { useStore } from '../store'
import type { Route } from '../router'
import {
  activeRequest, canForward, canRequest, dateTime, decide, fundsConfirmed, isForwarded, isVerifierRole, latestDecision,
  OUTCOME_LABEL, requestState, ROLE_LABEL, rupiah, sendRequest, since, STATE_LABEL, submitResult, VERIFIER_LABEL,
} from '../logic'
import type { Order, Outcome, Verifier } from '../types'
import { Empty, FollowBadge, PaymentBadge, SampleNote, StateBadge } from '../components/ui'

export function OrderDetail({ order: o, route }: { order?: Order; route: Route }) {
  const from = route.query.get('from')
  if (!o) return <Empty title="Pesanan tidak ditemukan."><a className="btn" href="#/pesanan">Kembali ke Pesanan</a></Empty>
  return (
    <>
      <a className="back" href={`#${from ?? '/pesanan'}`}>← Kembali{from?.startsWith('/pemeriksaan') ? ' ke antrean' : ' ke Pesanan'}</a>
      {/* Identitas pesanan & nominal selalu terlihat (FR-02) */}
      <div className="order-head">
        <div>
          <div><code className="big">{o.code}</code> <SampleNote o={o} /></div>
          <h1>{o.customerName}</h1>
        </div>
        <div className="amount">{rupiah(o.amount)}</div>
      </div>
      <div className="badges"><PaymentBadge o={o} /><StateBadge o={o} /><FollowBadge o={o} /></div>
      <Summary o={o} />
      <Payment o={o} />
      {o.method === 'transfer' && <Verification o={o} />}
      <FollowUp o={o} />
      <History o={o} />
    </>
  )
}

function Summary({ o }: { o: Order }) {
  const { data } = useStore()
  return (
    <section className="card" id="ringkasan">
      <div className="card-head"><h2>Ringkasan pesanan</h2>{data.settings.role === 'admin' && <a className="btn sm" href={`#/pesanan/${o.id}/ubah`}>Ubah</a>}</div>
      <dl className="kv">
        <dt>Pelanggan</dt><dd>{o.customerName}{o.whatsapp && <> · <a href={`https://wa.me/${o.whatsapp.replace(/^0/, '62').replace(/\D/g, '')}`} target="_blank" rel="noreferrer">{o.whatsapp}</a></>}</dd>
        <dt>Layanan</dt><dd>{o.service} · {o.pairs} pasang</dd>
        <dt>Tagihan</dt><dd><strong>{rupiah(o.amount)}</strong></dd>
        <dt>Dibuat</dt><dd>{dateTime(o.createdAt)}</dd>
        {o.note && <><dt>Catatan</dt><dd>{o.note}</dd></>}
      </dl>
    </section>
  )
}

function Payment({ o }: { o: Order }) {
  const confirmed = fundsConfirmed(o)
  const r = activeRequest(o)
  return (
    <section className="card" id="pembayaran">
      <h2>Pembayaran</h2>
      {/* FR-01: dua informasi terpisah */}
      <div className="two-facts">
        <div className="fact">
          <span className="fact-label">Catatan pembayaran (oleh kasir)</span>
          {o.paymentRecordedAt
            ? <span>{o.method === 'transfer' ? 'Bank Transfer' : 'Tunai'} {rupiah(o.amount)} dicatat {dateTime(o.paymentRecordedAt)}</span>
            : <span className="muted">Belum dicatat</span>}
        </div>
        {o.method === 'transfer' && (
          <div className={`fact ${confirmed ? 'ok' : 'pending'}`}>
            <span className="fact-label">Penerimaan dana (oleh pemeriksa)</span>
            {confirmed
              ? <span>✓ Dana dipastikan oleh {r!.result!.byName} ({VERIFIER_LABEL[r!.result!.by as Verifier]}) · {dateTime(r!.result!.at)}</span>
              : <span>Belum dipastikan. <a href="#/bantuan/status">Apa artinya?</a></span>}
          </div>
        )}
      </div>
      {o.method === 'transfer' && (
        <>
          <h3>Bukti dari pelanggan</h3>
          {o.proof ? (
            <dl className="kv">
              <dt>Nominal bukti</dt>
              <dd>{rupiah(o.proof.amount)} {o.proof.amount !== o.amount && <span className="warn-inline">≠ tagihan {rupiah(o.amount)}</span>}</dd>
              <dt>Waktu transfer</dt><dd>{dateTime(o.proof.transferAt)}</dd>
              <dt>Pengirim</dt><dd>{o.proof.sender}</dd>
              {o.proof.note && <><dt>Keterangan</dt><dd>{o.proof.note}</dd></>}
            </dl>
          ) : <p className="muted">Belum ada bukti transfer dari pelanggan.</p>}
        </>
      )}
    </section>
  )
}

function Verification({ o }: { o: Order }) {
  const { data, run } = useStore()
  const role = data.settings.role
  const st = requestState(o)
  const r = activeRequest(o)
  const can = canRequest(o)
  const [verifier, setVerifier] = useState<Verifier>(r?.verifier ?? 'owner')
  const [outcome, setOutcome] = useState<Outcome>('sesuai')
  const [note, setNote] = useState('')
  const contact = data.settings.contacts.find((c) => c.verifier === r?.verifier)
  const past = o.requests.filter((x) => x.id !== r?.id)

  return (
    <section className="card" id="pemeriksaan">
      <div className="card-head"><h2>Pemeriksaan pembayaran</h2><span className="pill">{STATE_LABEL[st]}</span></div>

      {r && (
        <div className="req">
          <dl className="kv">
            <dt>Pemeriksa dituju</dt><dd>{VERIFIER_LABEL[r.verifier]}{contact && ` — ${contact.name}`}</dd>
            <dt>Dikirim</dt><dd>{dateTime(r.requestedAt)} oleh {r.requestedBy}</dd>
            <dt>Data yang diperiksa</dt><dd><code>{r.snapshot.code}</code> · {r.snapshot.customerName} · {rupiah(r.snapshot.amount)}</dd>
          </dl>
          {r.result ? (
            <div className={`result ${r.result.outcome}`}>
              <strong>Hasil: {OUTCOME_LABEL[r.result.outcome]}</strong>
              <div className="small">oleh {r.result.byName} ({ROLE_LABEL[r.result.by]}) · {dateTime(r.result.at)}</div>
              {r.result.note && <div>“{r.result.note}”</div>}
            </div>
          ) : (
            <div className="waiting">
              <strong>⏳ Menunggu hasil sejak {since(r.requestedAt)}</strong>
              <p className="small">Permintaan sudah dikirim, tetapi <b>dana belum dipastikan</b>. Sistem tidak dapat memperkirakan kapan hasil tersedia.</p>
              {role === 'admin' && <WaitingHelp o={o} />}
            </div>
          )}
        </div>
      )}

      {/* Admin: kirim permintaan (FR-03, FR-06) */}
      {role === 'admin' && can.ok && (
        <div className="sub">
          <h3>{r ? 'Kirim permintaan ulang' : 'Minta pemeriksaan'}</h3>
          <p className="small muted">Data pesanan dipakai otomatis: <code>{o.code}</code> · {o.customerName} · <b>{rupiah(o.amount)}</b></p>
          <label className="inline">Pemeriksa
            <select value={verifier} onChange={(e) => setVerifier(e.target.value as Verifier)}>
              {data.settings.contacts.map((c) => <option key={c.verifier} value={c.verifier}>{VERIFIER_LABEL[c.verifier]} — {c.name}</option>)}
            </select>
          </label>
          <button className="btn primary" onClick={() => run((d) => sendRequest(d, o.id, verifier, data.settings.names.admin), `Permintaan pemeriksaan dikirim ke ${VERIFIER_LABEL[verifier]}.`)}>
            Kirim permintaan pemeriksaan
          </button>
        </div>
      )}
      {role === 'admin' && !can.ok && !r && <p className="muted">{can.reason}</p>}
      {!r && st === 'belum_diminta' && role !== 'admin' && <p className="muted">Belum ada permintaan pemeriksaan untuk pesanan ini.</p>}

      {/* Pemeriksa: input hasil (US-07, NFR-05) */}
      {isVerifierRole(role) && r && !r.result && (
        <div className="sub">
          <h3>Masukkan hasil pemeriksaan</h3>
          <p className="small">Periksa mutasi rekening untuk <b>{rupiah(r.snapshot.amount)}</b>{o.proof && <> dari <b>{o.proof.sender}</b> sekitar {dateTime(o.proof.transferAt)}</>}.</p>
          <div className="seg" role="radiogroup" aria-label="Hasil pemeriksaan">
            {(['sesuai', 'tidak_sesuai', 'perlu_klarifikasi'] as Outcome[]).map((x) => (
              <label key={x} className={outcome === x ? 'on' : ''}><input type="radio" name="outcome" checked={outcome === x} onChange={() => setOutcome(x)} />{OUTCOME_LABEL[x]}</label>
            ))}
          </div>
          <label className="block">Catatan {outcome !== 'sesuai' && '*'}
            <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={outcome === 'sesuai' ? 'Opsional, misalnya: mutasi masuk a.n. …' : 'Jelaskan apa yang tidak sesuai / perlu diklarifikasi'} />
          </label>
          <button className="btn primary" onClick={() => { if (run((d) => submitResult(d, o.id, role, data.settings.names[role], outcome, note), 'Hasil pemeriksaan disimpan.')) setNote('') }}>
            Simpan hasil
          </button>
        </div>
      )}

      {past.length > 0 && (
        <details className="past">
          <summary>Permintaan sebelumnya ({past.length})</summary>
          <ul>{past.map((p) => (
            <li key={p.id}>{dateTime(p.requestedAt)} → {VERIFIER_LABEL[p.verifier]} · {rupiah(p.snapshot.amount)} · {p.result ? OUTCOME_LABEL[p.result.outcome] : 'tanpa hasil'} <span className="muted">(tidak berlaku)</span></li>
          ))}</ul>
        </details>
      )}
    </section>
  )
}

function WaitingHelp({ o }: { o: Order }) {
  const { data, toast } = useStore()
  const r = activeRequest(o)!
  const main = data.settings.contacts.find((c) => c.verifier === r.verifier)
  const alt = data.settings.contacts.find((c) => c.verifier !== r.verifier)
  const msg = `Halo kak ${o.customerName}, pembayaran untuk pesanan ${o.code} sebesar ${rupiah(o.amount)} sudah kami catat dan sedang dalam pemeriksaan. Kami kabari lagi setelah pemeriksaan selesai ya.`
  return (
    <div className="help-box">
      <b>Langkah tindak lanjut</b>
      <ol className="small">{data.settings.procedure.map((p, i) => <li key={i}>{p}</li>)}</ol>
      <div className="actions-row">
        {main && <a className="btn sm" href={`tel:${main.phone}`}>Hubungi {main.name}</a>}
        {alt && <a className="btn sm" href={`tel:${alt.phone}`}>Hubungi {alt.name} (pengganti)</a>}
      </div>
      <b>Penjelasan untuk pelanggan</b>
      <p className="quote small">{msg}</p>
      <button className="btn sm" onClick={() => { navigator.clipboard?.writeText(msg).then(() => toast('ok', 'Pesan disalin.'), () => toast('err', 'Gagal menyalin.')) }}>Salin pesan</button>
      <p className="small"><a href="#/bantuan/menunggu">Panduan lengkap saat menunggu</a></p>
    </div>
  )
}

function FollowUp({ o }: { o: Order }) {
  const { data, run } = useStore()
  const role = data.settings.role
  const can = canForward(o)
  const forwarded = isForwarded(o)
  const last = latestDecision(o)
  const [holding, setHolding] = useState(false)
  const [reason, setReason] = useState('')
  const r = activeRequest(o)

  return (
    <section className="card" id="tindak-lanjut">
      <h2>Tindak lanjut</h2>
      {forwarded ? (
        <div className="result sesuai"><strong>✓ Diteruskan ke teknisi</strong><div className="small">oleh {last!.by} · {dateTime(last!.at)}{r?.result && <> · dasar: hasil {OUTCOME_LABEL[r.result.outcome]} dari {r.result.byName}</>}</div></div>
      ) : (
        <>
          {can.ok
            ? <p>{o.method === 'transfer' ? <>Hasil pemeriksaan <b>Sesuai</b> dari {r!.result!.byName} untuk pesanan ini. Pesanan boleh diteruskan.</> : 'Pembayaran tunai. Pesanan boleh diteruskan.'}</p>
            : <p className="warn">Tahan pesanan: {can.reason}</p>}
          {last?.type === 'tahan' && <p className="small muted">Keputusan terakhir: Tahan — “{last.reason}” ({last.by}, {dateTime(last.at)})</p>}
          {role === 'admin' ? (
            <div className="actions-row">
              <button className="btn primary" disabled={!can.ok} aria-disabled={!can.ok} title={can.reason}
                onClick={() => run((d) => decide(d, o.id, 'teruskan', '', role, data.settings.names.admin), 'Pesanan diteruskan ke teknisi.')}>
                Teruskan ke teknisi
              </button>
              <button className="btn" onClick={() => setHolding((h) => !h)}>Catat keputusan Tahan</button>
            </div>
          ) : <p className="small muted">Keputusan dicatat oleh Admin.</p>}
          {holding && role === 'admin' && (
            <div className="sub">
              <label className="block">Alasan menahan *
                <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Misalnya: menunggu hasil pemeriksaan Owner" />
              </label>
              <button className="btn" onClick={() => { if (run((d) => decide(d, o.id, 'tahan', reason, role, data.settings.names.admin), 'Keputusan Tahan dicatat.')) { setHolding(false); setReason('') } }}>Simpan keputusan Tahan</button>
            </div>
          )}
        </>
      )}
    </section>
  )
}

function History({ o }: { o: Order }) {
  return (
    <section className="card" id="riwayat">
      <h2>Riwayat</h2>
      <ol className="timeline">
        {[...o.history].reverse().map((h, i) => <li key={i}><span className="small muted">{dateTime(h.at)} · {h.by}</span><div>{h.text}</div></li>)}
      </ol>
    </section>
  )
}
