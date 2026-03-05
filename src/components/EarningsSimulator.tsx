// ─── EarningsSimulator v3.0 — Performance & Sincronização Total ──────────────

import { useState, useMemo, useEffect } from 'react'
import { Icon, ICON_PATHS } from '@/components/Icon'
import { calcSimProjection, formatBRL, CATEGORY_LABELS, MUVV_RATES } from '@/utils/calculations'
import type { FreightCategory, SimPeriod } from '@/types'

interface Props { 
  initialGross: number; 
  initialCategory: FreightCategory;
}

const PERIODS: { id: SimPeriod; label: string }[] = [
  { id: 'daily',   label: 'Dia'    },
  { id: 'weekly',  label: 'Semana' },
  { id: 'monthly', label: 'Mês'    },
  { id: 'yearly',  label: 'Ano'    },
]

export function EarningsSimulator({ initialGross, initialCategory }: Props) {
  // ── ESTADOS INTERNOS ──────────────────────────────────────────────────────
  const [open,     setOpen]     = useState(false)
  const [period,   setPeriod]   = useState<SimPeriod>('weekly')
  const [gross,     setGross]    = useState(initialGross)
  const [category, setCategory] = useState<FreightCategory>(initialCategory)
  const [perDay,   setPerDay]   = useState(3)
  const [fuelKm,   setFuelKm]   = useState(0.45)
  const [avgKm,     setAvgKm]    = useState(25)

  // ── SINCRONIZAÇÃO COM A TELA PAI (REATIVIDADE v3.0) ────────────────────────
  // Este efeito garante que, se você mudar a categoria ou o valor no topo 
  // da OrderDetailScreen, o simulador acompanhe a mudança na hora.
  useEffect(() => {
    setGross(initialGross)
    setCategory(initialCategory)
  }, [initialGross, initialCategory])

  // ── MOTOR DE PROJEÇÃO ─────────────────────────────────────────────────────
  const proj = useMemo(
    () => calcSimProjection(gross, perDay, fuelKm, avgKm, category, period),
    [gross, perDay, fuelKm, avgKm, category, period]
  )
  
  const margin = proj.revenue > 0 ? Math.max(0, (proj.profit / proj.revenue) * 100) : 0

  const inp = 'w-full bg-white rounded-xl px-3 py-2 text-muvv-dark text-sm font-bold outline-none focus:ring-2 focus:ring-muvv-accent/25 transition'

  return (
    <div className="bg-white rounded-[20px] overflow-hidden shadow-card border border-muvv-border">
      {/* Header clicável */}
      <button 
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 cursor-pointer border-none bg-gradient-header-dark"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-muvv-accent/20 flex items-center justify-center">
            <Icon path={ICON_PATHS.trending} size={16} color="#1CC8C8" />
          </div>
          <div className="text-left">
            <p className="text-white font-extrabold text-sm">Simulador de Ganhos</p>
            {!open && (
              <p className="text-white/50 text-[11px]">
                {PERIODS.find(p => p.id === period)?.label} · R$ {formatBRL(proj.profit)} lucro
              </p>
            )}
          </div>
        </div>
        <div className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <Icon path={ICON_PATHS.arrowLeft} size={16} color="rgba(255,255,255,0.5)" />
        </div>
      </button>

      {open && (
        <div className="p-4 space-y-4 animate-fade-in">
          {/* Seleção de Período */}
          <div className="grid grid-cols-4 gap-1.5">
            {PERIODS.map(p => (
              <button key={p.id} onClick={() => setPeriod(p.id)}
                className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer border-none ${
                  period === p.id ? 'bg-muvv-accent text-white shadow-accent' : 'bg-muvv-primary text-muvv-muted hover:text-muvv-dark'
                }`}>
                {p.label}
              </button>
            ))}
          </div>

          {/* Inputs de Logística */}
          <div className="bg-muvv-primary rounded-2xl p-4 space-y-3">
            <p className="text-muvv-dark text-xs font-extrabold uppercase tracking-widest">🚛 Logística Estimada</p>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label:'Fretes/dia',     val:perDay,   set:(v:number)=>setPerDay(Math.max(1,v)),  step:1    },
                { label:'Km médio/frete',  val:avgKm,    set:(v:number)=>setAvgKm(Math.max(1,v)),   step:5    },
                { label:'Valor bruto R$',  val:gross,    set:(v:number)=>setGross(Math.max(1,v)),   step:50   },
                { label:'Custo R$/km',     val:fuelKm,   set:(v:number)=>setFuelKm(Math.max(0,v)), step:0.05 },
              ].map(({ label, val, set, step }) => (
                <div key={label}>
                  <label className="text-muvv-muted text-[11px] mb-1 block">{label}</label>
                  <input type="number" className={inp} value={val} step={step}
                    onChange={e => set(Number(e.target.value))} />
                </div>
              ))}
            </div>

            {/* Categoria (Botões de Feedback Rápido) */}
            <div>
              <label className="text-muvv-muted text-[11px] mb-1.5 block">Categoria de Veículo</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['light','heavy','zpe'] as FreightCategory[]).map(cat => (
                  <button key={cat} onClick={() => setCategory(cat)}
                    className={`py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer border-none leading-tight ${
                      category === cat ? 'bg-muvv-secondary text-white' : 'bg-white text-muvv-muted hover:text-muvv-dark'
                    }`}>
                    {CATEGORY_LABELS[cat].split(' (')[0]}<br/>
                    <span className="opacity-60 font-normal">{(MUVV_RATES[cat]*100).toFixed(0)}%</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Resultados da Projeção */}
          <div className="space-y-2">
            <p className="text-muvv-accent text-xs font-extrabold uppercase tracking-widest">💰 Projeção Financeira</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label:'Receita Bruta', val:proj.revenue,  color:'text-muvv-dark',  bg:'bg-white',        sub:`${proj.deliveries} fretes` },
                { label:'Taxa Muvv',     val:-proj.fees,     color:'text-red-400',    bg:'bg-red-50/60',    sub:'Custos plataforma' },
                { label:'Combustível',   val:-proj.fuel,     color:'text-orange-500', bg:'bg-orange-50/60',  sub:`${(proj.deliveries*avgKm).toFixed(0)} km totais` },
                {
                  label:'Lucro Líquido', val:proj.profit,
                  color: proj.profit >= 0 ? 'text-muvv-accent' : 'text-red-500',
                  bg:    proj.profit >= 0 ? 'bg-muvv-accent-light border border-muvv-accent/20' : 'bg-red-50',
                  sub: proj.profit >= 0 ? `${margin.toFixed(1)}% margem` : 'Alerta de Prejuízo ⚠',
                },
              ].map(({ label, val, color, bg, sub }) => (
                <div key={label} className={`rounded-xl p-3 ${bg}`}>
                  <p className={`text-[10px] font-semibold ${color} opacity-70 mb-0.5`}>{label}</p>
                  <p className={`text-base font-black ${color}`}>{val < 0 ? '-' : ''}R$ {formatBRL(Math.abs(val))}</p>
                  <p className="text-muvv-muted text-[9px]">{sub}</p>
                </div>
              ))}
            </div>

            {/* Barra de Saúde Financeira */}
            <div className="h-1.5 bg-muvv-border rounded-full overflow-hidden mt-2">
              <div 
                className="h-full bg-gradient-road rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, margin)}%` }} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}