// ─── RouteMap v2.3 — Race condition fix: mapReady state re-triggers waypoints ──
//
// BUG CORRIGIDO: mapRef.current era null quando o efeito de waypoints rodava
// (init do Leaflet é assíncrona). O efeito bailava em L95, o mapa inicializava
// depois mas waypoints não tinham mudado → fitBounds nunca chamado.
//
// FIX: state `mapReady` é setado quando Leaflet termina a init.
// O efeito de waypoints depende de [waypoints, mapReady] → re-executa quando
// o mapa fica disponível, garantindo que fitBounds + polyline rodem.

import { useEffect, useRef, useState } from 'react'
import type { RouteWaypoint } from '@/types'

interface RouteMapProps {
  waypoints:           RouteWaypoint[]
  height?:             number
  fullHeight?:         boolean
  onRouteCalculated?:  (distanceKm: number, durationMin: number) => void
}

let leafletModule: typeof import('leaflet') | null = null
async function getLeaflet() {
  if (!leafletModule) leafletModule = await import('leaflet')
  return leafletModule
}

interface OsrmRoute {
  distance: number
  duration: number
  geometry: { coordinates: Array<[number, number]> }
}

async function fetchOsrmRoute(wps: RouteWaypoint[]): Promise<OsrmRoute | null> {
  const coords = wps.map(w => `${w.lng},${w.lat}`).join(';')
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`
  try {
    const res  = await fetch(url, { signal: AbortSignal.timeout(10000) })
    const data = await res.json() as { routes?: OsrmRoute[] }
    return data.routes?.[0] ?? null
  } catch {
    return null
  }
}

function fmtDuration(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h ${m}min` : `${m} min`
}
function fmtDist(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`
}

const PIN_COLORS = ['#1CC8C8','#57A6C1','#DAA520','#3D6B7D','#E57373','#81C784']

export function RouteMap({
  waypoints, height = 300, fullHeight = false, onRouteCalculated,
}: RouteMapProps) {
  const divRef    = useRef<HTMLDivElement>(null)
  const mapRef    = useRef<import('leaflet').Map | null>(null)
  const layersRef = useRef<import('leaflet').Layer[]>([])

  // FIX: mapReady state — quando true, o efeito de waypoints re-executa
  const [mapReady, setMapReady] = useState(false)
  const [info,     setInfo]     = useState<{ dist: string; time: string } | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [errMsg,   setErrMsg]   = useState('')

  // ── Inicializa mapa (uma vez) ────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true
    if (!divRef.current || mapRef.current) return

    getLeaflet().then(L => {
      if (!mounted || !divRef.current || mapRef.current) return

      type Proto = { _getIconUrl?: unknown }
      delete (L.Icon.Default.prototype as Proto)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(divRef.current!, {
        center: [-10, -48], zoom: 4,
        zoomControl: false, attributionControl: false,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map)
      L.control.zoom({ position: 'bottomright' }).addTo(map)
      L.control.attribution({ position: 'bottomleft', prefix: false })
        .addAttribution('© <a href="https://osm.org/copyright" target="_blank">OSM</a>')
        .addTo(map)

      mapRef.current = map
      // FIX: sinaliza que o mapa está pronto → dispara o efeito de waypoints
      setMapReady(true)
    })

    return () => {
      mounted = false
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
      setMapReady(false)
    }
  }, [])

  // ── Atualiza camadas quando waypoints mudam (ou quando mapa fica pronto) ─────
  // FIX: depende de [waypoints, mapReady, onRouteCalculated]
  // Antes: dependia só de [waypoints] → o mapa ainda não existia na 1ª execução
  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    let cancelled = false

    getLeaflet().then(async L => {
      const map = mapRef.current
      if (!map || cancelled) return

      // Limpa camadas anteriores
      layersRef.current.forEach(l => l.remove())
      layersRef.current = []
      setInfo(null)
      setErrMsg('')

      if (waypoints.length === 0) {
        map.setView([-10, -48], 4)
        return
      }

      // Marcadores
      waypoints.forEach((wp, i) => {
        const color  = PIN_COLORS[i % PIN_COLORS.length]
        const isLast = i === waypoints.length - 1
        const icon   = L.divIcon({
          className: '',
          html: `<div style="width:34px;height:40px">
            <div style="
              width:34px;height:34px;border-radius:50% 50% 50% 0;
              background:${color};border:3px solid white;
              box-shadow:0 3px 12px rgba(0,0,0,0.25);transform:rotate(-45deg);
              display:flex;align-items:center;justify-content:center">
              <span style="transform:rotate(45deg);color:white;font-size:${isLast?'11px':'13px'};
                font-weight:800;font-family:Rubik,sans-serif">
                ${isLast ? '🏁' : i + 1}
              </span>
            </div>
          </div>`,
          iconSize: [34, 40], iconAnchor: [17, 40], popupAnchor: [0, -42],
        })
        const m = L.marker([wp.lat, wp.lng], { icon })
          .bindPopup(`<div style="font-family:Rubik,sans-serif;min-width:160px">
            <div style="font-size:10px;font-weight:700;color:#8AAEBB;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">${wp.label}</div>
            <div style="font-size:13px;font-weight:600;color:#1A2B35;line-height:1.4">${wp.address}</div>
          </div>`, { maxWidth: 240 })
          .addTo(map)
        layersRef.current.push(m)
      })

      // Ajusta bounds inicialmente com os marcadores
      const bounds = L.latLngBounds(waypoints.map(w => [w.lat, w.lng] as [number, number]))
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14, animate: true })

      if (waypoints.length >= 2) {
        setLoading(true)
        const route = await fetchOsrmRoute(waypoints)
        if (cancelled) return
        setLoading(false)

        if (route) {
          const latlngs = route.geometry.coordinates.map(
            ([lng, lat]) => [lat, lng] as [number, number]
          )
          layersRef.current.push(
            L.polyline(latlngs, { color: '#1A2B35', weight: 8, opacity: 0.07 }).addTo(map),
            L.polyline(latlngs, { color: '#1CC8C8', weight: 4.5, opacity: 0.9 }).addTo(map),
          )
          const distKm = route.distance / 1000
          const durMin = route.duration / 60
          setInfo({ dist: fmtDist(route.distance), time: fmtDuration(route.duration) })
          onRouteCalculated?.(distKm, durMin)
          // Ajusta bounds para a polyline real (mais preciso que os pins)
          map.fitBounds(L.latLngBounds(latlngs), { padding: [60, 60], maxZoom: 14, animate: true })
        } else {
          const line = L.polyline(
            waypoints.map(w => [w.lat, w.lng] as [number, number]),
            { color: '#57A6C1', weight: 2, opacity: 0.55, dashArray: '8 6' }
          ).addTo(map)
          layersRef.current.push(line)
          setErrMsg('Rota aproximada — OSRM indisponível')
        }
      }
    })

    return () => { cancelled = true }
  }, [waypoints, mapReady, onRouteCalculated])

  const style = fullHeight ? { height: '100%' } : { height }

  return (
    <div className="relative w-full rounded-[18px] overflow-hidden border border-muvv-border" style={style}>
      <div ref={divRef} className="w-full h-full" />

      {info && !loading && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-[400]
          glass rounded-full px-5 py-2 shadow-freight flex items-center gap-3 whitespace-nowrap animate-fade-in">
          <span className="text-muvv-accent font-bold text-sm">📍 {info.dist}</span>
          <div className="w-px h-4 bg-muvv-border" />
          <span className="text-muvv-dark font-semibold text-sm">⏱ {info.time}</span>
        </div>
      )}

      {loading && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-[400]
          glass rounded-full px-5 py-2 shadow-card flex items-center gap-2 whitespace-nowrap">
          <div className="w-4 h-4 border-2 border-muvv-accent/30 border-t-muvv-accent rounded-full animate-spin" />
          <span className="text-muvv-muted text-sm">Calculando rota real...</span>
        </div>
      )}

      {errMsg && !loading && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-[400]
          bg-orange-50 border border-orange-200 rounded-full px-5 py-2
          text-orange-500 text-xs whitespace-nowrap shadow-card">⚠ {errMsg}</div>
      )}

      {waypoints.length === 0 && (
        <div className="absolute inset-0 flex items-end justify-center pb-14 pointer-events-none z-[300]">
          <div className="glass rounded-full px-5 py-2.5 border border-muvv-border text-muvv-muted text-sm">
            🗺 Digite os endereços para traçar a rota
          </div>
        </div>
      )}
    </div>
  )
}
