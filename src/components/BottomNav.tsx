import { Icon, ICON_PATHS } from '@/components/Icon'
import type { NavTab } from '@/types'

interface Props { active: NavTab; onChange: (tab: NavTab) => void }

const TABS: { id: NavTab; label: string; iconPath: string }[] = [
  { id: 'home',    label: 'Início',     iconPath: ICON_PATHS.home   },
  { id: 'docs',    label: 'Docs',       iconPath: ICON_PATHS.docs   },
  { id: 'wallet',  label: 'Carteira',   iconPath: ICON_PATHS.wallet },
  { id: 'profile', label: 'Perfil',     iconPath: ICON_PATHS.user   },
]

export function BottomNav({ active, onChange }: Props) {
  return (
    <nav aria-label="Navegação principal"
      className="h-[68px] bg-white border-t border-muvv-border flex items-center shadow-nav flex-shrink-0">
      {TABS.map(tab => {
        const on = active === tab.id
        return (
          <button key={tab.id} onClick={() => onChange(tab.id)}
            aria-current={on ? 'page' : undefined}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-2 h-full transition-all duration-200 cursor-pointer border-none bg-transparent relative">
            {/* Indicador ativo no topo */}
            <div className={`absolute top-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full transition-all duration-300 bg-muvv-accent ${on ? 'w-8' : 'w-0'}`} />
            <div className={`p-1.5 rounded-xl transition-all duration-200 ${on ? 'bg-muvv-accent/10' : ''}`}>
              <Icon path={tab.iconPath} size={21} color={on ? '#1CC8C8' : '#8AAEBB'} strokeWidth={on ? 2.2 : 1.6} />
            </div>
            <span className={`text-[10px] transition-all duration-200 ${on ? 'text-muvv-accent font-bold' : 'text-muvv-muted'}`}>
              {tab.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
