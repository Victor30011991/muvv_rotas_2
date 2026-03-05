// ─── HomeScreen v2.3 — Plataforma de Logística Profissional ──────────────────
//
// ★ DESKTOP  flex-row: mapa ocupa flex-1 (100% do espaço livre),
//            sidebar controles (w-80) à esquerda, SimPanel à direita
// ★ MOBILE   mapa de fundo absoluto; painel de busca e bottom-sheet como
//            overlays — tudo w-full, sem pixels fixos, nada vaza da viewport
//
// BUGS CORRIGIDOS v2.3
// [1] ZPE Deadlock: sheet gateada por `addressesReady` (não `canAccept`).
//     SlideToAccept gateado internamente → trocar categoria nunca trava.
// [2] Mapa motorista: `waypoints[]` completo passado no Freight → rota idêntica.
// [3] RouteMap race condition: `mapReady` state re-dispara o efeito de waypoints.
//
// NOVIDADES v2.3
// • Cubagem: C × L × A × 300 · Math.max(pesoReal, pesoCubado) · ad valorem 0,5%
// • Estadia: franquia 60min · R$40/h (light) · R$85/h (heavy/zpe)
// • SimPanel: desktop sidebar fixa · mobile drawer bottom-up
// • Saída fixa: R$50 (light) / R$150 (heavy/zpe) primeiros 5 km

import { useState, useCallback, useMemo } from 'react'
import { RouteMap }            from '@/components/RouteMap'
import { AddressAutocomplete } from '@/components/AddressAutocomplete'
import { SlideToAccept }       from '@/components/SlideToAccept'
import { SimPanel }            from '@/components/SimPanel'
import {
  calcNet, calcFreightFromKm, calcFreightFromCubage, calcCubage,
  calcEstadia, isCubageReady, formatBRL,
  MUVV_RATES, CATEGORY_SHORT, CATEGORY_ICON,
  ESTADIA_RATE, AD_VALOREM_PCT,
} from '@/utils/calculations'
import { Icon, ICON_PATHS } from '@/components/Icon'
import {
  SERVICE_COSTS, SERVICE_LABELS,
  EMPTY_CUBAGE, DEFAULT_ESTADIA,
} from '@/types'
import type {
  Freight, RouteWaypoint, FreightCategory,
  AdditionalServices, CubageData, EstadiaConfig,
} from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────
const PIN_COLORS  = ['#1CC8C8','#57A6C1','#DAA520','#3D6B7D','#E57373','#81C784']
const MAX_STOPS   = 4
const CAT_COLORS: Record<FreightCategory, string> = {
  light: '#57A6C1', heavy: '#3D6B7D', zpe: '#B45309',
}
const EMPTY_SERVICES: AdditionalServices = {
  insurance: false, tracking: false, lockMonitor: false,
}
function getGreeting() {
  const h = new Date().getHours()
  if (h >= 5  && h < 12) return 'Bom dia'
  if (h >= 12 && h < 18) return 'Boa tarde'
  return 'Boa noite'
}

// ─────────────────────────────────────────────────────────────────────────────
// CategoryTabs — inline, onMouseDown garante disparo antes de qualquer blur
// ─────────────────────────────────────────────────────────────────────────────
function CategoryTabs({
  category, onChange,
}: { category: FreightCategory; onChange: (c: FreightCategory) => void }) {
  return (
    <div className="flex gap-1 flex-shrink-0">
      {(['light', 'heavy', 'zpe'] as FreightCategory[]).map(cat => {
        const active = category === cat
        return (
          <button
            key={cat}
            onMouseDown={e => { e.preventDefault(); onChange(cat) }}
            className="flex flex-col items-center px-2 py-1.5 rounded-xl border-none cursor-pointer transition-all"
            style={
              active
                ? { background: CAT_COLORS[cat], boxShadow: `0 3px 10px ${CAT_COLORS[cat]}55` }
                : { background: 'rgba(255,255,255,0.85)' }
            }
          >
            <span className="text-sm leading-none">{CATEGORY_ICON[cat]}</span>
            <span className={`text-[9px] font-black mt-0.5 whitespace-nowrap ${active ? 'text-white' : 'text-muvv-dark'}`}>
              {CATEGORY_SHORT[cat]}
            </span>
            <span className={`text-[8px] ${active ? 'text-white/70' : 'text-muvv-muted'}`}>
              {(MUVV_RATES[cat] * 100).toFixed(0)}%
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CubField — input numérico compacto para formulário de cubagem
// ─────────────────────────────────────────────────────────────────────────────
function CubField({
  label, value, onChange, unit, step = 0.01,
}: {
  label: string; value: number; onChange: (v: number) => void
  unit?: string; step?: number
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[9px] font-bold text-muvv-muted uppercase tracking-wide">
        {label}
      </label>
      <div className="flex items-center gap-1 bg-white rounded-lg px-2 py-1.5 border border-muvv-border focus-within:border-muvv-accent transition-colors">
        <input
          type="number"
          min={0}
          step={step}
          value={value || ''}
          placeholder="0"
          onChange={e => onChange(Math.max(0, Number(e.target.value) || 0))}
          className="flex-1 min-w-0 bg-transparent outline-none text-muvv-dark text-xs font-bold"
        />
        {unit && (
          <span className="text-muvv-muted text-[9px] flex-shrink-0">{unit}</span>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AddressPanel — painel de busca/planejamento de rota
// ─────────────────────────────────────────────────────────────────────────────
interface AddressPanelProps {
  slots:        (RouteWaypoint | null)[]
  slotLabels:   string[]
  extraStops:   number
  showSearch:   boolean
  filledCount:  number
  onToggle:     () => void
  onSelect:     (i: number, wp: RouteWaypoint | null) => void
  onRemove:     (i: number) => void
  onAdd:        () => void
}
function AddressPanel({
  slots, slotLabels, extraStops, showSearch, filledCount,
  onToggle, onSelect, onRemove, onAdd,
}: AddressPanelProps) {
  return (
    <div className="glass rounded-[20px] shadow-sheet border border-white/50 overflow-visible">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 cursor-pointer border-none bg-transparent"
      >
        <div className="flex items-center gap-2">
          <Icon path={ICON_PATHS.map} size={15} color="#57A6C1" />
          <span className="text-muvv-dark text-sm font-extrabold">Planejar Rota</span>
          {filledCount > 0 && (
            <span className="bg-muvv-accent text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {filledCount}pts
            </span>
          )}
        </div>
        <div className={`transition-transform duration-200 ${showSearch ? 'rotate-90' : '-rotate-90'}`}>
          <Icon path={ICON_PATHS.arrowLeft} size={14} color="#8AAEBB" />
        </div>
      </button>

      {showSearch && (
        <div className="px-3 pb-3 space-y-2 animate-fade-in">
          {/* Trilha de endereços */}
          <div className="relative">
            {slots.length > 1 && (
              <div
                className="absolute left-[12px] top-4 bottom-4 w-0.5 z-0"
                style={{ background: 'linear-gradient(#1CC8C8,#57A6C1)' }}
              />
            )}
            <div className="space-y-1.5 relative z-10">
              {slotLabels.map((label, i) => {
                const isFirst = i === 0
                const isLast  = i === slots.length - 1
                const canRm   = !isFirst && !isLast
                const color   = PIN_COLORS[i % PIN_COLORS.length]
                return (
                  <div key={i} className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2 border-white shadow-card-sm text-[9px] font-black text-white"
                      style={{ background: color }}
                    >
                      {isLast ? '🏁' : i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <AddressAutocomplete
                        placeholder={label}
                        pinColor={color}
                        pinLabel={label}
                        confirmedAddress={slots[i]?.address}
                        onSelect={(wp: RouteWaypoint) => onSelect(i, wp)}
                        onClear={() => onSelect(i, null)}
                      />
                    </div>
                    {canRm && (
                      <button
                        onClick={() => onRemove(i)}
                        className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0 cursor-pointer border-none"
                      >
                        <Icon path={ICON_PATHS.x} size={10} color="#EF4444" strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {extraStops < MAX_STOPS && (
            <button
              onClick={onAdd}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-muvv-secondary/40 text-muvv-secondary text-xs font-semibold cursor-pointer bg-transparent hover:text-muvv-accent transition-colors"
            >
              <Icon path={ICON_PATHS.plus} size={12} color="currentColor" />
              Adicionar parada
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FreightPanel — detalhes do frete (shared entre mobile sheet e desktop sidebar)
// ─────────────────────────────────────────────────────────────────────────────
interface FreightPanelProps {
  origin:     RouteWaypoint | null
  dest:       RouteWaypoint | null
  distanceKm: number
  category:   FreightCategory
  gross:      number
  fee:        number
  svcAmt:     number
  adValorem:  number
  estadiaAmt: number
  net:        number
  rate:       number
  cubageResult: ReturnType<typeof calcCubage> | null
  cubage:       CubageData
  estadia:      EstadiaConfig
  services:     AdditionalServices
  activeServicesCount: number
  showCubage:   boolean
  showEstadia:  boolean
  showServices: boolean
  onCategoryChange: (c: FreightCategory) => void
  onCubageField:    (f: keyof CubageData, v: number) => void
  onEstadiaChange:  (e: EstadiaConfig) => void
  onToggleCubage:   () => void
  onToggleEstadia:  () => void
  onToggleServices: () => void
  onToggleService:  (k: keyof AdditionalServices) => void
  canAccept: boolean
  onAccept:  () => void
}

function FreightPanel(p: FreightPanelProps) {
  const {
    origin, dest, distanceKm, category,
    gross, fee, svcAmt, adValorem, estadiaAmt, net, rate,
    cubageResult, cubage, estadia, services, activeServicesCount,
    showCubage, showEstadia, showServices,
    onCategoryChange, onCubageField, onEstadiaChange,
    onToggleCubage, onToggleEstadia, onToggleServices, onToggleService,
    canAccept, onAccept,
  } = p

  return (
    <div className="space-y-2.5">

      {/* ── Rota resumida + seletor de categoria ── */}
      <div className="flex items-center gap-2.5 bg-white rounded-2xl px-3 py-2.5 border border-muvv-border/50">
        <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-muvv-accent" />
          <div className="w-px h-4 bg-gradient-road" />
          <div className="w-2 h-2 rounded-full bg-muvv-prestige" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-muvv-dark text-xs font-semibold truncate">{origin?.address}</p>
          <p className="text-muvv-muted text-[10px]">
            ↓ {distanceKm > 0 ? `${distanceKm.toFixed(1)} km` : 'aguardando rota...'}
          </p>
          <p className="text-muvv-dark text-xs font-semibold truncate">{dest?.address}</p>
        </div>
        <CategoryTabs category={category} onChange={onCategoryChange} />
      </div>

      {/* ── Cubagem (somente Fracionada) ── */}
      {category === 'zpe' && (
        <div className="bg-amber-50 rounded-2xl border border-amber-200 overflow-hidden">
          <button
            onClick={onToggleCubage}
            className="w-full flex items-center justify-between px-3 py-2.5 cursor-pointer border-none bg-transparent"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-amber-700 text-xs font-bold flex-shrink-0">
                📦 Cubagem e Peso Taxável
              </span>
              {cubageResult ? (
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                  cubageResult.usingCubed ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'
                }`}>
                  {cubageResult.usingCubed ? 'cubado' : 'real'}: {cubageResult.billingWeight.toFixed(1)} kg
                </span>
              ) : (
                <span className="text-[9px] text-amber-500">← preencha para calcular</span>
              )}
            </div>
            <Icon
              path={showCubage ? ICON_PATHS.arrowLeft : ICON_PATHS.arrow}
              size={12} color="#92400e"
            />
          </button>

          {showCubage && (
            <div className="px-3 pb-3 space-y-2 animate-fade-in">
              {/* Dimensões */}
              <div className="grid grid-cols-3 gap-1.5">
                <CubField label="Comp. (m)" value={cubage.length}  onChange={v => onCubageField('length', v)}  unit="m" />
                <CubField label="Larg. (m)" value={cubage.width}   onChange={v => onCubageField('width', v)}   unit="m" />
                <CubField label="Alt. (m)"  value={cubage.height}  onChange={v => onCubageField('height', v)}  unit="m" />
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <CubField label="Peso Real" value={cubage.realWeight}  onChange={v => onCubageField('realWeight', v)}  unit="kg" step={0.5} />
                <CubField label="Valor Carga" value={cubage.cargoValue} onChange={v => onCubageField('cargoValue', v)} unit="R$" step={100} />
              </div>

              {/* Resultado cubagem */}
              {cubageResult && (
                <div className="bg-amber-100 rounded-xl px-3 py-2 space-y-1.5 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-amber-700">C × L × A × 300 = Peso Cubado</span>
                    <span className="font-bold text-amber-800">{cubageResult.cubedWeight.toFixed(2)} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-amber-700">Peso de Cobrança (Math.max)</span>
                    <span className={`font-black ${cubageResult.usingCubed ? 'text-red-600' : 'text-green-700'}`}>
                      {cubageResult.billingWeight.toFixed(2)} kg
                      <span className="font-normal opacity-70 ml-1">
                        ({cubageResult.usingCubed ? 'usando cubado' : 'usando real'})
                      </span>
                    </span>
                  </div>
                  {adValorem > 0 && (
                    <div className="flex justify-between border-t border-amber-200 pt-1.5 mt-1">
                      <span className="text-amber-700">Ad Valorem — seguro 0,5%</span>
                      <span className="font-bold text-amber-800">+R$ {formatBRL(adValorem)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Estadia / Franquia de tempo ── */}
      <div className="bg-blue-50 rounded-2xl border border-blue-200 overflow-hidden">
        <button
          onClick={onToggleEstadia}
          className="w-full flex items-center justify-between px-3 py-2.5 cursor-pointer border-none bg-transparent"
        >
          <div className="flex items-center gap-2">
            <span className="text-blue-700 text-xs font-bold">⏱ Estadia</span>
            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
              estadiaAmt > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'
            }`}>
              {estadiaAmt > 0 ? `+R$ ${formatBRL(estadiaAmt)}` : '60 min grátis'}
            </span>
          </div>
          <Icon
            path={showEstadia ? ICON_PATHS.arrowLeft : ICON_PATHS.arrow}
            size={12} color="#1d4ed8"
          />
        </button>

        {showEstadia && (
          <div className="px-3 pb-3 space-y-2 animate-fade-in">
            <div className="grid grid-cols-2 gap-1.5">
              <CubField
                label="Min. aguardados"
                value={estadia.waitMinutes}
                onChange={v => onEstadiaChange({ ...estadia, waitMinutes: v })}
                unit="min" step={15}
              />
              <CubField
                label="Franquia grátis"
                value={estadia.franchiseMinutes}
                onChange={v => onEstadiaChange({ ...estadia, franchiseMinutes: v })}
                unit="min" step={15}
              />
            </div>
            <div className="bg-blue-100 rounded-xl px-3 py-2 text-[10px] space-y-1">
              <div className="flex justify-between">
                <span className="text-blue-700">Tarifa excedente</span>
                <span className="font-bold text-blue-800">R$ {ESTADIA_RATE[category]}/hora</span>
              </div>
              {estadiaAmt > 0 ? (
                <div className="flex justify-between border-t border-blue-200 pt-1">
                  <span className="text-blue-700">
                    {estadia.waitMinutes - estadia.franchiseMinutes} min excedentes
                  </span>
                  <span className="font-black text-red-600">= R$ {formatBRL(estadiaAmt)}</span>
                </div>
              ) : (
                <p className="text-green-700 font-semibold">✓ Dentro da franquia gratuita</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Serviços adicionais ── */}
      <button
        onClick={onToggleServices}
        className="w-full flex items-center justify-between py-1.5 cursor-pointer border-none bg-transparent"
      >
        <span className="text-muvv-dark text-xs font-bold">
          ➕ Serviços Adicionais
          {activeServicesCount > 0 && (
            <span className="ml-2 bg-muvv-accent text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
              {activeServicesCount}
            </span>
          )}
        </span>
        <Icon
          path={showServices ? ICON_PATHS.arrowLeft : ICON_PATHS.arrow}
          size={13} color="#8AAEBB"
        />
      </button>

      {showServices && (
        <div className="bg-muvv-primary rounded-xl p-2 space-y-1.5 animate-fade-in">
          {(Object.keys(services) as (keyof AdditionalServices)[]).map(key => (
            <button
              key={key as string}
              onClick={() => onToggleService(key)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer border-none transition-all ${
                services[key]
                  ? 'bg-muvv-accent-light border border-muvv-accent/25'
                  : 'bg-white'
              }`}
            >
              <span className={`text-xs font-semibold ${services[key] ? 'text-muvv-accent' : 'text-muvv-dark'}`}>
                {SERVICE_LABELS[key]}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-muvv-muted text-[10px]">+R$ {SERVICE_COSTS[key]}</span>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  services[key] ? 'bg-muvv-accent border-muvv-accent' : 'border-muvv-border'
                }`}>
                  {services[key] && (
                    <Icon path={ICON_PATHS.check} size={9} color="white" strokeWidth={3} />
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── Grid de valores ── */}
      {gross > 0 && (
        <div className="grid grid-cols-2 gap-1.5">
          <div className="bg-muvv-primary rounded-xl p-2 text-center">
            <p className="text-muvv-muted text-[8px] mb-0.5">BRUTO</p>
            <p className="text-muvv-dark text-xs font-black">R$ {formatBRL(gross)}</p>
          </div>

          <div className="bg-muvv-prestige-light rounded-xl p-2 text-center">
            <p className="text-muvv-prestige text-[8px] mb-0.5">TAXA MUVV {(rate * 100).toFixed(0)}%</p>
            <p className="text-muvv-prestige text-xs font-black">-R$ {formatBRL(fee)}</p>
          </div>

          {adValorem > 0 && (
            <div className="bg-amber-50 rounded-xl p-2 text-center">
              <p className="text-amber-600 text-[8px] mb-0.5">AD VALOREM</p>
              <p className="text-amber-700 text-xs font-black">+R$ {formatBRL(adValorem)}</p>
            </div>
          )}

          {estadiaAmt > 0 && (
            <div className="bg-blue-50 rounded-xl p-2 text-center">
              <p className="text-blue-500 text-[8px] mb-0.5">ESTADIA</p>
              <p className="text-blue-600 text-xs font-black">+R$ {formatBRL(estadiaAmt)}</p>
            </div>
          )}

          {svcAmt > 0 && (
            <div className="bg-sky-50 rounded-xl p-2 text-center">
              <p className="text-sky-500 text-[8px] mb-0.5">SERVIÇOS</p>
              <p className="text-sky-600 text-xs font-black">+R$ {formatBRL(svcAmt)}</p>
            </div>
          )}

          <div className="col-span-2 bg-muvv-accent-light rounded-xl p-2.5 text-center border border-muvv-accent/20">
            <p className="text-muvv-accent text-[8px] font-bold mb-0.5">LÍQUIDO MOTORISTA</p>
            <p className="text-muvv-accent text-base font-black">R$ {formatBRL(net)}</p>
          </div>
        </div>
      )}

      {/* ── SlideToAccept — gateado por canAccept ── */}
      {canAccept ? (
        <SlideToAccept onAccept={onAccept} />
      ) : (
        <div className="w-full py-3 rounded-2xl bg-muvv-primary border border-dashed border-muvv-border/60 text-center">
          {category === 'zpe' ? (
            <p className="text-amber-600 text-xs font-semibold">
              📦 Preencha dimensões e peso acima para continuar
            </p>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-muvv-accent/30 border-t-muvv-accent rounded-full animate-spin" />
              <p className="text-muvv-muted text-xs font-semibold">Aguardando rota do OSRM...</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// HomeScreen — componente principal
// ─────────────────────────────────────────────────────────────────────────────
interface Props { onOrderDetail: (freight: Freight) => void }

export function HomeScreen({ onOrderDetail }: Props) {

  // ── Estado ──────────────────────────────────────────────────────────────────
  const [slots,        setSlots]        = useState<(RouteWaypoint | null)[]>([null, null])
  const [category,     setCategory]     = useState<FreightCategory>('heavy')
  const [distanceKm,   setDistanceKm]   = useState(0)
  const [cubage,       setCubage]       = useState<CubageData>(EMPTY_CUBAGE)
  const [estadia,      setEstadia]      = useState<EstadiaConfig>(DEFAULT_ESTADIA)
  const [services,     setServices]     = useState<AdditionalServices>(EMPTY_SERVICES)
  const [showSearch,   setShowSearch]   = useState(true)
  const [showCubage,   setShowCubage]   = useState(false)
  const [showEstadia,  setShowEstadia]  = useState(false)
  const [showServices, setShowServices] = useState(false)

  // ── Derivados ────────────────────────────────────────────────────────────────
  const filledWps  = useMemo(
    () => slots.filter((w): w is RouteWaypoint => w !== null),
    [slots]
  )
  const origin     = filledWps[0] ?? null
  const dest       = filledWps[filledWps.length - 1] ?? null
  const extraStops = slots.length - 2

  // FIX [1]: addressesReady gatea a sheet (nunca canAccept) → sem deadlock ZPE
  const addressesReady = filledWps.length >= 2 && origin !== null && dest !== null
  const valueReady     = category === 'zpe' ? isCubageReady(cubage) : distanceKm > 0
  const canAccept      = addressesReady && valueReady

  const gross = useMemo(() => {
    if (category === 'zpe') {
      return isCubageReady(cubage) ? calcFreightFromCubage(cubage, distanceKm) : 0
    }
    return calcFreightFromKm(distanceKm, category)
  }, [category, cubage, distanceKm])

  const cubageResult = useMemo(
    () => (category === 'zpe' && isCubageReady(cubage) ? calcCubage(cubage) : null),
    [category, cubage]
  )

  const adValorem = useMemo(
    () => category === 'zpe' && cubage.cargoValue > 0
      ? parseFloat((cubage.cargoValue * AD_VALOREM_PCT).toFixed(2))
      : 0,
    [category, cubage]
  )

  const estadiaAmt = useMemo(
    () => calcEstadia(estadia, category),
    [estadia, category]
  )

  const { fee, services: svcAmt, net, rate } = useMemo(
    () => calcNet(gross, category, services, cubage, { config: estadia }),
    [gross, category, services, cubage, estadia]
  )

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleRouteCalculated = useCallback((km: number) => setDistanceKm(km), [])

  const handleCategoryChange = useCallback((cat: FreightCategory) => {
    setCategory(cat)
    if (cat !== 'zpe') setCubage(EMPTY_CUBAGE)
  }, [])

  const setSlot = useCallback((i: number, wp: RouteWaypoint | null) => {
    setSlots(prev => { const n = [...prev]; n[i] = wp; return n })
    if (wp === null) setDistanceKm(0)
  }, [])

  const addStop = useCallback(() => {
    if (extraStops >= MAX_STOPS) return
    setSlots(prev => { const n = [...prev]; n.splice(n.length - 1, 0, null); return n })
  }, [extraStops])

  const removeStop = useCallback((i: number) => {
    setSlots(prev => prev.filter((_, idx) => idx !== i))
  }, [])

  const toggleService = useCallback((key: keyof AdditionalServices) => {
    setServices((prev: AdditionalServices) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const setCubageField = useCallback((field: keyof CubageData, val: number) => {
    setCubage((prev: CubageData) => ({ ...prev, [field]: val }))
  }, [])

  const handleSimApply = useCallback((
    km: number, cb: CubageData, es: EstadiaConfig
  ) => {
    if (km > 0) setDistanceKm(km)
    setCubage(cb)
    setEstadia(es)
  }, [])

  // FIX [2]: passa waypoints[] completo → OrderDetailScreen reconstrói rota idêntica
  const handleAccept = useCallback(() => {
    if (!origin || !dest) return
    onOrderDetail({
      from:        origin.address,
      to:          dest.address,
      distance:    distanceKm > 0 ? `${distanceKm.toFixed(1)} km` : '—',
      distanceKm,
      durationMin: 0,
      value:       gross,
      category,
      cubage:      category === 'zpe' ? cubage : undefined,
      services,
      estadia:     estadiaAmt > 0 ? estadia : undefined,
      fromCoords:  { lat: origin.lat, lng: origin.lng },
      toCoords:    { lat: dest.lat,   lng: dest.lng   },
      waypoints:   filledWps,
    })
  }, [origin, dest, gross, distanceKm, category, cubage, services, estadia, estadiaAmt, filledWps, onOrderDetail])

  // ── Prop bags ────────────────────────────────────────────────────────────────
  const slotLabels = [
    'Ponto de Coleta (Origem)',
    ...Array.from({ length: extraStops }, (_, i) => `Parada ${i + 1}`),
    'Destino Final',
  ]
  const activeServicesCount = Object.values(services).filter(Boolean).length

  const addressProps: AddressPanelProps = {
    slots, slotLabels, extraStops, showSearch,
    filledCount: filledWps.length,
    onToggle: () => setShowSearch(v => !v),
    onSelect: setSlot, onRemove: removeStop, onAdd: addStop,
  }

  const freightProps: FreightPanelProps = {
    origin, dest, distanceKm, category,
    gross, fee, svcAmt, adValorem, estadiaAmt, net, rate,
    cubageResult, cubage, estadia, services, activeServicesCount,
    showCubage, showEstadia, showServices,
    onCategoryChange: handleCategoryChange,
    onCubageField:    setCubageField,
    onEstadiaChange:  setEstadia,
    onToggleCubage:   () => setShowCubage(v => !v),
    onToggleEstadia:  () => setShowEstadia(v => !v),
    onToggleServices: () => setShowServices(v => !v),
    onToggleService:  toggleService,
    canAccept,
    onAccept: handleAccept,
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    // Desktop: flex-row → [mapa flex-1] [sidebar w-80] [SimPanel w-72]
    // Mobile:  flex-col relative → mapa absoluto atrás dos overlays
    <div className="flex-1 flex lg:flex-row relative overflow-hidden">

      {/* ═══ MAPA ═══════════════════════════════════════════════════════════════
          Mobile:  absolute inset-0 (cobre tudo)
          Desktop: relative flex-1 (cresce para preencher espaço restante) */}
      <div className="absolute inset-0 lg:relative lg:flex-1 lg:min-w-0">
        <RouteMap
          waypoints={filledWps}
          fullHeight
          onRouteCalculated={handleRouteCalculated}
        />
      </div>

      {/* ═══ OVERLAYS MOBILE (lg:hidden) ════════════════════════════════════════ */}
      <div className="lg:hidden absolute inset-0 pointer-events-none z-[400]">

        {/* Cabeçalho com saudação */}
        <div
          className="pointer-events-auto absolute top-0 left-0 right-0 px-3 pt-5 pb-3"
          style={{ background: 'linear-gradient(180deg,rgba(26,43,53,0.72) 0%,transparent 100%)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/65 text-xs font-medium">{getGreeting()},</p>
              <h2 className="text-white text-lg font-extrabold leading-tight">Marcos Piauí 🌊</h2>
            </div>
            <span className="bg-muvv-accent/90 text-white text-[11px] font-bold px-3 py-1 rounded-full pointer-events-auto">
              ● Online
            </span>
          </div>
        </div>

        {/* Painel de busca */}
        <div className="pointer-events-auto absolute left-3 right-3 top-[72px]">
          <AddressPanel {...addressProps} />
        </div>

        {/* Bottom Sheet — sempre visível quando addressesReady (FIX [1]) */}
        {addressesReady && (
          <div className="pointer-events-auto absolute bottom-0 left-0 right-0 animate-slide-up">
            <div className="glass rounded-t-[24px] shadow-sheet border-t border-white/50 px-3 pt-3 pb-6">
              <div className="w-10 h-1 bg-muvv-border rounded-full mx-auto mb-3" />
              <FreightPanel {...freightProps} />
            </div>
          </div>
        )}
      </div>

      {/* ═══ SIDEBAR DESKTOP (hidden on mobile) ═════════════════════════════════ */}
      <aside className="hidden lg:flex flex-col w-80 xl:w-96 flex-shrink-0 bg-muvv-primary border-l border-muvv-border overflow-y-auto z-10">

        {/* Header */}
        <div
          className="px-5 pt-6 pb-5 flex-shrink-0"
          style={{ background: 'linear-gradient(160deg,#1A2B35 0%,#3D6B7D 100%)' }}
        >
          <p className="text-white/60 text-xs font-medium">{getGreeting()},</p>
          <h2 className="text-white text-xl font-extrabold leading-tight mt-0.5">Marcos Piauí 🌊</h2>
          <span className="mt-2.5 inline-flex items-center bg-muvv-accent/90 text-white text-[11px] font-bold px-3 py-1 rounded-full">
            ● Online
          </span>
        </div>

        {/* Busca */}
        <div className="px-4 pt-4 pb-2 flex-shrink-0">
          <AddressPanel {...addressProps} />
        </div>

        {/* Detalhes do frete */}
        {addressesReady ? (
          <div className="flex-1 overflow-y-auto px-4 pb-6 pt-2">
            <FreightPanel {...freightProps} />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center px-6 text-center">
            <div>
              <p className="text-5xl mb-4">🗺</p>
              <p className="text-muvv-dark font-bold text-sm">Digite origem e destino</p>
              <p className="text-muvv-muted text-xs mt-1.5 leading-relaxed">
                Rota calculada automaticamente via OSRM.<br />
                Cubagem e estadia disponíveis ao preencher.
              </p>
            </div>
          </div>
        )}
      </aside>

      {/* ═══ SIMULATION PANEL (SimPanel) ════════════════════════════════════════
          Desktop: hidden lg:flex sidebar fixa à direita
          Mobile:  botão flutuante + drawer bottom-up */}
      <SimPanel
        defaultCategory={category}
        osrmKm={distanceKm}
        onApply={handleSimApply}
      />
    </div>
  )
}
