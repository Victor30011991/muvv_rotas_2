// ─── CheckMuvvCard v2.4 — Módulo 4: Verificação de Segurança ─────────────────
// Exibe o perfil Check-Muvv do motorista com badge de segurança,
// status ANTT, RADAR ZPE e score composto.

import { Icon, ICON_PATHS } from '@/components/Icon'
import { buildCheckMuvv } from '@/utils/calculations'
import type { CheckMuvv, SafetyBadge, AnttStatus } from '@/types'
import { SAFETY_BADGE_LABELS, SAFETY_BADGE_COLORS } from '@/types'

// ─── Dados mock do motorista logado ──────────────────────────────────────────
const MOCK_DRIVER: CheckMuvv = buildCheckMuvv({
  driverId:      'MV-2847',
  name:          'Marcos A. Piaui',
  anttNumber:    'RNTRC-00847265',
  anttExpiry:    '2026-11-15',
  radarStatus:   'cleared',
  avgRating:     4.9,
  totalFreights: 127,
  incidents:     0,
})

// ─── Sub-componentes ──────────────────────────────────────────────────────────
function AnttBadge({ status }: { status: AnttStatus }) {
  const cfgMap = {
    valid:         { label: '✅ ANTT Válida',         bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200' },
    expiring_soon: { label: '⏳ Vence em 60 dias',    bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200' },
    expired:       { label: '❌ ANTT Vencida',        bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200'   },
  } as const
  const cfg = cfgMap[status]
  return (
    <div className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      {cfg.label}
    </div>
  )
}

function RadarBadge({ status }: { status: CheckMuvv['radarStatus'] }) {
  const cfgMap = {
    cleared: { label: '🛃 RADAR Liberado',    bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200' },
    pending: { label: '⏳ RADAR Pendente',    bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200' },
    blocked: { label: '🚫 RADAR Bloqueado',   bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200'   },
  } as const
  const cfg = cfgMap[status]
  return (
    <div className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      {cfg.label}
    </div>
  )
}

// Score ring visual
function ScoreRing({ score, badge }: { score: number; badge: SafetyBadge }) {
  const color = SAFETY_BADGE_COLORS[badge]
  const circumference = 2 * Math.PI * 30
  const dashOffset = circumference - (score / 100) * circumference

  return (
    <div className="relative w-20 h-20 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="30" fill="none" stroke="#EBF2F5" strokeWidth="7" />
        <circle cx="40" cy="40" r="30" fill="none"
          stroke={color} strokeWidth="7"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="text-center z-10">
        <p className="text-xl font-black" style={{ color }}>{score.toFixed(0)}</p>
        <p className="text-[8px] text-muvv-muted font-bold">SCORE</p>
      </div>
    </div>
  )
}

// Breakdown do score
function ScoreBreakdown({ driver }: { driver: CheckMuvv }) {
  const ratingPct  = ((driver.avgRating - 1) / 4) * 100
  const expPct     = Math.min(100, (driver.totalFreights / 200) * 100)
  const historyPct = 100

  const bars = [
    { label: 'Avaliação (40%)',      pct: ratingPct,  color: '#1CC8C8', val: `${driver.avgRating.toFixed(1)} ⭐` },
    { label: 'Experiência (35%)',    pct: expPct,      color: '#57A6C1', val: `${driver.totalFreights} fretes` },
    { label: 'Histórico (25%)',      pct: historyPct,  color: '#DAA520', val: 'Sem ocorrências' },
  ]

  return (
    <div className="space-y-2">
      {bars.map(b => (
        <div key={b.label}>
          <div className="flex justify-between mb-0.5">
            <span className="text-[10px] text-muvv-muted">{b.label}</span>
            <span className="text-[10px] font-bold text-muvv-dark">{b.val}</span>
          </div>
          <div className="h-1.5 bg-muvv-border rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
                 style={{ width: `${b.pct}%`, background: b.color }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
interface Props {
  driver?: CheckMuvv
}

export function CheckMuvvCard({ driver = MOCK_DRIVER }: Props) {
  const badgeColor = SAFETY_BADGE_COLORS[driver.safetyBadge]
  const badgeLabel = SAFETY_BADGE_LABELS[driver.safetyBadge]
  const lastVerified = new Date(driver.lastVerified).toLocaleDateString('pt-BR')
  const anttExpiry   = new Date(driver.anttExpiry).toLocaleDateString('pt-BR')

  return (
    <div className="bg-white rounded-[20px] overflow-hidden shadow-card border border-muvv-border">

      {/* Header gradiente com badge */}
      <div className="px-5 pt-5 pb-4" style={{ background: `linear-gradient(135deg, ${badgeColor}18, ${badgeColor}06)` }}>
        <div className="flex items-start gap-4">
          {/* Score ring */}
          <ScoreRing score={driver.safetyScore} badge={driver.safetyBadge} />

          {/* Info do motorista */}
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base font-black"
                    style={{ color: badgeColor }}>{badgeLabel}</span>
            </div>
            <p className="text-muvv-dark text-base font-extrabold leading-tight truncate">
              {driver.name}
            </p>
            <p className="text-muvv-muted text-[11px] mt-0.5">
              ID #{driver.driverId} · {driver.totalFreights} fretes
            </p>

            {/* ZPE Authorization */}
            {driver.zpeAuthorized ? (
              <div className="mt-2 inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
                <Icon path={ICON_PATHS.star} size={12} color="#DAA520" strokeWidth={0} />
                <span className="text-amber-700 text-[10px] font-bold">Autorizado ZPE / Exportação</span>
              </div>
            ) : (
              <div className="mt-2 inline-flex items-center gap-1.5 bg-muvv-primary border border-muvv-border rounded-full px-2.5 py-1">
                <span className="text-muvv-muted text-[10px]">ZPE: pendente verificação</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status ANTT + RADAR */}
      <div className="px-4 pb-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-muvv-muted text-[9px] font-bold uppercase mb-1">ANTT · {anttExpiry}</p>
            <AnttBadge status={driver.anttStatus} />
          </div>
          <div>
            <p className="text-muvv-muted text-[9px] font-bold uppercase mb-1">RADAR Receita Federal</p>
            <RadarBadge status={driver.radarStatus} />
          </div>
        </div>

        {/* ANTT number */}
        <div className="bg-muvv-primary rounded-xl px-3 py-2 flex items-center justify-between">
          <div>
            <p className="text-muvv-muted text-[10px]">Número RNTRC</p>
            <p className="text-muvv-dark text-xs font-bold font-mono">{driver.anttNumber}</p>
          </div>
          <Icon path={ICON_PATHS.docs} size={16} color="#8AAEBB" />
        </div>

        {/* Score breakdown */}
        <div>
          <p className="text-muvv-dark text-[11px] font-extrabold uppercase tracking-widest mb-2">
            Composição do Score
          </p>
          <ScoreBreakdown driver={driver} />
        </div>

        {/* Avaliações */}
        <div className="flex items-center justify-between bg-muvv-primary rounded-xl px-4 py-3">
          <div>
            <p className="text-muvv-dark text-sm font-extrabold">{driver.avgRating.toFixed(1)}</p>
            <p className="text-muvv-muted text-[10px]">Avaliação média</p>
          </div>
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Icon
                key={i}
                path={ICON_PATHS.star}
                size={14}
                color={i < Math.round(driver.avgRating) ? '#DAA520' : '#D0E4EC'}
                strokeWidth={0}
              />
            ))}
          </div>
          <div className="text-right">
            <p className="text-muvv-dark text-sm font-extrabold">{driver.totalFreights}</p>
            <p className="text-muvv-muted text-[10px]">Total de fretes</p>
          </div>
        </div>

        {/* Última verificação */}
        <p className="text-muvv-muted text-[10px] text-center">
          Última verificação Check-Muvv: {lastVerified}
        </p>
      </div>
    </div>
  )
}
