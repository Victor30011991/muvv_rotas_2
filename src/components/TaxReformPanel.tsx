// ─── TaxReformPanel v2.4 — Módulo 2: Reforma Tributária IBS/CBS 2026 ──────────
// Transparência fiscal total para o motorista: IBS estadual + CBS federal.
// Exibido no OrderDetailScreen após o breakdown financeiro.

import { useState, useMemo } from 'react'
import { Icon, ICON_PATHS } from '@/components/Icon'
import { calcTaxReform2026, formatBRL } from '@/utils/calculations'
import type { TaxRegime } from '@/types'
import { TAX_REGIME_LABELS } from '@/types'

// UFs do Brasil para o selector
const STATES = [
  'PI','CE','MA','PA','BA','PE','RN','PB','SE','AL',
  'SP','RJ','MG','RS','SC','PR','GO','MT','MS','DF',
  'AM','AC','RR','AP','TO','RO',
]

interface Props {
  netFreight: number    // líquido antes dos impostos
  destState?: string   // UF do destino (pré-preenchido quando disponível)
}

export function TaxReformPanel({ netFreight, destState: initialState = 'PI' }: Props) {
  const [open,    setOpen]    = useState(false)
  const [state,   setState]   = useState(initialState)
  const [regime,  setRegime]  = useState<TaxRegime>('simples')

  const tax = useMemo(
    () => calcTaxReform2026(netFreight, state, regime),
    [netFreight, state, regime]
  )

  const effRate = netFreight > 0
    ? parseFloat(((tax.totalTaxAmt / netFreight) * 100).toFixed(1))
    : 0

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-card border border-muvv-border">
      {/* Header clicável */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 cursor-pointer border-none bg-white"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
            <span className="text-base">📋</span>
          </div>
          <div className="text-left">
            <p className="text-muvv-dark text-sm font-extrabold">
              Reforma Tributária 2026
            </p>
            <p className="text-muvv-muted text-[11px]">
              {open
                ? 'IBS · CBS · Regime Fiscal'
                : `IBS + CBS ≈ ${effRate}% · R$ ${formatBRL(tax.totalTaxAmt)}`
              }
            </p>
          </div>
        </div>
        <div className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <Icon path={ICON_PATHS.arrowLeft} size={16} color="#8AAEBB" />
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-muvv-border animate-fade-in">

          {/* UF Destino */}
          <div className="pt-3">
            <label className="text-muvv-muted text-[10px] font-bold uppercase tracking-widest mb-1.5 block">
              UF do Destino
            </label>
            <div className="relative">
              <select
                value={state}
                onChange={e => setState(e.target.value)}
                className="w-full bg-muvv-primary rounded-xl px-3 py-2 text-muvv-dark text-sm font-bold outline-none appearance-none cursor-pointer border border-muvv-border focus:border-muvv-accent"
              >
                {STATES.map(uf => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <Icon path={ICON_PATHS.arrowLeft} size={12} color="#8AAEBB"
                  className="rotate-[-90deg]" />
              </div>
            </div>
          </div>

          {/* Regime fiscal */}
          <div>
            <label className="text-muvv-muted text-[10px] font-bold uppercase tracking-widest mb-1.5 block">
              Regime Fiscal do Motorista
            </label>
            <div className="space-y-1.5">
              {(Object.keys(TAX_REGIME_LABELS) as TaxRegime[]).map(r => (
                <button
                  key={r}
                  onClick={() => setRegime(r)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all border-2 cursor-pointer ${
                    regime === r
                      ? 'border-muvv-accent bg-muvv-accent-light text-muvv-accent'
                      : 'border-transparent bg-muvv-primary text-muvv-muted'
                  }`}
                >
                  <span className="font-semibold">{TAX_REGIME_LABELS[r]}</span>
                  {regime === r && (
                    <Icon path={ICON_PATHS.check} size={14} color="#1CC8C8" strokeWidth={2.5} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Breakdown fiscal */}
          <div className="bg-muvv-primary rounded-2xl p-3 space-y-2">
            <p className="text-muvv-dark text-[10px] font-extrabold uppercase tracking-widest mb-2">
              💡 Impacto Fiscal Estimado
            </p>

            <div className="flex justify-between items-center py-1">
              <div>
                <p className="text-muvv-dark text-xs font-semibold">
                  IBS — {state} ({(tax.ibsRate * 100).toFixed(2)}%)
                </p>
                <p className="text-muvv-muted text-[10px]">Imposto sobre Bens e Serviços</p>
              </div>
              <span className="text-red-400 text-sm font-bold">
                {tax.ibsAmt > 0 ? `-R$ ${formatBRL(tax.ibsAmt)}` : 'Isento'}
              </span>
            </div>

            <div className="flex justify-between items-center py-1 border-t border-muvv-border">
              <div>
                <p className="text-muvv-dark text-xs font-semibold">
                  CBS — Federal ({(tax.cbsRate * 100).toFixed(1)}%)
                </p>
                <p className="text-muvv-muted text-[10px]">Substitui PIS + COFINS</p>
              </div>
              <span className="text-red-400 text-sm font-bold">
                {tax.cbsAmt > 0 ? `-R$ ${formatBRL(tax.cbsAmt)}` : 'Isento'}
              </span>
            </div>

            <div className="flex justify-between items-center pt-2 border-t-2 border-muvv-accent/20">
              <div>
                <p className="text-muvv-accent text-sm font-extrabold">
                  ✓ Líquido Pós-Impostos
                </p>
                <p className="text-muvv-muted text-[10px]">
                  Alíquota efetiva: {effRate}%
                </p>
              </div>
              <span className="text-muvv-accent text-xl font-black">
                R$ {formatBRL(tax.netAfterTax)}
              </span>
            </div>
          </div>

          {/* Nota informativa */}
          {regime === 'simples' && (
            <div className="bg-green-50 rounded-xl px-3 py-2 border border-green-200">
              <p className="text-green-700 text-[11px] font-semibold">
                ✅ Simples Nacional: IBS/CBS recolhidos via DAS unificado. Sem cobrança extra por frete.
              </p>
            </div>
          )}
          {regime !== 'simples' && (
            <div className="bg-amber-50 rounded-xl px-3 py-2 border border-amber-200">
              <p className="text-amber-700 text-[11px]">
                ⚠️ Valores estimados para 2026. Alíquotas definitivas sujeitas à regulamentação do Comitê Gestor do IBS.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
