// ─── AddressAutocomplete — FIXED v2.4 ────────────────────────────────────────
//
// CORREÇÃO CRÍTICA v2.3 — "Clique no endereço não preenche o campo":
//
//   CAUSA RAIZ: O dropdown usa position:fixed e fica FORA do containerRef
//   no DOM. O listener document.mousedown verificava:
//     containerRef.contains(target) → FALSE → setOpen(false)
//   O portal era desmontado ANTES do evento 'click' disparar no botão.
//   Resultado: handleSelect nunca executava, campo nunca era preenchido.
//
//   SOLUÇÃO (2 camadas de defesa):
//   1. portalRef: ref adicionado ao div do portal. O listener agora exclui
//      cliques dentro do containerRef E dentro do portalRef.
//   2. onMouseDown + e.preventDefault() nos botões: dispara ANTES do blur
//      do input, garantindo execução antes de qualquer desmontagem.
//
// CORREÇÃO BUG DESKTOP v2.4 — "Lista de sugestões não aparece no desktop":
//
//   CAUSA RAIZ: O componente pai (AddressPanel) usa a classe `glass` que
//   aplica `backdrop-filter: blur(16px)`. Em navegadores modernos (Chrome,
//   Edge), backdrop-filter cria um "containing block" para elementos
//   position:fixed descendentes. O dropdown (position:fixed) passa a ser
//   posicionado relativamente ao container glass — que está dentro da
//   sidebar com overflow-y:auto — e fica cortado/invisível.
//   No mobile funciona porque a cadeia de containers não tem overflow:hidden
//   ou overflow-y:auto acima do glass container.
//
//   SOLUÇÃO: ReactDOM.createPortal renderiza o dropdown diretamente em
//   document.body, saindo completamente de qualquer cadeia de containing
//   blocks, overflow e stacking contexts dos containers pai.
//   Nenhuma lógica, fórmula ou layout foi alterado.
//
import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { NominatimResult, RouteWaypoint } from '@/types'
import { Icon, ICON_PATHS } from '@/components/Icon'

interface Props {
  placeholder:       string
  pinColor:          string
  pinLabel:          string
  onSelect:          (wp: RouteWaypoint) => void
  onClear?:          () => void
  confirmedAddress?: string
}

const queryCache = new Map<string, NominatimResult[]>()

function formatAddress(r: NominatimResult): string {
  const { road, suburb, city, town, village, state } = r.address
  const street = road ?? suburb ?? ''
  const locale = city ?? town ?? village ?? ''
  const parts  = [street, locale, state].filter(Boolean)
  return parts.length > 0
    ? parts.join(', ')
    : r.display_name.split(',').slice(0, 3).join(',').trim()
}

async function nominatimSearch(q: string): Promise<NominatimResult[]> {
  const key = q.trim().toLowerCase()
  if (queryCache.has(key)) return queryCache.get(key)!
  const params = new URLSearchParams({
    q,
    format:           'json',
    addressdetails:   '1',
    countrycodes:     'br',
    limit:            '7',
    'accept-language':'pt-BR',
  })
  try {
    const res     = await fetch(`https://nominatim.openstreetmap.org/search?${params}`)
    const results = (await res.json()) as NominatimResult[]
    queryCache.set(key, results)
    return results
  } catch {
    return []
  }
}

export function AddressAutocomplete({
  placeholder, pinColor, pinLabel, onSelect, onClear, confirmedAddress,
}: Props) {
  const [query,     setQuery]     = useState(confirmedAddress ?? '')
  const [suggs,     setSuggs]     = useState<NominatimResult[]>([])
  const [loading,   setLoading]   = useState(false)
  const [open,      setOpen]      = useState(false)
  const [confirmed, setConfirmed] = useState(!!confirmedAddress)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [dropRect,  setDropRect]  = useState<{ top: number; left: number; width: number } | null>(null)

  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef     = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const portalRef    = useRef<HTMLDivElement>(null)  // FIX v2.3

  const updateDropPos = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setDropRect({ top: r.bottom + 6, left: r.left, width: r.width })
  }, [])

  // FIX v2.3: exclui cliques no portal do gatilho de fechar
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target       = e.target as Node
      const insideInput  = containerRef.current?.contains(target) ?? false
      const insidePortal = portalRef.current?.contains(target)    ?? false
      if (!insideInput && !insidePortal) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!open) return
    const h = () => updateDropPos()
    window.addEventListener('scroll', h, true)
    window.addEventListener('resize', h)
    return () => {
      window.removeEventListener('scroll', h, true)
      window.removeEventListener('resize', h)
    }
  }, [open, updateDropPos])

  useEffect(() => {
    if (!confirmedAddress) { setQuery(''); setConfirmed(false) }
  }, [confirmedAddress])

  const runSearch = useCallback(async (val: string) => {
    if (val.trim().length < 3) { setSuggs([]); setOpen(false); return }
    setLoading(true)
    const results = await nominatimSearch(val)
    setSuggs(results)
    if (results.length > 0) { updateDropPos(); setOpen(true) }
    else setOpen(false)
    setActiveIdx(-1)
    setLoading(false)
  }, [updateDropPos])

  const handleInput = useCallback((val: string) => {
    setQuery(val)
    setConfirmed(false)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch(val), 400)
  }, [runSearch])

  // FIX v2.3: preenche campo, fecha dropdown, dispara onSelect com objeto completo
  const handleSelect = useCallback((r: NominatimResult) => {
    const address = formatAddress(r)
    setQuery(address)
    setConfirmed(true)
    setOpen(false)
    setSuggs([])
    setDropRect(null)
    onSelect({
      id:      `wp-${r.place_id}`,
      lat:     parseFloat(r.lat),
      lng:     parseFloat(r.lon),
      label:   pinLabel,
      address,
    })
  }, [pinLabel, onSelect])

  const handleClear = useCallback(() => {
    setQuery('')
    setConfirmed(false)
    setSuggs([])
    setOpen(false)
    setDropRect(null)
    onClear?.()
    inputRef.current?.focus()
  }, [onClear])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!open || !suggs.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i: number) => Math.min(i + 1, suggs.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i: number) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      handleSelect(suggs[activeIdx])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }, [open, suggs, activeIdx, handleSelect])

  const isFocused = open || (!confirmed && query.length > 0)

  // ── Conteúdo do dropdown (reutilizado no portal) ───────────────────────────
  const dropdownContent = (
    <div
      ref={portalRef}
      role="listbox"
      style={{
        position: 'fixed',
        top:      dropRect?.top ?? 0,
        left:     dropRect?.left ?? 0,
        width:    Math.max(dropRect?.width ?? 0, 280),
        zIndex:   99999,
      }}
      className="bg-white rounded-2xl shadow-freight border border-muvv-border overflow-hidden animate-fade-in"
    >
      {suggs.length > 0
        ? suggs.map((s, i) => {
            const addr = formatAddress(s)
            const sub  = [
              s.address.city ?? s.address.town ?? s.address.village,
              s.address.state,
            ].filter(Boolean).join(' · ')
            return (
              <button
                key={s.place_id}
                role="option"
                aria-selected={i === activeIdx}
                // FIX v2.3: onMouseDown + preventDefault = dispara ANTES
                // do blur fechar o portal. onClick chegaria tarde.
                onMouseDown={e => {
                  e.preventDefault()
                  handleSelect(s)
                }}
                className={[
                  'w-full flex items-start gap-3 px-4 py-3',
                  'text-left cursor-pointer border-none transition-colors',
                  i < suggs.length - 1 ? 'border-b border-muvv-border' : '',
                  i === activeIdx ? 'bg-muvv-accent-light' : 'bg-white hover:bg-muvv-primary',
                ].join(' ')}
              >
                <div className="w-8 h-8 rounded-xl bg-muvv-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon path={ICON_PATHS.locate} size={14} color="#57A6C1" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-muvv-dark text-sm font-semibold leading-snug">{addr}</p>
                  {sub && <p className="text-muvv-muted text-[11px] mt-0.5">{sub}</p>}
                </div>
              </button>
            )
          })
        : !loading && query.length >= 3 && (
            <div className="px-4 py-3 text-muvv-muted text-sm text-center">
              Nenhum endereço encontrado
            </div>
          )
      }
    </div>
  )

  return (
    <>
      {/* ── Campo de entrada ──────────────────────────────────────────── */}
      <div ref={containerRef} className="relative w-full">
        <div className={[
          'flex items-center gap-2.5 bg-white rounded-2xl px-3 py-2.5',
          'border-2 transition-all duration-200',
          isFocused   ? 'border-muvv-accent shadow-accent'
          : confirmed ? 'border-muvv-accent/30 shadow-card-sm'
          :             'border-muvv-border shadow-card-sm',
        ].join(' ')}>

          <div className="flex-shrink-0 w-3 h-3 rounded-full" style={{ background: pinColor }} />

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => handleInput(e.target.value)}
            onFocus={() => {
              if (suggs.length > 0) { updateDropPos(); setOpen(true) }
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={open}
            className="flex-1 bg-transparent outline-none text-muvv-dark text-sm font-medium placeholder:text-muvv-muted min-w-0"
          />

          {loading && (
            <div className="w-4 h-4 border-2 border-muvv-accent/20 border-t-muvv-accent rounded-full animate-spin flex-shrink-0" />
          )}

          {query.length > 0 && !loading && (
            <button
              onMouseDown={e => { e.preventDefault(); handleClear() }}
              className="w-6 h-6 rounded-full bg-muvv-border/60 flex items-center justify-center flex-shrink-0 cursor-pointer border-none hover:bg-muvv-mid-light transition-colors"
            >
              <Icon path={ICON_PATHS.x} size={10} color="#8AAEBB" strokeWidth={2.5} />
            </button>
          )}

          {confirmed && !loading && (
            <div className="w-5 h-5 rounded-full bg-muvv-accent flex items-center justify-center flex-shrink-0">
              <Icon path={ICON_PATHS.check} size={10} color="white" strokeWidth={3} />
            </div>
          )}
        </div>
      </div>

      {/* ── Dropdown via createPortal → renderizado em document.body ──────
          FIX v2.4: createPortal elimina o problema de backdrop-filter
          criando containing block para position:fixed no desktop.
          O dropdown escapa de toda hierarquia de overflow e stacking
          contexts dos containers pai, aparecendo corretamente sobre
          qualquer elemento em mobile E desktop.                        */}
      {open && dropRect && createPortal(dropdownContent, document.body)}
    </>
  )
}