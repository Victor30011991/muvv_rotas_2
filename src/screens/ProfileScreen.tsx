// ─── ProfileScreen v2.4 ───────────────────────────────────────────────────────
// Integra: CheckMuvvCard (Módulo 4) + DiarioBordo (Módulo 3)

import { useState } from 'react'
import { Icon, ICON_PATHS } from '@/components/Icon'
import { CheckMuvvCard }    from '@/components/CheckMuvvCard'
import { DiarioBordo }      from '@/components/DiarioBordo'

const DRIVER_DATA = { name:'Marcos A. Piaui', id:'MV-2847', plan:'Motorista ZPE Premium', rating:4.9, avatar:'🚛' }
const STATS = [
  { label:'Fretes',  value:'127',    iconPath:ICON_PATHS.truck,    color:'#57A6C1' },
  { label:'Ganhos',  value:'R$ 24k', iconPath:ICON_PATHS.trending, color:'#1CC8C8' },
  { label:'Horas',   value:'840h',   iconPath:ICON_PATHS.clock,    color:'#DAA520' },
]
const MENU_ITEMS = [
  { iconPath:ICON_PATHS.shield, label:'Plano Premium ZPE Gold',  sub:'Ativo até Dez 2026',       color:'#DAA520' },
  { iconPath:ICON_PATHS.map,    label:'Rotas Favoritas',          sub:'Piauí e todo o Brasil',    color:'#57A6C1' },
  { iconPath:ICON_PATHS.wallet, label:'Dados Bancários',          sub:'PIX - Conta Muvv Pay',     color:'#1CC8C8' },
  { iconPath:ICON_PATHS.docs,   label:'Documentos',               sub:'3/4 verificados',          color:'#3D6B7D' },
]

type ProfileTab = 'perfil' | 'checkmuvv' | 'diario'
const TABS: { id: ProfileTab; icon: string; label: string }[] = [
  { id:'perfil',    icon:'👤', label:'Perfil'    },
  { id:'checkmuvv', icon:'🛡', label:'Check-Muvv' },
  { id:'diario',    icon:'📒', label:'Diário'    },
]

export function ProfileScreen() {
  const [tab, setTab] = useState<ProfileTab>('perfil')
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="bg-gradient-profile px-5 pt-10 pb-16 text-center">
        <div className="w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center text-4xl border-[3px] border-white"
             style={{ background:'linear-gradient(135deg,#1CC8C8,#57A6C1)', boxShadow:'0 8px 24px rgba(0,0,0,0.2)' }}>
          {DRIVER_DATA.avatar}
        </div>
        <h2 className="text-white text-xl font-extrabold mb-1">{DRIVER_DATA.name}</h2>
        <p className="text-white/70 text-sm">{DRIVER_DATA.plan} — ID #{DRIVER_DATA.id}</p>
        <div className="flex items-center justify-center gap-1 mt-2">
          {Array.from({ length: 5 }).map((_,i) => (
            <Icon key={i} path={ICON_PATHS.star} size={14} color="#DAA520" strokeWidth={0} />
          ))}
          <span className="text-muvv-prestige text-xs font-bold ml-1">{DRIVER_DATA.rating}</span>
        </div>
      </div>
      <div className="px-4 pb-5" style={{ marginTop:-24 }}>
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          {STATS.map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl p-3.5 shadow-card text-center">
              <Icon path={stat.iconPath} size={20} color={stat.color} />
              <p className="text-muvv-dark text-base font-extrabold mt-1.5 mb-0.5">{stat.value}</p>
              <p className="text-muvv-muted text-[10px]">{stat.label}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-1.5 mb-4 bg-muvv-primary rounded-xl p-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[11px] font-bold cursor-pointer border-none transition-all ${
                tab === t.id ? 'bg-white text-muvv-dark shadow-card-sm' : 'text-muvv-muted bg-transparent'
              }`}>
              <span>{t.icon}</span><span>{t.label}</span>
            </button>
          ))}
        </div>
        {tab === 'perfil' && (
          <div className="flex flex-col gap-2.5 animate-fade-in">
            {MENU_ITEMS.map(item => (
              <div key={item.label} role="button" tabIndex={0}
                className="bg-white rounded-2xl px-4 py-3.5 flex items-center gap-3.5 shadow-card-sm cursor-pointer hover:shadow-card transition-shadow">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                     style={{ background:`${item.color}15` }}>
                  <Icon path={item.iconPath} size={20} color={item.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-muvv-dark text-sm font-semibold truncate">{item.label}</p>
                  <p className="text-muvv-muted text-xs">{item.sub}</p>
                </div>
                <Icon path={ICON_PATHS.arrow} size={18} color="#8AAEBB" />
              </div>
            ))}
          </div>
        )}
        {tab === 'checkmuvv' && <div className="animate-fade-in"><CheckMuvvCard /></div>}
        {tab === 'diario'    && <div className="animate-fade-in"><DiarioBordo /></div>}
      </div>
    </div>
  )
}
