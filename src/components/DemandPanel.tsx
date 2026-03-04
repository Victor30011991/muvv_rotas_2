// ─── DemandPanel v2.4 — Módulo 1: Fator de Demanda Dinâmico ──────────────────
// Multiplicador 0.9x – 1.4x baseado em sazonalidade, urgência e disponibilidade
// Exibido no OrderDetailScreen e no SimPanel para ajustar o frete base.

import { useMemo } from 'react'
import { Icon, ICON_PATHS } from '@/components/Icon'
import {
  calcDynamicMultiplier, describeDemandFactors, formatBRL,
} from '@/utils/calculations'
import type { DemandFactors, DemandUrgency, DemandSeason, DemandAvailability } from '@/types'
import {
  URGENCY_LABELS, SEASON_LABELS, AVAILABILITY_LABELS,
} from '@/types'

interface Props {
  factors:   DemandFactors
  onChange:  (f: DemandFactors) => void
  baseFreight?: number  // mostra o valor ajustado quando fornecido
  compact?:  boolean    // modo compacto para usar dentro do SimPanel
}

// ── Chip selector genérico ────────────────────────────────────────────────────
function ChipSelect<T extends string>({
  label, value, options, onChange, activeColor,
}: {
  label: string
  value: T
  options: Record<T, string>
  onChange: (v: T) => void
  activeColor: string
}) {
  return (
    <div>
      <p className="text-muvv-muted text-[10px] font-bold uppercase tracking-widest mb-1.5">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(options) as T[]).map(key => {
          const on = value === key
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border-none cursor-pointer transition-all ${
                on ? 'text-white shadow-sm' : 'bg-muvv-primary text-muvv-muted'
              }`}
              style={on ? { background: activeColor } : {}}
            >
              {options[key]}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function DemandPanel({ factors, onChange, baseFreight, compact = false }: Props) {
  const multiplier = useMemo(() => calcDynamicMultiplier(factors), [factors])
  const { label, color, delta } = useMemo(() => describeDemandFactors(factors), [factors])
  const adjustedFreight = baseFreight ? Math.round(baseFreight * multiplier) : null

  const multiplierBg =
    multiplier >= 1.3 ? 'bg-red-50 border-red-200' :
    multiplier >= 1.1 ? 'bg-amber-50 border-amber-200' :
    multiplier < 1.0  ? 'bg-blue-50 border-blue-200' :
                        'bg-muvv-primary border-muvv-border'

  return (
    <div className={`rounded-2xl border overflow-hidden ${multiplierBg}`}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between gap-3"
           style={{ background: `${color}18` }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
               style={{ background: `${color}25` }}>
            <Icon path={ICON_PATHS.trending} size={16} color={color} />
          </div>
          <div>
            <p className="text-muvv-dark text-sm font-extrabold">
              Fator de Demanda
            </p>
            <p className="text-[10px] font-semibold" style={{ color }}>
              {label}
            </p>
          </div>
        </div>

        {/* Multiplicador badge */}
        <div className="flex flex-col items-end">
          <span className="text-[22px] font-black" style={{ color }}>
            {multiplier.toFixed(2)}×
          </span>
          <span className="text-[10px] font-bold" style={{ color }}>
            {delta > 0 ? `+${delta}%` : delta < 0 ? `${delta}%` : 'base'}
          </span>
        </div>
      </div>

      {/* Controles */}
      <div className={`px-4 py-3 space-y-3 ${compact ? '' : ''}`}>
        <ChipSelect<DemandUrgency>
          label="Urgência"
          value={factors.urgency}
          options={URGENCY_LABELS}
          onChange={v => onChange({ ...factors, urgency: v })}
          activeColor={
            factors.urgency === 'critico' ? '#E57373' :
            factors.urgency === 'expresso' ? '#DAA520' : '#57A6C1'
          }
        />

        <ChipSelect<DemandSeason>
          label="Sazonalidade"
          value={factors.season}
          options={SEASON_LABELS}
          onChange={v => onChange({ ...factors, season: v })}
          activeColor={
            factors.season === 'safra' ? '#81C784' :
            factors.season === 'blackfriday' ? '#9C27B0' :
            factors.season === 'feriado' ? '#FF7043' : '#57A6C1'
          }
        />

        <ChipSelect<DemandAvailability>
          label="Oferta de Veículos"
          value={factors.availability}
          options={AVAILABILITY_LABELS}
          onChange={v => onChange({ ...factors, availability: v })}
          activeColor={
            factors.availability === 'baixa' ? '#E57373' :
            factors.availability === 'alta' ? '#66BB6A' : '#57A6C1'
          }
        />

        {/* Preview do valor ajustado */}
        {adjustedFreight !== null && baseFreight !== undefined && (
          <div className="mt-2 pt-3 border-t border-muvv-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muvv-muted text-[10px]">Frete base</p>
                <p className="text-muvv-dark text-sm font-bold line-through opacity-50">
                  R$ {formatBRL(baseFreight)}
                </p>
              </div>
              <Icon path={ICON_PATHS.arrow} size={14} color="#8AAEBB" />
              <div className="text-right">
                <p className="text-[10px] font-bold" style={{ color }}>
                  Frete ajustado
                </p>
                <p className="text-[22px] font-black" style={{ color }}>
                  R$ {formatBRL(adjustedFreight)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
