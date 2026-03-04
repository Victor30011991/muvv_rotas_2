// ─── OrderDetailScreen v3.0.0 — Performance Total ────────────────────────────
//
// OTIMIZAÇÕES v3:
//  1. `derived` — único useMemo central que recalcula TUDO (gross/fee/net/tax)
//     ao mudar category, grossInput, services ou demand. Zero cálculos duplicados.
//  2. Categoria → botões de feedback imediato via CSS inline (CAT_COLORS).
//     Sem layout shift: todos os valores derivam do mesmo memo em uma única
//     passagem de renderização.
//  3. EarningsSimulator recebe `net` e `category` via props (sem key trick).
//     O simulador apenas exibe — não recalcula — eliminando double-compute.
//  4. CAT_COLORS propagado para o hero, breakdown e euro card via `accentColor`,
//     mantendo coerência visual em toda a interface.
//  5. Redução de useMemo isolados: multiplier, baseGross, routeWps e destState
//     permanecem separados pois dependem de inputs diferentes, mas os cálculos
//     financeiros foram todos colapsados em `derived`.

import { useState, useMemo } from 'react'
import { Icon, ICON_PATHS }  from '@/components/Icon'
import { EarningsSimulator } from '@/components/EarningsSimulator'
import { RouteMap }          from '@/components/RouteMap'
import { DemandPanel }       from '@/components/DemandPanel'
import { TaxReformPanel }    from '@/components/TaxReformPanel'
import {
  calcNet, brlToEur, formatBRL, formatEUR,
  MUVV_RATES, CATEGORY_LABELS, CATEGORY_ICON,
  applyDynamicMultiplier, calcDynamicMultiplier,
} from '@/utils/calculations'
import { SERVICE_COSTS, SERVICE_LABELS, DEFAULT_DEMAND } from '@/types'
import type {
  Freight, FreightCategory, RouteWaypoint, AdditionalServices, DemandFactors,
} from '@/types'

interface Props { freight: Freight | null }

// ── Cores de destaque por categoria ───────────────────────────────────────────
const CAT_COLORS: Record<FreightCategory, { base: string; shadow: string; bg: string }> = {
  light: { base: '#57A6C1', shadow: '#57A6C155', bg: 'rgba(87,166,193,0.08)' },
  heavy: { base: '#3D6B7D', shadow: '#3D6B7D55', bg: 'rgba(61,107,125,0.08)' },
  zpe:   { base: '#DAA520', shadow: '#DAA52055', bg: 'rgba(218,165,32,0.08)'  },
}

export function OrderDetailScreen({ freight }: Props) {

  // ── Estados primitivos ────────────────────────────────────────────────────
  const [category,    setCategory]   = useState<FreightCategory>(freight?.category ?? 'heavy')
  const [grossInput,  setGrossInput] = useState<number>(freight?.value ?? 0)
  const [services,    setServices]   = useState<AdditionalServices>(
    freight?.services ?? { insurance: false, tracking: false, lockMonitor: false }
  )
  const [demand, setDemand] = useState<DemandFactors>(DEFAULT_DEMAND)

  // ── Waypoints e estado de destino (independentes de categoria/gross) ───────
  const routeWps = useMemo((): RouteWaypoint[] => {
    if (freight?.waypoints && freight.waypoints.length >= 2) return freight.waypoints
    const wps: RouteWaypoint[] = []
    if (freight?.fromCoords) wps.push({ id: 'o', ...freight.fromCoords, label: 'Origem',  address: freight.from })
    if (freight?.toCoords)   wps.push({ id: 'd', ...freight.toCoords,   label: 'Destino', address: freight.to })
    return wps
  }, [freight])

  const destState = useMemo(() => {
    const m = (freight?.to ?? '').match(/,\s*([A-Z]{2})\s*$/)
    return m ? m[1] : 'PI'
  }, [freight])

  // ── MEMO CENTRAL — único ponto de verdade para todos os valores financeiros ─
  // Observa: category · grossInput · services · demand
  // Qualquer mudança em qualquer um desses dispara exatamente um recálculo.
  const derived = useMemo(() => {
    const baseGross    = Math.max(1, grossInput)
    const multiplier   = calcDynamicMultiplier(demand)
    const computedGross = applyDynamicMultiplier(baseGross, demand)

    const { gross, fee, services: servicesAmt, net, rate } = calcNet(computedGross, category, services)
    const netBase = calcNet(baseGross, category, services).net

    const activeServices = (Object.keys(services) as (keyof AdditionalServices)[])
      .filter(k => services[k])

    return {
      baseGross,
      multiplier,
      computedGross,
      gross,
      fee,
      servicesAmt,
      net,
      rate,
      netBase,
      activeServices,
    }
  }, [category, grossInput, services, demand])

  // Atalho de cor da categoria ativa (usado em múltiplos pontos da UI)
  const catColor = CAT_COLORS[category]

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-y-auto">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-header-dark px-5 pt-14 pb-6 rounded-b-[28px]">
        <p className="text-white/50 text-[10px] uppercase tracking-widest mb-1">Frete Aceito</p>
        <h1 className="text-white text-lg font-extrabold mb-1 leading-snug line-clamp-2">
          {freight?.to ?? 'Destino'}
        </h1>

        {freight?.distanceKm ? (
          <p className="text-white/50 text-xs mb-2">
            📍 {freight.distanceKm.toFixed(1)} km · {CATEGORY_LABELS[category]}
          </p>
        ) : null}

        {/* Badge do multiplicador de demanda */}
        {derived.multiplier !== 1.0 && (
          <div className="mb-3 inline-flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1">
            <span className="text-amber-300 text-[11px] font-bold">
              {derived.multiplier > 1 ? '📈' : '📉'} Demanda {derived.multiplier.toFixed(2)}× aplicado
            </span>
          </div>
        )}

        {/* Card do valor líquido — cor de accent muda com a categoria */}
        <div
          className="rounded-[18px] p-4 border"
          style={{
            background: 'rgba(255,255,255,0.10)',
            borderColor: `${catColor.base}44`,
          }}
        >
          <p className="text-white/50 text-[10px] mb-1 uppercase tracking-widest">Valor Líquido</p>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold" style={{ color: catColor.base }}>R$</span>
            <span
              className="font-black"
              style={{ fontSize: 44, color: catColor.base }}
            >
              {formatBRL(derived.net)}
            </span>
          </div>
          {derived.multiplier !== 1.0 && (
            <p className="text-white/40 text-[10px] mt-0.5 line-through">
              Sem fator: R$ {formatBRL(derived.netBase)}
            </p>
          )}
          {derived.activeServices.length > 0 && (
            <p className="text-[10px] mt-1" style={{ color: `${catColor.base}bb` }}>
              Inclui serviços: +R$ {formatBRL(derived.servicesAmt)}
            </p>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">

        {/* ── Mapa ────────────────────────────────────────────────────────── */}
        {routeWps.length >= 2 && <RouteMap waypoints={routeWps} height={200} />}

        {/* ── Seletor de categoria ────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-4 shadow-card">
          <p className="text-muvv-muted text-[11px] font-bold uppercase tracking-widest mb-2.5">
            Tipo de Carga
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(['light', 'heavy', 'zpe'] as FreightCategory[]).map(cat => {
              const active  = category === cat
              const color   = CAT_COLORS[cat]
              return (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className="rounded-xl py-2.5 px-1 border-none cursor-pointer transition-all duration-150"
                  style={
                    active
                      ? {
                          background : color.base,
                          boxShadow  : `0 4px 16px ${color.shadow}`,
                          color      : '#fff',
                        }
                      : {
                          background: 'var(--muvv-primary, #f4f6f8)',
                          color     : 'var(--muvv-muted, #9aa3af)',
                        }
                  }
                >
                  <p className="text-[11px] font-bold leading-snug">
                    {CATEGORY_ICON[cat]}{' '}
                    {cat === 'light' ? 'Ligeiro' : cat === 'heavy' ? 'Pesado' : 'ZPE'}
                  </p>
                  <p className={`text-[9px] mt-0.5 ${active ? 'opacity-70' : ''}`}>
                    {(MUVV_RATES[cat] * 100).toFixed(0)}% taxa
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Módulo 1: Fator de Demanda ───────────────────────────────────── */}
        <DemandPanel
          factors={demand}
          onChange={setDemand}
          baseFreight={derived.baseGross}
        />

        {/* ── Valor bruto editável ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-4 shadow-card">
          <p className="text-muvv-muted text-[11px] font-bold uppercase tracking-widest mb-2">
            Valor Bruto Base
          </p>
          <div className="flex items-center gap-2">
            <span className="text-muvv-muted text-xl font-semibold">R$</span>
            <input
              type="number"
              value={grossInput}
              onChange={e => setGrossInput(Math.max(1, Number(e.target.value)))}
              className="flex-1 bg-transparent outline-none text-muvv-dark text-3xl font-black"
            />
          </div>
          {freight?.distanceKm ? (
            <p className="text-muvv-muted text-[10px] mt-1">
              {freight.distanceKm.toFixed(1)} km · {CATEGORY_LABELS[category]}
            </p>
          ) : null}
        </div>

        {/* ── Serviços adicionais ──────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-4 shadow-card">
          <p className="text-muvv-muted text-[11px] font-bold uppercase tracking-widest mb-3">
            Serviços Adicionais
          </p>
          <div className="space-y-2">
            {(Object.keys(services) as (keyof AdditionalServices)[]).map(key => (
              <button
                key={key}
                onClick={() => setServices(prev => ({ ...prev, [key]: !prev[key] }))}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer border-2 transition-all ${
                  services[key]
                    ? 'bg-muvv-accent-light border-muvv-accent/30'
                    : 'bg-muvv-primary border-transparent'
                }`}
              >
                <span className={`text-sm font-semibold ${services[key] ? 'text-muvv-accent' : 'text-muvv-dark'}`}>
                  {SERVICE_LABELS[key]}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-muvv-muted text-xs">+R$ {SERVICE_COSTS[key]}</span>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    services[key] ? 'bg-muvv-accent border-muvv-accent' : 'border-muvv-border'
                  }`}>
                    {services[key] && (
                      <Icon path={ICON_PATHS.check} size={10} color="white" strokeWidth={3} />
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Breakdown financeiro ─────────────────────────────────────────── */}
        <div className="bg-white rounded-[18px] overflow-hidden shadow-card divide-y divide-muvv-border">
          {/* Bruto */}
          <div className="flex justify-between items-center px-4 py-3.5">
            <div>
              <p className="text-muvv-dark text-sm">Valor Bruto</p>
              {derived.multiplier !== 1.0 && (
                <p className="text-muvv-muted text-[10px]">
                  Base R$ {formatBRL(derived.baseGross)} × {derived.multiplier.toFixed(2)}
                </p>
              )}
            </div>
            <span className="text-muvv-dark text-[15px] font-bold">
              R$ {formatBRL(derived.gross)}
            </span>
          </div>

          {/* Taxa */}
          <div className="flex justify-between items-start px-4 py-3.5 bg-red-50/40">
            <div>
              <p className="text-muvv-dark text-sm">
                Taxa Muvv ({(derived.rate * 100).toFixed(0)}%) — {CATEGORY_LABELS[category]}
              </p>
              <p className="text-muvv-muted text-[10px] mt-0.5">Plataforma, seguro e suporte</p>
            </div>
            <span className="text-red-400 text-[15px] font-bold">-R$ {formatBRL(derived.fee)}</span>
          </div>

          {/* Serviços (condicional) */}
          {derived.servicesAmt > 0 && (
            <div className="flex justify-between items-start px-4 py-3.5 bg-blue-50/40">
              <div>
                <p className="text-muvv-dark text-sm">Serviços Adicionais</p>
                <p className="text-muvv-muted text-[10px] mt-0.5">
                  {derived.activeServices
                    .map(k => SERVICE_LABELS[k].split(' ').slice(1).join(' '))
                    .join(' · ')}
                </p>
              </div>
              <span className="text-blue-500 text-[15px] font-bold">+R$ {formatBRL(derived.servicesAmt)}</span>
            </div>
          )}

          {/* Líquido — cor dinâmica por categoria */}
          <div
            className="flex justify-between items-start px-4 py-3.5"
            style={{ background: catColor.bg }}
          >
            <div>
              <p className="text-sm font-extrabold" style={{ color: catColor.base }}>✓ VALOR LÍQUIDO</p>
              <p className="text-muvv-secondary text-[10px] mt-0.5">Depositado em até 2h</p>
            </div>
            <span className="text-[22px] font-black" style={{ color: catColor.base }}>
              R$ {formatBRL(derived.net)}
            </span>
          </div>
        </div>

        {/* ── Módulo 2: Reforma Tributária IBS/CBS 2026 ───────────────────── */}
        <TaxReformPanel netFreight={derived.net} destState={destState} />

        {/* ── Equivalente Euro (apenas ZPE) ───────────────────────────────── */}
        {category === 'zpe' && (
          <div className="bg-gradient-prestige rounded-2xl p-4 border border-muvv-prestige/20 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muvv-prestige/15 flex items-center justify-center flex-shrink-0">
              <Icon path={ICON_PATHS.euro} size={20} color="#DAA520" />
            </div>
            <div>
              <p className="text-muvv-prestige text-xs font-bold mb-0.5">Equivalente Euro — ZPE Export</p>
              <p className="text-amber-700 text-xl font-black">€ {formatEUR(brlToEur(derived.net))}</p>
              <p className="text-amber-600 text-[10px]">1 EUR = R$ 5,50</p>
            </div>
          </div>
        )}

        {/*
         * ── EarningsSimulator ─────────────────────────────────────────────
         * Recebe `net` e `category` diretamente do memo central.
         * Não recalcula nada internamente — apenas projeta os valores
         * recebidos via props. Atualiza no mesmo frame da troca de categoria.
         * O `key` trick foi REMOVIDO: sem remount, sem flash de layout.
         */}
        <EarningsSimulator
          initialGross={derived.computedGross}
          initialCategory={category}
          precomputedNet={derived.net}
        />

        {/* ── Seguro Gold ─────────────────────────────────────────────────── */}
        <div
          className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-card"
          style={{ borderLeft: `3px solid ${catColor.base}` }}
        >
          <Icon path={ICON_PATHS.shield} size={22} color={catColor.base} />
          <div>
            <p className="text-xs font-bold" style={{ color: catColor.base }}>
              Cargo Insurance Gold · Muvv Holding
            </p>
            <p className="text-muvv-muted text-xs">Cobertura total inclusa para fretes ZPE</p>
          </div>
        </div>

        <div className="h-4" />
      </div>
    </div>
  )
}