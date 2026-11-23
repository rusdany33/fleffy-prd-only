import { useRoute } from './router'
import { useStore } from './store'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { Orders } from './pages/Orders'
import { OrderForm } from './pages/OrderForm'
import { OrderDetail } from './pages/OrderDetail'
import { Queue } from './pages/Queue'
import { HelpContacts, HelpIndex, HelpStatus, HelpWaiting } from './pages/Help'
import { Empty } from './components/ui'

export default function App() {
  const route = useRoute()
  const { data } = useStore()
  const [a, b, c] = route.path
  const find = (id?: string) => data.orders.find((o) => o.id === id)

  let page
  if (!a) page = <Home />
  else if (a === 'pesanan' && !b) page = <Orders route={route} />
  else if (a === 'pesanan' && b === 'baru') page = <OrderForm key="new" />
  else if (a === 'pesanan' && c === 'ubah') page = find(b) ? <OrderForm key={b} order={find(b)} /> : <OrderDetail route={route} />
  else if (a === 'pesanan') page = <OrderDetail key={b} order={find(b)} route={route} />
  else if (a === 'pemeriksaan') page = <Queue key={data.settings.role} route={route} />
  else if (a === 'bantuan' && b === 'status') page = <HelpStatus />
  else if (a === 'bantuan' && b === 'menunggu') page = <HelpWaiting />
  else if (a === 'bantuan' && b === 'kontak') page = <HelpContacts />
  else if (a === 'bantuan') page = <HelpIndex />
  else page = <Empty title="Halaman tidak ditemukan."><a className="btn" href="#/">Ke Beranda</a></Empty>

  return <Layout section={a ?? ''}>{page}</Layout>
}
