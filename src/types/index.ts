// ─── Tipos globais — Muvv Rotas v2.4 (Upgrade 2026) ──────────────────────────

export type FreightCategory = 'light' | 'heavy' | 'zpe'
export type Screen    = 'home' | 'docs' | 'wallet' | 'order' | 'profile'
export type NavTab    = Exclude<Screen, 'order'>
export type SimPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly'

// ── Serviços adicionais ───────────────────────────────────────────────────────
export interface AdditionalServices {
  insurance:   boolean
  tracking:    boolean
  lockMonitor: boolean
}
export const SERVICE_COSTS: Record<keyof AdditionalServices, number> = {
  insurance: 85, tracking: 45, lockMonitor: 65,
}
export const SERVICE_LABELS: Record<keyof AdditionalServices, string> = {
  insurance:   '🛡 Seguro de Carga',
  tracking:    '📡 Rastreamento GPS',
  lockMonitor: '🔒 Monitoramento com Travas',
}

// ── Cubagem ───────────────────────────────────────────────────────────────────
export interface CubageData {
  length: number; width: number; height: number
  realWeight: number; cargoValue: number
}
export const EMPTY_CUBAGE: CubageData = {
  length: 0, width: 0, height: 0, realWeight: 0, cargoValue: 0,
}

// ── Estadia ───────────────────────────────────────────────────────────────────
export interface EstadiaConfig {
  waitMinutes: number; franchiseMinutes: number
}
export const DEFAULT_ESTADIA: EstadiaConfig = {
  waitMinutes: 0, franchiseMinutes: 60,
}

// ── Frete ─────────────────────────────────────────────────────────────────────
export interface Freight {
  from: string; to: string; distance: string
  distanceKm: number; durationMin: number; value: number
  category: FreightCategory
  cubage?: CubageData; services?: AdditionalServices; estadia?: EstadiaConfig
  fromCoords?: { lat: number; lng: number }
  toCoords?:   { lat: number; lng: number }
  waypoints?:  RouteWaypoint[]
}

export interface FreightCalc {
  gross: number; fee: number; services: number
  adValorem: number; estadia: number; net: number; rate: number
}

// ── Tipos de apoio ─────────────────────────────────────────────────────────────
export interface Transaction {
  id: number; label: string; type: 'credit' | 'debit'
  amount: number; cat: string; time: string; euro?: number
}
export interface DocItem {
  id: string; label: string; subtitle: string
  iconPath: string; required: boolean; isGold?: boolean
}
export interface RouteWaypoint {
  id: string; lat: number; lng: number; label: string; address: string
}
export interface NominatimResult {
  place_id: number; display_name: string; lat: string; lon: string
  address: {
    road?: string; suburb?: string; city?: string; town?: string
    village?: string; state?: string; country?: string; postcode?: string
  }
}
export interface SimProjection {
  period: SimPeriod; deliveries: number; revenue: number
  fees: number; net: number; fuel: number; profit: number
}
export interface MuvvProjection {
  period: SimPeriod; totalRevenue: number; lightFees: number
  heavyFees: number; zpeFees: number; serviceFees: number; totalPlatform: number
}

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO 1 — Inteligência Preditiva: Fator de Demanda Dinâmico
// Multiplicador 0.9x – 1.4x baseado em sazonalidade, urgência e disponibilidade
// ─────────────────────────────────────────────────────────────────────────────
export type DemandUrgency      = 'normal' | 'expresso' | 'critico'
export type DemandSeason       = 'normal' | 'safra' | 'blackfriday' | 'feriado'
export type DemandAvailability = 'alta' | 'normal' | 'baixa'

export const URGENCY_LABELS: Record<DemandUrgency, string> = {
  normal:   '📦 Normal',
  expresso: '⚡ Expresso',
  critico:  '🚨 Crítico',
}
export const SEASON_LABELS: Record<DemandSeason, string> = {
  normal:     '📅 Normal',
  safra:      '🌾 Safra Piauí',
  blackfriday:'🛍 Black Friday',
  feriado:    '🎉 Feriado',
}
export const AVAILABILITY_LABELS: Record<DemandAvailability, string> = {
  alta:   '✅ Alta Oferta',
  normal: '⚖️ Normal',
  baixa:  '⚠️ Baixa Oferta',
}

export interface DemandFactors {
  urgency:      DemandUrgency
  season:       DemandSeason
  availability: DemandAvailability
}
export const DEFAULT_DEMAND: DemandFactors = {
  urgency: 'normal', season: 'normal', availability: 'normal',
}

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO 2 — Logística Fiscal: Reforma Tributária IBS/CBS 2026
// IBS = Imposto sobre Bens e Serviços (estadual/municipal)
// CBS = Contribuição sobre Bens e Serviços (federal)
// ─────────────────────────────────────────────────────────────────────────────
export type TaxRegime = 'simples' | 'lucro_presumido' | 'lucro_real'

export const TAX_REGIME_LABELS: Record<TaxRegime, string> = {
  simples:          '🟢 Simples Nacional',
  lucro_presumido:  '🟡 Lucro Presumido',
  lucro_real:       '🔴 Lucro Real',
}

export interface TaxReform2026 {
  regime:      TaxRegime
  ibsRate:     number
  cbsRate:     number
  ibsAmt:      number
  cbsAmt:      number
  totalTaxAmt: number
  netAfterTax: number
  destState:   string
}

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO 3 — UX de Retenção: Diário de Bordo Financeiro
// ─────────────────────────────────────────────────────────────────────────────
export interface FreightRecord {
  id:         string
  date:       string          // ISO date string
  from:       string
  to:         string
  distanceKm: number
  gross:      number
  net:        number
  fuel:       number
  profit:     number
  emptyKm:    number          // km rodado vazio (ociosidade)
  category:   FreightCategory
  multiplier: number          // fator de demanda aplicado
}

export interface DiarioBordoStats {
  records:           FreightRecord[]
  totalFreights:     number
  monthlyProfit:     number
  weeklyProfit:      number
  totalKm:           number
  totalEmptyKm:      number
  ociosidadePct:     number   // % km vazio
  maintenanceKmLeft: number   // km até próxima revisão
  maintenanceAlert:  boolean
  avgProfitPerFreight: number
}

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO 4 — Segurança: Check-Muvv (Verificação de Motoristas)
// ─────────────────────────────────────────────────────────────────────────────
export type AnttStatus  = 'valid' | 'expiring_soon' | 'expired'
export type RadarStatus = 'cleared' | 'pending' | 'blocked'
export type SafetyBadge = 'bronze' | 'silver' | 'gold' | 'platinum'

export const SAFETY_BADGE_LABELS: Record<SafetyBadge, string> = {
  bronze:   '🥉 Bronze',
  silver:   '🥈 Prata',
  gold:     '🥇 Gold',
  platinum: '💎 Platinum',
}
export const SAFETY_BADGE_COLORS: Record<SafetyBadge, string> = {
  bronze:   '#CD7F32',
  silver:   '#C0C0C0',
  gold:     '#DAA520',
  platinum: '#57A6C1',
}
export const SAFETY_BADGE_MIN_SCORE: Record<SafetyBadge, number> = {
  bronze: 0, silver: 40, gold: 70, platinum: 90,
}

export interface CheckMuvv {
  driverId:      string
  name:          string
  anttNumber:    string
  anttExpiry:    string      // ISO date
  anttStatus:    AnttStatus
  radarStatus:   RadarStatus // liberação para cargas ZPE/internacionais
  safetyScore:   number      // 0–100 (composto: rating + tempo + ocorrências)
  safetyBadge:   SafetyBadge
  totalFreights: number
  avgRating:     number      // 1–5
  zpeAuthorized: boolean     // RADAR cleared + ANTT valid + score >= 70
  lastVerified:  string      // ISO date
}
