// ─── SlideToAccept — Otimizado com pointer events (mouse + touch unificado) ───
import { useState, useRef, useCallback } from 'react'
import { Icon, ICON_PATHS } from '@/components/Icon'

interface Props { onAccept?: () => void }

export function SlideToAccept({ onAccept }: Props) {
  const [pos,      setPos]      = useState(0)
  const [accepted, setAccepted] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)
  const active   = useRef(false)

  const maxTravel = () => (trackRef.current?.offsetWidth ?? 300) - 56

  const move = useCallback((clientX: number) => {
    if (!active.current || !trackRef.current) return
    const rect   = trackRef.current.getBoundingClientRect()
    const newPos = Math.max(0, Math.min(clientX - rect.left - 28, maxTravel()))
    setPos(newPos)
    if (newPos >= maxTravel() - 10) {
      active.current = false
      setAccepted(true)
      onAccept?.()
    }
  }, [onAccept])

  const end = useCallback(() => {
    if (!active.current) return
    active.current = false
    setPos(0)
  }, [])

  // Pointer events unifica mouse e touch
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (accepted) return
    active.current = true
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [accepted])
  const onPointerMove = useCallback((e: React.PointerEvent) => move(e.clientX), [move])
  const onPointerUp   = useCallback(() => end(), [end])

  return (
    <div ref={trackRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      role="button"
      aria-label={accepted ? 'Frete aceito' : 'Deslize para aceitar'}
      className={`relative h-14 rounded-full overflow-hidden select-none touch-none transition-colors duration-300 border-2 border-muvv-accent ${
        accepted ? 'bg-muvv-accent' : 'bg-muvv-accent-light'
      }`}
    >
      <div className={`absolute inset-0 flex items-center justify-center font-bold text-[15px] tracking-wide transition-opacity duration-300 pointer-events-none ${
        accepted ? 'text-white' : 'text-muvv-accent'
      } ${pos > 40 && !accepted ? 'opacity-0' : 'opacity-100'}`}>
        {accepted ? '✓  FRETE ACEITO!' : 'deslize para aceitar →'}
      </div>

      {!accepted && (
        <div className="absolute top-1 w-12 h-12 rounded-full bg-muvv-accent shadow-accent flex items-center justify-center pointer-events-none"
             style={{ left: 4 + pos, transition: active.current ? 'none' : 'left 0.3s ease' }}>
          <Icon path={ICON_PATHS.arrow} size={20} color="white" strokeWidth={2.5} />
        </div>
      )}
    </div>
  )
}
