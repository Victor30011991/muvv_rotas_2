import { useState, useEffect } from 'react'

interface AnimCounterProps {
  value:     number
  prefix?:   string
  suffix?:   string
  decimals?: number
}

export function AnimCounter({ value, prefix = '', suffix = '', decimals = 2 }: AnimCounterProps) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let current = 0
    const duration  = 1200
    const stepMs    = 16
    const increment = value / (duration / stepMs)
    const timer = setInterval(() => {
      current += increment
      if (current >= value) { setDisplay(value); clearInterval(timer) }
      else setDisplay(current)
    }, stepMs)
    return () => clearInterval(timer)
  }, [value])
  return <span>{prefix}{display.toFixed(decimals)}{suffix}</span>
}
