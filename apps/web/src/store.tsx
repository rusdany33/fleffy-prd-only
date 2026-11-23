import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { AppData } from './types'
import { RuleError } from './logic'
import { seedData } from './seed'

const KEY = 'fleffy-prd-only:v1'

function load(): AppData {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const d = JSON.parse(raw) as AppData
      if (d && d.version === 1 && Array.isArray(d.orders)) return d
    }
  } catch { /* storage tidak tersedia → pakai data contoh */ }
  return seedData()
}

interface Toast { id: number; kind: 'ok' | 'err'; text: string }

interface Store {
  data: AppData
  /** Jalankan aksi; kembalikan true jika berhasil. Error aturan ditampilkan sebagai toast. */
  run: (fn: (d: AppData) => AppData, okText?: string) => boolean
  setData: (d: AppData) => void
  toasts: Toast[]
  toast: (kind: Toast['kind'], text: string) => void
  storageOk: boolean
}

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(load)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [storageOk, setStorageOk] = useState(true)

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(data)) } catch { setStorageOk(false) }
  }, [data])

  const toast = useCallback((kind: Toast['kind'], text: string) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, kind, text }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800)
  }, [])

  const run = useCallback((fn: (d: AppData) => AppData, okText?: string) => {
    try {
      const next = fn(data)
      setData(next)
      if (okText) toast('ok', okText)
      return true
    } catch (e) {
      toast('err', e instanceof RuleError || e instanceof Error ? e.message : 'Terjadi kesalahan. Coba lagi.')
      return false
    }
  }, [data, toast])

  return <Ctx.Provider value={{ data, run, setData, toasts, toast, storageOk }}>{children}</Ctx.Provider>
}

export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error('StoreProvider missing')
  return s
}
