// ─── Icon — SVG path renderer ─────────────────────────────────────────────────

interface IconProps {
  path: string
  size?: number
  color?: string
  strokeWidth?: number
  className?: string
}

export const ICON_PATHS = {
  home:      'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10',
  docs:      'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8',
  wallet:    'M21 4H3a2 2 0 00-2 2v12a2 2 0 002 2h18a2 2 0 002-2V6a2 2 0 00-2-2z M1 10h22',
  user:      'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 3a4 4 0 100 8 4 4 0 000-8z',
  truck:     'M1 3h15v13H1z M16 8h4l3 3v5h-7V8z M5.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5z M18.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  arrow:     'M5 12h14 M12 5l7 7-7 7',
  arrowLeft: 'M19 12H5M12 5l-7 7 7 7',
  check:     'M20 6L9 17l-5-5',
  camera:    'M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z M12 13a3 3 0 100-6 3 3 0 000 6z',
  shield:    'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  star:      'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  map:       'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z M12 7a3 3 0 100 6 3 3 0 000-6z',
  euro:      'M14 2a6 6 0 100 12M4 9h10M4 13h10',
  trending:  'M23 6l-9.5 9.5-5-5L1 18 M17 6h6v6',
  clock:     'M12 2a10 10 0 100 20A10 10 0 0012 2z M12 6v6l4 2',
  plus:      'M12 5v14M5 12h14',
  x:         'M18 6L6 18M6 6l12 12',
  search:    'M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z',
  locate:    'M12 2a7 7 0 017 7c0 5-7 13-7 13S5 14 5 9a7 7 0 017-7z M12 9a2 2 0 100-4 2 2 0 000 4z',
} as const

export type IconName = keyof typeof ICON_PATHS

export function Icon({ path, size = 22, color = 'currentColor', strokeWidth = 1.8, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d={path} />
    </svg>
  )
}
