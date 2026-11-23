import type { ReactNode } from 'react'
import { useStore } from '../store'
import { ROLE_LABEL } from '../logic'
import type { Role } from '../types'

const NAV = [
  { to: '#/', key: '', label: 'Beranda', icon: '⌂' },
  { to: '#/pesanan', key: 'pesanan', label: 'Pesanan', icon: '☰' },
  { to: '#/pemeriksaan', key: 'pemeriksaan', label: 'Pemeriksaan', icon: '✓' },
  { to: '#/bantuan', key: 'bantuan', label: 'Bantuan', icon: '?' },
]

export function Layout({ section, children }: { section: string; children: ReactNode }) {
  const { data, setData, toasts, storageOk } = useStore()
  const role = data.settings.role
  const setRole = (r: Role) => setData({ ...data, settings: { ...data.settings, role: r } })

  return (
    <div className="app">
      <header className="topbar">
        <a href="#/" className="brand">Fleffy<span>Kasir Laundry Sepatu</span></a>
        <nav className="nav-desktop" aria-label="Navigasi utama">
          {NAV.map((n) => <a key={n.key} href={n.to} className={section === n.key ? 'active' : ''} aria-current={section === n.key ? 'page' : undefined}>{n.label}</a>)}
        </nav>
        <label className="role">
          <span>Masuk sebagai</span>
          <select value={role} onChange={(e) => setRole(e.target.value as Role)} aria-label="Peran pengguna">
            {(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{data.settings.names[r]} — {ROLE_LABEL[r]}</option>)}
          </select>
        </label>
      </header>
      {!storageOk && <div className="banner err">Penyimpanan browser tidak tersedia. Perubahan tidak akan tersimpan setelah halaman ditutup.</div>}
      <main className="content">{children}</main>
      <nav className="nav-mobile" aria-label="Navigasi utama">
        {NAV.map((n) => (
          <a key={n.key} href={n.to} className={section === n.key ? 'active' : ''} aria-current={section === n.key ? 'page' : undefined}>
            <span aria-hidden>{n.icon}</span>{n.label}
          </a>
        ))}
      </nav>
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className={`toast ${t.kind}`}>{t.text}</div>)}
      </div>
    </div>
  )
}
