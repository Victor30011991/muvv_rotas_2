// ─── DiarioBordo v2.4 — Módulo 3: Diário de Bordo Financeiro ─────────────────
// Dashboard de performance: lucro acumulado, ociosidade e alerta de manutenção.
// Os registros são mantidos em estado local (localStorage simulado via useState).

import { useState, useMemo, useCallback } from 'react'
import { Icon, ICON_PATHS } from '@/components/Icon'
import { calcDiarioBordoStats, formatBRL } from '@/utils/calculations'
import type { FreightRecord, FreightCategory } from '@/types'

// ─── Dados mock para demo ─────────────────────────────────────────────────────
function makeMock(): FreightRecord[] {
  const cats: FreightCategory[] = ['light', 'heavy', 'zpe', 'heavy', 'light']
  const routes = [
    { from: 'Teresina, PI', to: 'Parnaíba, PI', km: 330 },
    { from: 'Teresina, PI', to: 'Fortaleza, CE', km: 640 },
    { from: 'Parnaíba, PI', to: 'São Luís, MA', km: 480 },
    { from: 'Teresina, PI', to: 'Picos, PI', km: 310 },
    { from: 'Floriano, PI', to: 'Teresina, PI', km: 280 },
  ]
  const now = new Date()
  return routes.map((r, i) => {
    const d = new Date(now)
    d.setDate(now.getDate() - i * 3)
    const gross = 150 + r.km * 0.55
    const net   = gross * 0.88
    const fuel  = r.km * 0.45
    return {
      id:         `demo-${i}`,
      date:       d.toISOString(),
      from:       r.from, to: r.to,
      distanceKm: r.km,
      gross, net, fuel,
      profit:     parseFloat((net - fuel).toFixed(2)),
      emptyKm:    Math.round(r.km * 0.15),
      category:   cats[i],
      multiplier: 1.0 + i * 0.05,
    }
  })
}

// ─── Mini barra de progresso ──────────────────────────────────────────────────
function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="h-1.5 bg-muvv-border rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  )
}

// ─── Card de métrica ──────────────────────────────────────────────────────────
function MetricCard({
  icon, label, value, sub, color, alert,
}: {
  icon: string; label: string; value: string
  sub: string; color: string; alert?: boolean
}) {
  return (
    <div className={`rounded-xl p-3 border ${alert ? 'bg-red-50 border-red-200' : 'bg-white border-muvv-border'}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">{icon}</span>
        <p className={`text-[10px] font-bold uppercase tracking-wide ${alert ? 'text-red-500' : 'text-muvv-muted'}`}>
          {label}
        </p>
      </div>
      <p className={`text-base font-black ${alert ? 'text-red-500' : 'text-muvv-dark'}`} style={alert ? {} : { color }}>
        {value}
      </p>
      <p className="text-muvv-muted text-[9px] mt-0.5">{sub}</p>
    </div>
  )
}

// ─── Linha de frete no histórico ──────────────────────────────────────────────
function FreightRow({ record }: { record: FreightRecord }) {
  const d = new Date(record.date)
  const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  const catIcon = record.category === 'light' ? '🚗' : record.category === 'heavy' ? '🚛' : '📦'
  const isProfit = record.profit >= 0

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-muvv-border last:border-0">
      <div className="w-9 h-9 rounded-xl bg-muvv-primary flex items-center justify-center flex-shrink-0 text-base">
        {catIcon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-muvv-dark text-xs font-semibold truncate">
          {record.from.split(',')[0]} → {record.to.split(',')[0]}
        </p>
        <p className="text-muvv-muted text-[10px]">
          {dateStr} · {record.distanceKm.toFixed(0)} km
          {record.multiplier !== 1.0 && (
            <span className="text-amber-500 ml-1">{record.multiplier.toFixed(2)}×</span>
          )}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={`text-sm font-black ${isProfit ? 'text-muvv-accent' : 'text-red-400'}`}>
          {isProfit ? '+' : ''}R$ {formatBRL(record.profit)}
        </p>
        <p className="text-muvv-muted text-[9px]">R$ {formatBRL(record.net)} líq.</p>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function DiarioBordo() {
  const [records, setRecords] = useState<FreightRecord[]>(() => makeMock())
  const [tab, setTab] = useState<'dashboard' | 'history'>('dashboard')

  const stats = useMemo(() => calcDiarioBordoStats(records), [records])

  const handleClear = useCallback(() => {
    if (confirm('Apagar todos os registros do Diário?')) setRecords([])
  }, [])

  const maintenancePct = Math.min(100, ((10000 - stats.maintenanceKmLeft) / 10000) * 100)

  return (
    <div className="bg-white rounded-[20px] overflow-hidden shadow-card border border-muvv-border">

      {/* Header */}
      <div className="bg-gradient-header-dark px-4 py-3.5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-muvv-accent/20 flex items-center justify-center">
          <span className="text-base">📒</span>
        </div>
        <div className="flex-1">
          <p className="text-white font-extrabold text-sm">Diário de Bordo</p>
          <p className="text-white/50 text-[11px]">
            {stats.totalFreights} fretes · R$ {formatBRL(stats.monthlyProfit)} este mês
          </p>
        </div>
        <button
          onClick={handleClear}
          className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center border-none cursor-pointer"
        >
          <Icon path={ICON_PATHS.x} size={12} color="rgba(255,255,255,0.5)" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-muvv-border">
        {(['dashboard', 'history'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-xs font-bold cursor-pointer border-none transition-all ${
              tab === t
                ? 'text-muvv-accent border-b-2 border-muvv-accent bg-muvv-accent-light'
                : 'text-muvv-muted bg-white'
            }`}
          >
            {t === 'dashboard' ? '📊 Dashboard' : '📋 Histórico'}
          </button>
        ))}
      </div>

      {/* ── Dashboard ── */}
      {tab === 'dashboard' && (
        <div className="p-4 space-y-4 animate-fade-in">

          {/* Métricas principais */}
          <div className="grid grid-cols-2 gap-2.5">
            <MetricCard
              icon="💰" label="Lucro Mensal"
              value={`R$ ${formatBRL(stats.monthlyProfit)}`}
              sub={`R$ ${formatBRL(stats.weeklyProfit)} esta semana`}
              color="#1CC8C8"
            />
            <MetricCard
              icon="🚛" label="Média/Frete"
              value={`R$ ${formatBRL(stats.avgProfitPerFreight)}`}
              sub={`${stats.totalFreights} fretes total`}
              color="#57A6C1"
            />
            <MetricCard
              icon="🛣️" label="KM Total"
              value={`${stats.totalKm.toFixed(0)} km`}
              sub={`${stats.totalEmptyKm.toFixed(0)} km vazio`}
              color="#3D6B7D"
            />
            <MetricCard
              icon="📉" label="Ociosidade"
              value={`${stats.ociosidadePct.toFixed(1)}%`}
              sub="KM rodado sem carga"
              color={stats.ociosidadePct > 30 ? '#E57373' : '#DAA520'}
              alert={stats.ociosidadePct > 30}
            />
          </div>

          {/* Custo de ociosidade */}
          {stats.totalEmptyKm > 0 && (
            <div className="bg-orange-50 rounded-xl p-3 border border-orange-100">
              <div className="flex items-center justify-between mb-1">
                <p className="text-orange-600 text-xs font-bold">📦 Custo de Ociosidade</p>
                <p className="text-orange-700 text-sm font-black">
                  -R$ {formatBRL(stats.totalEmptyKm * 0.45)}
                </p>
              </div>
              <p className="text-orange-500 text-[10px]">
                {stats.totalEmptyKm.toFixed(0)} km vazios × R$0,45/km combustível
              </p>
              <ProgressBar value={stats.totalEmptyKm} max={stats.totalKm} color="#FB923C" />
            </div>
          )}

          {/* Manutenção */}
          <div className={`rounded-xl p-3 border ${stats.maintenanceAlert ? 'bg-red-50 border-red-300' : 'bg-muvv-primary border-muvv-border'}`}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-base">🔧</span>
                <p className={`text-xs font-bold ${stats.maintenanceAlert ? 'text-red-600' : 'text-muvv-dark'}`}>
                  Previsão de Manutenção
                </p>
              </div>
              <span className={`text-xs font-black ${stats.maintenanceAlert ? 'text-red-500' : 'text-muvv-muted'}`}>
                {stats.maintenanceKmLeft.toFixed(0)} km restantes
              </span>
            </div>
            <ProgressBar
              value={maintenancePct}
              max={100}
              color={stats.maintenanceAlert ? '#EF4444' : '#57A6C1'}
            />
            {stats.maintenanceAlert && (
              <p className="text-red-500 text-[10px] mt-1.5 font-semibold">
                ⚠️ Revisão necessária! Agende com seu mecânico.
              </p>
            )}
            {!stats.maintenanceAlert && (
              <p className="text-muvv-muted text-[10px] mt-1">
                Próxima revisão a cada 10.000 km
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Histórico ── */}
      {tab === 'history' && (
        <div className="animate-fade-in">
          {stats.records.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-4xl mb-2">📭</p>
              <p className="text-muvv-muted text-sm">Nenhum frete registrado ainda</p>
              <p className="text-muvv-muted text-xs mt-1">Aceite um frete para começar</p>
            </div>
          ) : (
            <div className="px-4 pb-2">
              {stats.records.slice().reverse().map((r: FreightRecord) => (
                <FreightRow key={r.id} record={r} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
