// ─── Lógica financeira — Muvv Rotas v2.4 (Upgrade 2026) ─────────────────────
//
// Módulos:
//  v2.3  Taxa 12% flat · saída fixa 5km · cubagem 300kg/m³ · estadia · ad valorem
//  v2.4  + Fator de Demanda Dinâmico (0.9x–1.4x)
//        + Reforma Tributária IBS/CBS 2026
//        + Diário de Bordo (stats de performance)
//        + Check-Muvv (score de segurança)

import type {
  FreightCategory, FreightCalc, SimPeriod, SimProjection, MuvvProjection,
  AdditionalServices, CubageData, EstadiaConfig,
  DemandFactors, DemandUrgency, DemandSeason, DemandAvailability,
  TaxReform2026, TaxRegime,
  FreightRecord, DiarioBordoStats,
  CheckMuvv, SafetyBadge, AnttStatus,
} from '@/types'
import { SERVICE_COSTS } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// TAXAS E LABELS
// ─────────────────────────────────────────────────────────────────────────────
export const MUVV_RATES: Record<FreightCategory, number> = {
  light: 0.12, heavy: 0.12, zpe: 0.12,
}
export const CATEGORY_LABELS: Record<FreightCategory, string> = {
  light: 'Carga Ligeira (Carro/Van)',
  heavy: 'Carga Pesada (Caminhão)',
  zpe:   'Carga Fracionada/Consolidada',
}
export const CATEGORY_SHORT: Record<FreightCategory, string> = {
  light: 'Ligeiro', heavy: 'Pesado', zpe: 'Fracionada',
}
export const CATEGORY_ICON: Record<FreightCategory, string> = {
  light: '🚗', heavy: '🚛', zpe: '📦',
}

// ─────────────────────────────────────────────────────────────────────────────
// TARIFA BASE POR KM (saída fixa primeiros 5km)
// ─────────────────────────────────────────────────────────────────────────────
export const BASE_FIXED: Record<FreightCategory, number> = {
  light: 50, heavy: 150, zpe: 150,
}
export const KM_THRESHOLD = 5
export const RATE_PER_KM_EXTRA: Record<FreightCategory, number> = {
  light: 3.50, heavy: 5.50, zpe: 2.80,
}

export function calcFreightFromKm(distanceKm: number, category: FreightCategory): number {
  if (distanceKm <= 0) return 0
  const fixed = BASE_FIXED[category]
  if (distanceKm <= KM_THRESHOLD) return fixed
  return Math.round(fixed + (distanceKm - KM_THRESHOLD) * RATE_PER_KM_EXTRA[category])
}

// ─────────────────────────────────────────────────────────────────────────────
// CUBAGEM
// ─────────────────────────────────────────────────────────────────────────────
export const CUBAGE_FACTOR  = 300
export const WEIGHT_RATE    = 0.40
export const AD_VALOREM_PCT = 0.005

export interface CubageResult {
  cubedVolume: number; cubedWeight: number
  billingWeight: number; usingCubed: boolean
}

export function calcCubage(data: CubageData): CubageResult {
  const { length, width, height, realWeight } = data
  const cubedVolume   = length * width * height
  const cubedWeight   = cubedVolume * CUBAGE_FACTOR
  const billingWeight = Math.max(realWeight, cubedWeight)
  return {
    cubedVolume,
    cubedWeight:   parseFloat(cubedWeight.toFixed(2)),
    billingWeight: parseFloat(billingWeight.toFixed(2)),
    usingCubed:    cubedWeight > realWeight,
  }
}
export function isCubageReady(data: CubageData): boolean {
  return data.length > 0 && data.width > 0 && data.height > 0 && data.realWeight > 0
}
export function calcFreightFromCubage(data: CubageData, distanceKm: number): number {
  const { billingWeight } = calcCubage(data)
  return Math.round(calcFreightFromKm(distanceKm, 'zpe') + billingWeight * WEIGHT_RATE)
}

// ─────────────────────────────────────────────────────────────────────────────
// ESTADIA
// ─────────────────────────────────────────────────────────────────────────────
export const ESTADIA_RATE: Record<FreightCategory, number> = {
  light: 40, heavy: 85, zpe: 85,
}
export function calcEstadia(config: EstadiaConfig, category: FreightCategory): number {
  const exceeded = Math.max(0, config.waitMinutes - config.franchiseMinutes)
  return parseFloat(((exceeded / 60) * ESTADIA_RATE[category]).toFixed(2))
}

// ─────────────────────────────────────────────────────────────────────────────
// CÁLCULO PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export function calcServicesTotal(services?: AdditionalServices): number {
  if (!services) return 0
  const keys = Object.keys(services) as (keyof AdditionalServices)[]
  return keys
    .filter(k => services[k])
    .reduce((sum: number, k: keyof AdditionalServices) => sum + SERVICE_COSTS[k], 0)
}

export function calcNet(
  gross: number, category: FreightCategory,
  services?: AdditionalServices, cubage?: CubageData,
  estadia?: { config: EstadiaConfig },
): FreightCalc {
  const rate      = MUVV_RATES[category]
  const fee       = parseFloat((gross * rate).toFixed(2))
  const svcAmt    = calcServicesTotal(services)
  const adValorem = category === 'zpe' && cubage
    ? parseFloat((cubage.cargoValue * AD_VALOREM_PCT).toFixed(2)) : 0
  const estadiaAmt = estadia ? calcEstadia(estadia.config, category) : 0
  const net = parseFloat((gross - fee + svcAmt + adValorem + estadiaAmt).toFixed(2))
  return { gross, fee, services: svcAmt, adValorem, estadia: estadiaAmt, net, rate }
}

// ─────────────────────────────────────────────────────────────────────────────
// CÂMBIO E FORMATAÇÃO
// ─────────────────────────────────────────────────────────────────────────────
export const EUR_BRL_RATE = 5.5
export function brlToEur(brl: number): number {
  return parseFloat((brl / EUR_BRL_RATE).toFixed(2))
}
export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
export function formatEUR(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO 1 — FATOR DE DEMANDA DINÂMICO
// Multiplicador 0.9x – 1.4x (sazonalidade + urgência + disponibilidade)
// ─────────────────────────────────────────────────────────────────────────────

// Variações por urgência: Normal 0% | Expresso +15% | Crítico +35%
const URGENCY_DELTA: Record<DemandUrgency, number> = {
  normal: 0.00, expresso: 0.15, critico: 0.35,
}
// Variações por sazonalidade: Normal 0% | Safra Piauí +20% | Black Friday +15% | Feriado +10%
const SEASON_DELTA: Record<DemandSeason, number> = {
  normal: 0.00, safra: 0.20, blackfriday: 0.15, feriado: 0.10,
}
// Variações por disponibilidade: Alta -10% (concorrência) | Normal 0% | Baixa +20%
const AVAILABILITY_DELTA: Record<DemandAvailability, number> = {
  alta: -0.10, normal: 0.00, baixa: 0.20,
}

/**
 * Calcula o multiplicador dinâmico de demanda.
 * Clampado entre 0.9x (mínimo) e 1.4x (máximo).
 */
export function calcDynamicMultiplier(factors: DemandFactors): number {
  const raw = 1.0
    + URGENCY_DELTA[factors.urgency]
    + SEASON_DELTA[factors.season]
    + AVAILABILITY_DELTA[factors.availability]
  return parseFloat(Math.min(1.4, Math.max(0.9, raw)).toFixed(2))
}

/**
 * Aplica o fator de demanda ao frete base.
 * Retorna o frete ajustado (arredondado).
 */
export function applyDynamicMultiplier(baseFreight: number, factors: DemandFactors): number {
  return Math.round(baseFreight * calcDynamicMultiplier(factors))
}

/**
 * Describe o multiplicador em texto amigável.
 * Ex: "+20% safra + 15% expresso = 1.35×"
 */
export function describeDemandFactors(factors: DemandFactors): {
  label: string; color: string; delta: number
} {
  const multiplier = calcDynamicMultiplier(factors)
  const delta = parseFloat(((multiplier - 1) * 100).toFixed(0))
  const label = multiplier > 1.1
    ? `Alta demanda +${delta}%`
    : multiplier < 0.99
    ? `Baixa demanda ${delta}%`
    : 'Demanda normal'
  const color = multiplier > 1.2 ? '#E57373' : multiplier > 1.0 ? '#DAA520' : '#57A6C1'
  return { label, color, delta }
}

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO 2 — REFORMA TRIBUTÁRIA IBS/CBS 2026
// IBS: Imposto sobre Bens e Serviços (estadual + municipal)
// CBS: Contribuição sobre Bens e Serviços (federal substitui PIS/COFINS)
//
// Nota: durante período de transição 2026–2032:
//   Simples Nacional: isenção/alíquota zero (optantes mantêm Simples)
//   Lucro Presumido:  alíquotas parciais crescentes
//   Lucro Real:       alíquotas plenas desde 2026
// ─────────────────────────────────────────────────────────────────────────────

// Alíquotas IBS por UF (estimativa 2026 — variam por estado)
const IBS_RATE_BY_STATE: Record<string, number> = {
  PI: 0.0620, CE: 0.0650, MA: 0.0600, PA: 0.0630,
  BA: 0.0680, PE: 0.0670, RN: 0.0640, PB: 0.0635,
  SE: 0.0625, AL: 0.0615,
  SP: 0.0750, RJ: 0.0720, MG: 0.0710, RS: 0.0690,
  SC: 0.0680, PR: 0.0695, GO: 0.0660, MT: 0.0650,
  MS: 0.0645, DF: 0.0700,
  default: 0.0650,
}

// CBS federal (estimativa 2026 — substitui PIS 0.65% + COFINS 3%)
const CBS_RATES: Record<TaxRegime, number> = {
  simples:         0.000,   // optante do Simples: isento CBS separado
  lucro_presumido: 0.035,   // transição parcial 2026
  lucro_real:      0.088,   // alíquota plena (PIS+COFINS unificados)
}
// IBS: Simples = 0 (incluso no DAS), demais: alíquota estadual
const IBS_REGIME_FACTOR: Record<TaxRegime, number> = {
  simples: 0.0, lucro_presumido: 0.5, lucro_real: 1.0,
}

export function calcTaxReform2026(
  gross: number,
  destState: string,
  regime: TaxRegime = 'simples',
): TaxReform2026 {
  const baseIbsRate = IBS_RATE_BY_STATE[destState.toUpperCase()] ?? IBS_RATE_BY_STATE['default']
  const ibsRate     = baseIbsRate * IBS_REGIME_FACTOR[regime]
  const cbsRate     = CBS_RATES[regime]

  const ibsAmt      = parseFloat((gross * ibsRate).toFixed(2))
  const cbsAmt      = parseFloat((gross * cbsRate).toFixed(2))
  const totalTaxAmt = parseFloat((ibsAmt + cbsAmt).toFixed(2))
  const netAfterTax = parseFloat((gross - totalTaxAmt).toFixed(2))

  return { regime, ibsRate, cbsRate, ibsAmt, cbsAmt, totalTaxAmt, netAfterTax, destState }
}

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO 3 — DIÁRIO DE BORDO FINANCEIRO
// ─────────────────────────────────────────────────────────────────────────────
const MAINTENANCE_KM_THRESHOLD = 10_000 // km para alertar revisão
const MAINTENANCE_ALERT_KM     = 1_000  // alerta quando faltam X km

export function calcDiarioBordoStats(records: FreightRecord[]): DiarioBordoStats {
  if (records.length === 0) {
    return {
      records: [], totalFreights: 0, monthlyProfit: 0, weeklyProfit: 0,
      totalKm: 0, totalEmptyKm: 0, ociosidadePct: 0,
      maintenanceKmLeft: MAINTENANCE_KM_THRESHOLD, maintenanceAlert: false,
      avgProfitPerFreight: 0,
    }
  }

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfWeek  = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  const monthRecords = records.filter(r => new Date(r.date) >= startOfMonth)
  const weekRecords  = records.filter(r => new Date(r.date) >= startOfWeek)

  const monthlyProfit = parseFloat(monthRecords.reduce((s, r) => s + r.profit, 0).toFixed(2))
  const weeklyProfit  = parseFloat(weekRecords.reduce((s, r) => s + r.profit, 0).toFixed(2))
  const totalKm       = parseFloat(records.reduce((s, r) => s + r.distanceKm, 0).toFixed(1))
  const totalEmptyKm  = parseFloat(records.reduce((s, r) => s + r.emptyKm, 0).toFixed(1))
  const ociosidadePct = totalKm + totalEmptyKm > 0
    ? parseFloat(((totalEmptyKm / (totalKm + totalEmptyKm)) * 100).toFixed(1))
    : 0

  const maintenanceKmLeft = Math.max(0, MAINTENANCE_KM_THRESHOLD - totalKm)
  const maintenanceAlert  = maintenanceKmLeft < MAINTENANCE_ALERT_KM

  const totalProfit = records.reduce((s, r) => s + r.profit, 0)
  const avgProfitPerFreight = parseFloat((totalProfit / records.length).toFixed(2))

  return {
    records, totalFreights: records.length,
    monthlyProfit, weeklyProfit,
    totalKm, totalEmptyKm, ociosidadePct,
    maintenanceKmLeft, maintenanceAlert,
    avgProfitPerFreight,
  }
}

/**
 * Cria um registro de frete no Diário de Bordo a partir dos dados do frete aceito.
 */
export function createFreightRecord(
  freight: { from: string; to: string; distanceKm: number; value: number; category: FreightCategory },
  net: number,
  fuelCostPerKm: number,
  emptyKm: number,
  multiplier: number,
): FreightRecord {
  const fuel   = parseFloat((fuelCostPerKm * freight.distanceKm).toFixed(2))
  const profit = parseFloat((net - fuel).toFixed(2))
  return {
    id:         `fr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    date:       new Date().toISOString(),
    from:       freight.from,
    to:         freight.to,
    distanceKm: freight.distanceKm,
    gross:      freight.value,
    net, fuel, profit, emptyKm,
    category:   freight.category,
    multiplier,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO 4 — CHECK-MUVV (Score de Segurança)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula o badge de segurança baseado no score composto.
 * Bronze < 40 | Silver 40–69 | Gold 70–89 | Platinum 90+
 */
export function calcSafetyBadge(score: number): SafetyBadge {
  if (score >= 90) return 'platinum'
  if (score >= 70) return 'gold'
  if (score >= 40) return 'silver'
  return 'bronze'
}

/**
 * Calcula o score composto de segurança (0–100).
 * Pesos: 40% avaliação | 35% tempo na plataforma | 25% histórico
 */
export function calcSafetyScore(
  avgRating:     number,  // 1–5
  totalFreights: number,
  incidents:     number,  // ocorrências registradas
): number {
  const ratingScore    = ((avgRating - 1) / 4) * 100 * 0.40
  const experienceScore = Math.min(100, (totalFreights / 200) * 100) * 0.35
  const incidentPenalty = Math.min(25, incidents * 8)
  const historyScore   = (100 - incidentPenalty) * 0.25
  return parseFloat(Math.min(100, Math.max(0, ratingScore + experienceScore + historyScore)).toFixed(1))
}

/**
 * Verifica status ANTT baseado na data de vencimento.
 */
export function calcAnttStatus(expiryDateISO: string): AnttStatus {
  const expiry = new Date(expiryDateISO)
  const now    = new Date()
  const daysLeft = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  if (daysLeft < 0) return 'expired'
  if (daysLeft <= 60) return 'expiring_soon'
  return 'valid'
}

/**
 * Cria ou atualiza um perfil Check-Muvv completo.
 */
export function buildCheckMuvv(params: {
  driverId: string; name: string; anttNumber: string; anttExpiry: string
  radarStatus: CheckMuvv['radarStatus']
  avgRating: number; totalFreights: number; incidents?: number
}): CheckMuvv {
  const { driverId, name, anttNumber, anttExpiry, radarStatus, avgRating, totalFreights, incidents = 0 } = params
  const anttStatus  = calcAnttStatus(anttExpiry)
  const safetyScore = calcSafetyScore(avgRating, totalFreights, incidents)
  const safetyBadge = calcSafetyBadge(safetyScore)
  const zpeAuthorized = radarStatus === 'cleared' && anttStatus === 'valid' && safetyScore >= 70

  return {
    driverId, name, anttNumber, anttExpiry,
    anttStatus, radarStatus,
    safetyScore, safetyBadge,
    totalFreights, avgRating,
    zpeAuthorized,
    lastVerified: new Date().toISOString(),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMULAÇÕES (mantidas da v2.3)
// ─────────────────────────────────────────────────────────────────────────────
function periodMultiplier(period: SimPeriod): number {
  const map: Record<SimPeriod, number> = { daily: 1, weekly: 7, monthly: 30, yearly: 365 }
  return map[period]
}

export function calcSimProjection(
  grossPerFreight: number, freightsPerDay: number,
  fuelCostPerKm: number, avgKmPerFreight: number,
  category: FreightCategory, period: SimPeriod,
): SimProjection {
  const days = periodMultiplier(period)
  const deliveries = freightsPerDay * days
  const revenue    = grossPerFreight * deliveries
  const fees       = revenue * MUVV_RATES[category]
  const net        = revenue - fees
  const fuel       = fuelCostPerKm * avgKmPerFreight * deliveries
  const profit     = net - fuel
  return { period, deliveries, revenue, fees, net, fuel, profit }
}

export function calcMuvvProjection(
  lightPerDay: number, lightAvgGross: number,
  heavyPerDay: number, heavyAvgGross: number,
  zpePerDay: number,   zpeAvgGross: number,
  servicesPerFreight: number, period: SimPeriod,
): MuvvProjection {
  const days         = periodMultiplier(period)
  const lightRevenue = lightPerDay * lightAvgGross * days
  const heavyRevenue = heavyPerDay * heavyAvgGross * days
  const zpeRevenue   = zpePerDay   * zpeAvgGross   * days
  const totalFreights = (lightPerDay + heavyPerDay + zpePerDay) * days
  const lightFees  = lightRevenue * MUVV_RATES.light
  const heavyFees  = heavyRevenue * MUVV_RATES.heavy
  const zpeFees    = zpeRevenue   * MUVV_RATES.zpe
  const serviceFees = totalFreights * servicesPerFreight
  return {
    period,
    totalRevenue:  lightRevenue + heavyRevenue + zpeRevenue,
    lightFees, heavyFees, zpeFees, serviceFees,
    totalPlatform: lightFees + heavyFees + zpeFees + serviceFees,
  }
}
