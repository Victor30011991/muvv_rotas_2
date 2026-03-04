// ─── SimPanel — Painel de Simulação de Situações (Admin) ─────────────────────
// Desktop: painel lateral fixo à direita
// Mobile:  drawer expansível a partir do bottom
//
// Permite: forçar KM, alterar peso/medidas, simular horas de espera
// para validar cálculos de estadia e cubagem em tempo real.

import { useState, useCallback } from 'react'
import {
  calcFreightFromKm, calcFreightFromCubage, calcCubage,
  calcEstadia, calcNet, formatBRL,
  ESTADIA_RATE, BASE_FIXED, KM_THRESHOLD, AD_VALOREM_PCT,
} from '@/utils/calculations'
import { Icon, ICON_PATHS } from '@/components/Icon'
import type { FreightCategory, CubageData, EstadiaConfig } from '@/types'
import { EMPTY_CUBAGE, DEFAULT_ESTADIA } from '@/types'

interface SimPanelProps {
  /** Categoria atual do frete (pode ser sobreescrita no painel) */
  defaultCategory?: FreightCategory
  /** KM calculado pelo OSRM (valor de referência) */
  osrmKm?: number
  /** Callback quando simulação é aplicada ao frete real */
  onApply?: (km: number, cubage: CubageData, estadia: EstadiaConfig) => void
}

// ─── Campo numérico com label ─────────────────────────────────────────────────
function NumField({
  label, value, onChange, unit, min = 0, step = 0.1, placeholder = '0',
}: {
  label: string; value: number; onChange: (v: number) => void
  unit?: string; min?: number; step?: number; placeholder?: string
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[10px] font-bold text-muvv-muted uppercase tracking-wide">{label}</label>
      <div className="flex items-center gap-1 bg-white rounded-xl px-2.5 py-1.5 border border-muvv-border focus-within:border-muvv-accent transition-colors">
        <input
          type="number"
          min={min}
          step={step}
          value={value || ''}
          placeholder={placeholder}
          onChange={e => onChange(Math.max(min, Number(e.target.value) || 0))}
          className="flex-1 bg-transparent outline-none text-muvv-dark text-sm font-bold min-w-0"
        />
        {unit && <span className="text-muvv-muted text-[10px] font-semibold flex-shrink-0">{unit}</span>}
      </div>
    </div>
  )
}

// ─── Linha de resultado ───────────────────────────────────────────────────────
function ResultRow({
  label, value, highlight = false, sub,
}: {
  label: string; value: string; highlight?: boolean; sub?: string
}) {
  return (
    <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl ${
      highlight ? 'bg-muvv-accent-light border border-muvv-accent/20' : 'bg-white'
    }`}>
      <div>
        <p className={`text-[11px] font-semibold ${highlight ? 'text-muvv-accent' : 'text-muvv-dark'}`}>{label}</p>
        {sub && <p className="text-[9px] text-muvv-muted">{sub}</p>}
      </div>
      <p className={`text-sm font-black ${highlight ? 'text-muvv-accent' : 'text-muvv-dark'}`}>{value}</p>
    </div>
  )
}

// ─── SimPanel principal ───────────────────────────────────────────────────────
export function SimPanel({ defaultCategory = 'heavy', osrmKm = 0, onApply }: SimPanelProps) {
  // Mobile: collapsed/expanded
  const [mobileOpen, setMobileOpen] = useState(false)

  // Controles de simulação
  const [category,    setCategory]    = useState<FreightCategory>(defaultCategory)
  const [forcedKm,    setForcedKm]    = useState(osrmKm)
  const [useForced,   setUseForced]   = useState(false)
  const [cubage,      setCubage]      = useState<CubageData>(EMPTY_CUBAGE)
  const [estadia,     setEstadia]     = useState<EstadiaConfig>(DEFAULT_ESTADIA)
  const [showCubage,  setShowCubage]  = useState(false)
  const [showEstadia, setShowEstadia] = useState(false)

  const simKm       = useForced ? forcedKm : osrmKm
  const hasCubage   = category === 'zpe' && cubage.length > 0 && cubage.realWeight > 0
  const cubageRes   = hasCubage ? calcCubage(cubage) : null

  // Cálculo de frete bruto simulado
  const gross = hasCubage
    ? calcFreightFromCubage(cubage, simKm)
    : calcFreightFromKm(simKm, category)

  // Taxa ad valorem
  const adValorem = category === 'zpe' && cubage.cargoValue > 0
    ? parseFloat((cubage.cargoValue * AD_VALOREM_PCT).toFixed(2))
    : 0

  // Estadia excedente
  const estadiaAmt = calcEstadia(estadia, category)

  const result = calcNet(gross, category, undefined, cubage, { config: estadia })

  const handleApply = useCallback(() => {
    onApply?.(simKm, cubage, estadia)
  }, [simKm, cubage, estadia, onApply])

  const setCubageField = useCallback((field: keyof CubageData, val: number) => {
    setCubage(prev => ({ ...prev, [field]: val }))
  }, [])

  // ── Conteúdo interno do painel ──────────────────────────────────────────────
  const panelContent = (
    <div className="flex flex-col gap-3 p-4 overflow-y-auto max-h-full">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-muvv-accent flex items-center justify-center">
            <Icon path={ICON_PATHS.trending} size={14} color="white" />
          </div>
          <div>
            <p className="text-muvv-dark text-sm font-extrabold leading-none">Simulador</p>
            <p className="text-muvv-muted text-[9px]">Modo Admin</p>
          </div>
        </div>
        <span className="bg-amber-100 text-amber-600 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
          ⚙ Dev
        </span>
      </div>

      {/* Categoria */}
      <div>
        <p className="text-[10px] font-bold text-muvv-muted uppercase tracking-wide mb-1.5">Categoria</p>
        <div className="grid grid-cols-3 gap-1">
          {(['light','heavy','zpe'] as FreightCategory[]).map(cat => (
            <button
              key={cat}
              onMouseDown={e => { e.preventDefault(); setCategory(cat) }}
              className={`py-1.5 rounded-xl text-[10px] font-bold border-none cursor-pointer transition-all ${
                category === cat
                  ? 'bg-muvv-accent text-white shadow-accent'
                  : 'bg-white text-muvv-dark border border-muvv-border'
              }`}
            >
              {cat === 'light' ? '🚗 Ligeiro' : cat === 'heavy' ? '🚛 Pesado' : '📦 Frac.'}
            </button>
          ))}
        </div>
      </div>

      {/* KM */}
      <div className="bg-muvv-primary rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] font-bold text-muvv-dark uppercase tracking-wide">Distância</p>
          <button
            onMouseDown={e => { e.preventDefault(); setUseForced(v => !v) }}
            className={`text-[9px] font-black px-2 py-0.5 rounded-full border-none cursor-pointer transition-all ${
              useForced ? 'bg-muvv-accent text-white' : 'bg-muvv-border text-muvv-muted'
            }`}
          >
            {useForced ? '✓ Forçado' : 'Forçar KM'}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-[9px] text-muvv-muted mb-0.5">OSRM real</p>
            <p className="text-muvv-dark text-sm font-bold">{osrmKm > 0 ? `${osrmKm.toFixed(1)} km` : '—'}</p>
          </div>
          {useForced && (
            <NumField label="KM simulado" value={forcedKm} onChange={setForcedKm} unit="km" step={1} />
          )}
        </div>
        <div className="pt-1 border-t border-muvv-border/40">
          <p className="text-[9px] text-muvv-muted">Saída fixa: R${BASE_FIXED[category]} (primeiros {KM_THRESHOLD}km)</p>
          {simKm > KM_THRESHOLD && (
            <p className="text-[9px] text-muvv-accent font-semibold">
              +{(simKm - KM_THRESHOLD).toFixed(1)} km extras calculados
            </p>
          )}
        </div>
      </div>

      {/* Cubagem (só ZPE) */}
      {category === 'zpe' && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 overflow-hidden">
          <button
            onMouseDown={e => { e.preventDefault(); setShowCubage(v => !v) }}
            className="w-full flex items-center justify-between p-3 cursor-pointer border-none bg-transparent"
          >
            <p className="text-amber-700 text-[11px] font-bold">📦 Cubagem e Peso</p>
            <Icon path={showCubage ? ICON_PATHS.arrowLeft : ICON_PATHS.arrow} size={12} color="#92400e" />
          </button>
          {showCubage && (
            <div className="px-3 pb-3 space-y-2">
              <div className="grid grid-cols-3 gap-1.5">
                <NumField label="Comp. (m)" value={cubage.length}  onChange={v => setCubageField('length',v)}  unit="m" />
                <NumField label="Larg. (m)" value={cubage.width}   onChange={v => setCubageField('width',v)}   unit="m" />
                <NumField label="Alt. (m)"  value={cubage.height}  onChange={v => setCubageField('height',v)}  unit="m" />
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <NumField label="Peso Real" value={cubage.realWeight} onChange={v => setCubageField('realWeight',v)} unit="kg" step={1} />
                <NumField label="Valor Carga" value={cubage.cargoValue} onChange={v => setCubageField('cargoValue',v)} unit="R$" step={100} />
              </div>
              {cubageRes && (
                <div className="bg-amber-100 rounded-lg p-2 space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-amber-700">Peso cubado</span>
                    <span className="font-bold text-amber-800">{cubageRes.cubedWeight.toFixed(1)} kg</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-amber-700">Peso cobrança</span>
                    <span className={`font-black ${cubageRes.usingCubed ? 'text-red-600' : 'text-green-700'}`}>
                      {cubageRes.billingWeight.toFixed(1)} kg
                      {cubageRes.usingCubed ? ' (cubado)' : ' (real)'}
                    </span>
                  </div>
                  {cubage.cargoValue > 0 && (
                    <div className="flex justify-between text-[10px]">
                      <span className="text-amber-700">Ad Valorem (0,5%)</span>
                      <span className="font-bold text-amber-800">R$ {formatBRL(adValorem)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Estadia */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 overflow-hidden">
        <button
          onMouseDown={e => { e.preventDefault(); setShowEstadia(v => !v) }}
          className="w-full flex items-center justify-between p-3 cursor-pointer border-none bg-transparent"
        >
          <div>
            <p className="text-blue-700 text-[11px] font-bold">⏱ Estadia (Franquia)</p>
            <p className="text-blue-500 text-[9px]">
              {estadiaAmt > 0 ? `+R$ ${formatBRL(estadiaAmt)} excedente` : '60 min gratuitos'}
            </p>
          </div>
          <Icon path={showEstadia ? ICON_PATHS.arrowLeft : ICON_PATHS.arrow} size={12} color="#1d4ed8" />
        </button>
        {showEstadia && (
          <div className="px-3 pb-3 space-y-2">
            <div className="grid grid-cols-2 gap-1.5">
              <NumField
                label="Minutos aguardados"
                value={estadia.waitMinutes}
                onChange={v => setEstadia(prev => ({ ...prev, waitMinutes: v }))}
                unit="min" step={15}
              />
              <NumField
                label="Franquia gratuita"
                value={estadia.franchiseMinutes}
                onChange={v => setEstadia(prev => ({ ...prev, franchiseMinutes: v }))}
                unit="min" step={15}
              />
            </div>
            <div className="bg-blue-100 rounded-lg p-2 space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-blue-700">Tarifa estadia</span>
                <span className="font-bold text-blue-800">R$ {ESTADIA_RATE[category]}/h</span>
              </div>
              {estadia.waitMinutes > estadia.franchiseMinutes && (
                <div className="flex justify-between text-[10px]">
                  <span className="text-blue-700">Excedente</span>
                  <span className="font-black text-red-600">
                    {(estadia.waitMinutes - estadia.franchiseMinutes)} min
                    = R$ {formatBRL(estadiaAmt)}
                  </span>
                </div>
              )}
              {estadia.waitMinutes <= estadia.franchiseMinutes && (
                <p className="text-[10px] text-green-700 font-semibold">✓ Dentro da franquia gratuita</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Resultado */}
      <div className="bg-muvv-primary rounded-xl p-3 space-y-1.5">
        <p className="text-[10px] font-black text-muvv-dark uppercase tracking-wide mb-2">Resultado Simulado</p>
        <ResultRow label="Bruto (km/cubagem)" value={`R$ ${formatBRL(gross)}`} />
        {adValorem > 0 && <ResultRow label="Ad Valorem (0,5%)" value={`+R$ ${formatBRL(adValorem)}`} sub="sobre valor da carga" />}
        {estadiaAmt > 0 && <ResultRow label="Estadia excedente" value={`+R$ ${formatBRL(estadiaAmt)}`} sub={`${estadia.waitMinutes - estadia.franchiseMinutes} min × R$${ESTADIA_RATE[category]}/h`} />}
        <ResultRow label="Taxa Muvv (12%)" value={`-R$ ${formatBRL(result.fee)}`} />
        <ResultRow label="Líquido Motorista" value={`R$ ${formatBRL(result.net)}`} highlight />
      </div>

      {/* Aplicar ao frete real */}
      {onApply && (
        <button
          onMouseDown={e => { e.preventDefault(); handleApply() }}
          className="w-full py-2.5 rounded-xl bg-muvv-accent text-white text-xs font-black cursor-pointer border-none shadow-accent hover:opacity-90 transition-opacity"
        >
          ✓ Aplicar ao Frete Real
        </button>
      )}
    </div>
  )

  // ── Render: Desktop (lateral) + Mobile (drawer) ─────────────────────────────
  return (
    <>
      {/* DESKTOP: painel fixo à direita */}
      <aside className="hidden lg:flex flex-col w-72 xl:w-80 flex-shrink-0 bg-muvv-primary border-l border-muvv-border overflow-hidden">
        {panelContent}
      </aside>

      {/* MOBILE: drawer de baixo para cima */}
      <div className="lg:hidden">
        {/* Aba de abertura */}
        <button
          onMouseDown={e => { e.preventDefault(); setMobileOpen(v => !v) }}
          className="fixed bottom-20 right-3 z-[600] w-12 h-12 rounded-full bg-muvv-accent shadow-accent flex items-center justify-center border-none cursor-pointer"
        >
          <Icon path={ICON_PATHS.trending} size={18} color="white" />
        </button>

        {/* Overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-[700] bg-black/40"
            onMouseDown={() => setMobileOpen(false)}
          />
        )}

        {/* Drawer */}
        <div className={`fixed bottom-0 left-0 right-0 z-[800] bg-muvv-primary rounded-t-[24px] shadow-sheet transition-transform duration-300 max-h-[85vh] flex flex-col ${
          mobileOpen ? 'translate-y-0' : 'translate-y-full'
        }`}>
          <div className="w-10 h-1 bg-muvv-border rounded-full mx-auto mt-3 mb-1 flex-shrink-0" />
          <div className="flex items-center justify-between px-4 pb-2 flex-shrink-0">
            <p className="text-muvv-dark text-sm font-extrabold">Simulador Admin</p>
            <button
              onMouseDown={e => { e.preventDefault(); setMobileOpen(false) }}
              className="w-7 h-7 rounded-full bg-muvv-border flex items-center justify-center border-none cursor-pointer"
            >
              <Icon path={ICON_PATHS.x} size={12} color="#8AAEBB" />
            </button>
          </div>
          <div className="overflow-y-auto flex-1">
            {panelContent}
          </div>
        </div>
      </div>
    </>
  )
}
