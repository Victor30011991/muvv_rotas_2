// ─── WalletScreen v2.2 — Visão Motorista + Visão Plataforma Muvv ─────────────

import { useState, useMemo } from 'react'
import { AnimCounter }  from '@/components/AnimCounter'
import { WeeklyChart }  from '@/components/WeeklyChart'
import { Icon, ICON_PATHS } from '@/components/Icon'
import { calcSimProjection, calcMuvvProjection, formatBRL, MUVV_RATES } from '@/utils/calculations'
import type { Transaction, SimPeriod } from '@/types'

const BALANCE_BRL  = 844.2
const BALANCE_EUR  = 153.2
const WEEKLY_TOTAL = 2390
const WEEKLY_DATA  = [
  { value: 280 }, { value: 420 }, { value: 190 },
  { value: 560 }, { value: 340 }, { value: 480 }, { value: 120 },
]
const TRANSACTIONS: Transaction[] = [
  { id:1, label:'Frete Especial ZPE – Parnaíba', type:'credit', amount:432,   cat:'ZPE',     time:'Hoje, 14:30', euro:78.5 },
  { id:2, label:'Taxa Muvv (10%)',                type:'debit',  amount:-48,   cat:'Taxa',    time:'Hoje, 14:30'            },
  { id:3, label:'Frete Carro – Teresina',         type:'credit', amount:245,   cat:'Carro',   time:'Ontem'                  },
  { id:4, label:'Taxa Muvv (15%)',                type:'debit',  amount:-36.8, cat:'Taxa',    time:'Ontem'                  },
  { id:5, label:'Frete Caminhão – Luís Correia',  type:'credit', amount:660,   cat:'Caminhão',time:'28/05'                  },
  { id:6, label:'Taxa Muvv (12%)',                type:'debit',  amount:-79.2, cat:'Taxa',    time:'28/05'                  },
]

const PERIODS: { id: SimPeriod; label: string }[] = [
  { id: 'daily',   label: 'Dia'  },
  { id: 'weekly',  label: 'Sem'  },
  { id: 'monthly', label: 'Mês'  },
  { id: 'yearly',  label: 'Ano'  },
]

type WalletTab = 'driver' | 'platform'

export function WalletScreen() {
  const [tab, setTab] = useState<WalletTab>('driver')

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="bg-gradient-wallet px-5 pt-7 pb-9 rounded-b-[28px]">
        <p className="text-white/70 text-sm mb-1">Carteira Muvv</p>
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-white/70 text-xl">R$</span>
          <span className="text-white text-5xl font-black leading-none">
            <AnimCounter value={BALANCE_BRL} decimals={2} />
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/12 rounded-2xl p-3 backdrop-blur-sm border border-white/20">
            <p className="text-white/60 text-[11px] mb-0.5">Real Brasileiro</p>
            <p className="text-white text-[17px] font-bold">R$ <AnimCounter value={BALANCE_BRL} decimals={2} /></p>
          </div>
          <div className="rounded-2xl p-3 backdrop-blur-sm border border-muvv-prestige/35"
               style={{ background: 'rgba(218,165,32,0.2)' }}>
            <p className="text-muvv-prestige text-[11px] font-semibold mb-0.5">Euro · ZPE</p>
            <p className="text-yellow-300 text-[17px] font-bold">€ <AnimCounter value={BALANCE_EUR} decimals={2} /></p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4" style={{ marginTop: -8 }}>
        {/* Gráfico semanal */}
        <div className="bg-white rounded-[18px] p-4 shadow-card">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-muvv-muted text-xs">Esta semana</p>
              <p className="text-muvv-dark text-xl font-black">R$ {WEEKLY_TOTAL.toLocaleString('pt-BR')},00</p>
            </div>
            <span className="bg-muvv-accent-light text-muvv-accent text-xs font-bold px-3 py-1 rounded-xl">+18% ↑</span>
          </div>
          <WeeklyChart data={WEEKLY_DATA} />
        </div>

        {/* Seletor de visão */}
        <div className="grid grid-cols-2 gap-2 bg-muvv-primary rounded-2xl p-1">
          <button onClick={() => setTab('driver')}
            className={`py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer border-none ${
              tab === 'driver' ? 'bg-white text-muvv-dark shadow-card-sm' : 'text-muvv-muted bg-transparent'
            }`}>
            🚛 Meus Ganhos
          </button>
          <button onClick={() => setTab('platform')}
            className={`py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer border-none ${
              tab === 'platform' ? 'bg-white text-muvv-dark shadow-card-sm' : 'text-muvv-muted bg-transparent'
            }`}>
            🏢 Plataforma Muvv
          </button>
        </div>

        {tab === 'driver' && <DriverView />}
        {tab === 'platform' && <PlatformView />}

        {/* Extrato */}
        <h3 className="text-muvv-dark text-[15px] font-bold">Extrato Detalhado</h3>
        <div className="flex flex-col gap-2">
          {TRANSACTIONS.map(tx => (
            <div key={tx.id} className="bg-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-card-sm">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-base ${
                tx.type === 'credit' ? 'bg-muvv-accent-light' : 'bg-red-50'
              }`}>
                {tx.type === 'credit' ? '↑' : '↓'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-muvv-dark text-[13px] font-semibold truncate">{tx.label}</p>
                <p className="text-muvv-muted text-[11px]">{tx.time}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`text-[15px] font-bold ${tx.type === 'credit' ? 'text-muvv-accent' : 'text-red-400'}`}>
                  {tx.type === 'credit' ? '+' : ''}R$ {Math.abs(tx.amount).toFixed(2).replace('.', ',')}
                </p>
                {tx.euro && <p className="text-muvv-prestige text-[10px]">≈ €{tx.euro}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Sub-painel: Visão do Motorista ────────────────────────────────────────────
function DriverView() {
  const [period,  setPeriod]  = useState<SimPeriod>('weekly')
  const [gross,   setGross]   = useState(480)
  const [perDay,  setPerDay]  = useState(3)
  const [fuelKm,  setFuelKm]  = useState(0.45)
  const [avgKm,   setAvgKm]   = useState(30)

  // Usa taxa média (heavy) para simulação padrão da carteira
  const proj = useMemo(
    () => calcSimProjection(gross, perDay, fuelKm, avgKm, 'heavy', period),
    [gross, perDay, fuelKm, avgKm, period]
  )

  const inp = 'w-full bg-muvv-primary rounded-xl px-3 py-2 text-muvv-dark text-sm font-bold outline-none focus:ring-2 focus:ring-muvv-accent/25'

  return (
    <div className="bg-white rounded-[20px] shadow-card border border-muvv-border overflow-hidden">
      <div className="bg-gradient-header-dark px-4 py-3 flex items-center gap-3">
        <Icon path={ICON_PATHS.trending} size={18} color="#1CC8C8" />
        <div>
          <p className="text-white font-extrabold text-sm">Simulador — Meus Ganhos</p>
          <p className="text-white/50 text-[11px]">Bruto – Taxa Muvv – Combustível = Lucro</p>
        </div>
      </div>
      <div className="p-4 space-y-4">
        {/* Período */}
        <div className="grid grid-cols-4 gap-1.5">
          {PERIODS.map(p => (
            <button key={p.id} onClick={() => setPeriod(p.id)}
              className={`py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border-none ${
                period === p.id ? 'bg-muvv-accent text-white' : 'bg-muvv-primary text-muvv-muted'
              }`}>{p.label}</button>
          ))}
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { label:'Fretes/dia',   val:perDay, set:(v:number)=>setPerDay(Math.max(1,v)),  step:1   },
            { label:'Km/frete',     val:avgKm,  set:(v:number)=>setAvgKm(Math.max(1,v)),   step:5   },
            { label:'Valor bruto R$',val:gross, set:(v:number)=>setGross(Math.max(1,v)),   step:50  },
            { label:'Comb. R$/km',  val:fuelKm, set:(v:number)=>setFuelKm(Math.max(0,v)), step:0.05},
          ].map(({ label, val, set, step }) => (
            <div key={label}>
              <label className="text-muvv-muted text-[11px] mb-1 block">{label}</label>
              <input type="number" className={inp} value={val} step={step}
                onChange={e => set(Number(e.target.value))} />
            </div>
          ))}
        </div>

        {/* Resultados */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label:'Receita Bruta',  val:proj.revenue, color:'text-muvv-dark',  bg:'bg-muvv-primary', sub:`${proj.deliveries} fretes` },
            { label:'Taxa Muvv (12%)',val:-proj.fees,    color:'text-red-400',    bg:'bg-red-50',       sub:'Descontado' },
            { label:'Combustível',    val:-proj.fuel,    color:'text-orange-500', bg:'bg-orange-50',    sub:`${(proj.deliveries*avgKm).toFixed(0)} km` },
            { label:'Lucro Líquido',  val:proj.profit,
              color: proj.profit >= 0 ? 'text-muvv-accent' : 'text-red-500',
              bg:    proj.profit >= 0 ? 'bg-muvv-accent-light border border-muvv-accent/20' : 'bg-red-50',
              sub: proj.revenue > 0 ? `${Math.max(0,(proj.profit/proj.revenue*100)).toFixed(1)}% margem` : '—' },
          ].map(({ label, val, color, bg, sub }) => (
            <div key={label} className={`rounded-xl p-3 ${bg}`}>
              <p className={`text-[10px] font-semibold ${color} opacity-60 mb-0.5`}>{label}</p>
              <p className={`text-base font-black ${color}`}>{val < 0 ? '-' : ''}R$ {formatBRL(Math.abs(val))}</p>
              <p className="text-muvv-muted text-[9px]">{sub}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Sub-painel: Visão da Plataforma Muvv (empresa) ────────────────────────────
function PlatformView() {
  const [period,       setPeriod]       = useState<SimPeriod>('monthly')
  const [lightPerDay,  setLightPerDay]  = useState(8)
  const [lightAvgG,    setLightAvgG]    = useState(350)
  const [heavyPerDay,  setHeavyPerDay]  = useState(5)
  const [heavyAvgG,    setHeavyAvgG]    = useState(700)
  const [zpePerDay,    setZpePerDay]    = useState(2)
  const [zpeAvgG,      setZpeAvgG]      = useState(1200)
  const [svcPerFreight,setSvcPerFreight]= useState(30)

  const proj = useMemo(
    () => calcMuvvProjection(lightPerDay, lightAvgG, heavyPerDay, heavyAvgG, zpePerDay, zpeAvgG, svcPerFreight, period),
    [lightPerDay, lightAvgG, heavyPerDay, heavyAvgG, zpePerDay, zpeAvgG, svcPerFreight, period]
  )

  const inp = 'w-full bg-muvv-primary rounded-xl px-2 py-1.5 text-muvv-dark text-sm font-bold outline-none focus:ring-2 focus:ring-muvv-secondary/25'

  return (
    <div className="bg-white rounded-[20px] shadow-card border border-muvv-border overflow-hidden">
      <div className="bg-gradient-header-blue px-4 py-3 flex items-center gap-3">
        <Icon path={ICON_PATHS.star} size={18} color="#DAA520" strokeWidth={0} />
        <div>
          <p className="text-white font-extrabold text-sm">Faturamento — Plataforma Muvv</p>
          <p className="text-white/50 text-[11px]">Projeção de receita da empresa por período</p>
        </div>
      </div>
      <div className="p-4 space-y-4">
        {/* Período */}
        <div className="grid grid-cols-4 gap-1.5">
          {PERIODS.map(p => (
            <button key={p.id} onClick={() => setPeriod(p.id)}
              className={`py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border-none ${
                period === p.id ? 'bg-muvv-secondary text-white' : 'bg-muvv-primary text-muvv-muted'
              }`}>{p.label}</button>
          ))}
        </div>

        {/* Inputs por categoria */}
        <div className="space-y-3">
          {(([
            { label:'🚗 Carros/dia',    perDay:lightPerDay, setPerDay:setLightPerDay, avgG:lightAvgG, setAvgG:setLightAvgG, rate:MUVV_RATES.light, color:'#57A6C1' },
            { label:'🚛 Caminhões/dia', perDay:heavyPerDay, setPerDay:setHeavyPerDay, avgG:heavyAvgG, setAvgG:setHeavyAvgG, rate:MUVV_RATES.heavy, color:'#3D6B7D' },
            { label:'⭐ ZPE/dia',       perDay:zpePerDay,   setPerDay:setZpePerDay,   avgG:zpeAvgG,   setAvgG:setZpeAvgG,   rate:MUVV_RATES.zpe,   color:'#DAA520' },
          ] as Array<{ label:string; perDay:number; setPerDay:(v:number)=>void; avgG:number; setAvgG:(v:number)=>void; rate:number; color:string }>)
          ).map(({ label, perDay, setPerDay, avgG, setAvgG, rate, color }) => (
            <div key={label} className="bg-muvv-primary rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                <span className="text-muvv-dark text-xs font-bold">{label}</span>
                <span className="text-muvv-muted text-[10px] ml-auto">taxa {(rate*100).toFixed(0)}%</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-muvv-muted text-[10px] mb-1 block">Fretes/dia</label>
                  <input type="number" className={inp} value={perDay} min={0}
                    onChange={e => setPerDay(Math.max(0, Number(e.target.value)))} />
                </div>
                <div>
                  <label className="text-muvv-muted text-[10px] mb-1 block">Valor médio R$</label>
                  <input type="number" className={inp} value={avgG} min={1} step={50}
                    onChange={e => setAvgG(Math.max(1, Number(e.target.value)))} />
                </div>
              </div>
            </div>
          ))}
          <div>
            <label className="text-muvv-muted text-[11px] mb-1 block">Receita média de serviços/frete R$</label>
            <input type="number" className={inp} value={svcPerFreight} min={0} step={5}
              onChange={e => setSvcPerFreight(Math.max(0, Number(e.target.value)))} />
          </div>
        </div>

        {/* Resultados da plataforma */}
        <div className="bg-muvv-accent-light rounded-2xl p-4 border border-muvv-accent/20 space-y-3">
          <p className="text-muvv-accent text-xs font-extrabold uppercase tracking-widest">💼 Receita da Plataforma</p>

          <div className="grid grid-cols-2 gap-2">
            {[
              { label:'Taxas Carros (15%)',  val:proj.lightFees,    color:'#57A6C1' },
              { label:'Taxas Caminhões (12%)',val:proj.heavyFees,   color:'#3D6B7D' },
              { label:'Taxas ZPE (10%)',      val:proj.zpeFees,     color:'#DAA520' },
              { label:'Serviços Adicionais',  val:proj.serviceFees, color:'#1CC8C8' },
            ].map(({ label, val, color }) => (
              <div key={label} className="bg-white rounded-xl p-3">
                <div className="w-2 h-2 rounded-full mb-1.5" style={{ background: color }} />
                <p className="text-muvv-muted text-[9px] mb-0.5">{label}</p>
                <p className="text-muvv-dark text-sm font-black">R$ {formatBRL(val)}</p>
              </div>
            ))}
          </div>

          {/* Total destaque */}
          <div className="bg-white rounded-xl p-4 text-center border border-muvv-accent/20">
            <p className="text-muvv-muted text-[10px] uppercase tracking-widest mb-1">
              TOTAL MUVV — {period === 'daily' ? 'DIA' : period === 'weekly' ? 'SEMANA' : period === 'monthly' ? 'MÊS' : 'ANO'}
            </p>
            <p className="text-muvv-accent text-3xl font-black text-glow-accent">
              R$ {formatBRL(proj.totalPlatform)}
            </p>
            <p className="text-muvv-muted text-[10px] mt-1">
              Volume total de fretes: R$ {formatBRL(proj.totalRevenue)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
