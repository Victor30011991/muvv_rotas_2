// ─── App.tsx v2.3 — Desktop layout sem max-w-[420px] ─────────────────────────
import { useState } from 'react'
import { BottomNav }         from '@/components/BottomNav'
import { Icon, ICON_PATHS }  from '@/components/Icon'
import { HomeScreen }        from '@/screens/HomeScreen'
import { DocsScreen }        from '@/screens/DocsScreen'
import { WalletScreen }      from '@/screens/WalletScreen'
import { OrderDetailScreen } from '@/screens/OrderDetailScreen'
import { ProfileScreen }     from '@/screens/ProfileScreen'
import type { Screen, NavTab, Freight } from '@/types'

const NAV_TABS: NavTab[] = ['home', 'docs', 'wallet', 'profile']

export default function App() {
  const [screen,        setScreen]        = useState<Screen>('home')
  const [activeFreight, setActiveFreight] = useState<Freight | null>(null)

  const handleOrderDetail = (freight: Freight) => {
    setActiveFreight(freight)
    setScreen('order')
  }

  const activeTab: NavTab = NAV_TABS.includes(screen as NavTab) ? (screen as NavTab) : 'home'

  return (
    // Mobile: max-w-[420px] centrado
    // Desktop (lg+): largura total, sem restrição
    <div className="w-screen h-screen flex flex-col bg-muvv-primary
                    max-w-[420px] mx-auto lg:max-w-none
                    relative overflow-hidden">
      {screen === 'order' && (
        <div className="absolute top-4 left-5 z-[600]">
          <button onClick={() => setScreen('home')} aria-label="Voltar"
            className="w-10 h-10 rounded-full flex items-center justify-center border-none cursor-pointer backdrop-blur-sm"
            style={{ background: 'rgba(255,255,255,0.2)' }}>
            <Icon path={ICON_PATHS.arrowLeft} size={18} color="white" strokeWidth={2.2} />
          </button>
        </div>
      )}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {screen === 'home'    && <HomeScreen onOrderDetail={handleOrderDetail} />}
        {screen === 'docs'    && <DocsScreen />}
        {screen === 'wallet'  && <WalletScreen />}
        {screen === 'order'   && <OrderDetailScreen freight={activeFreight} />}
        {screen === 'profile' && <ProfileScreen />}
      </div>
      {screen !== 'order' && (
        <BottomNav active={activeTab} onChange={(tab: NavTab) => setScreen(tab)} />
      )}
    </div>
  )
}
