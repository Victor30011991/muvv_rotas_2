interface WeeklyChartProps { data: { value: number }[] }
const TODAY_INDEX = 4
const DAY_LABELS  = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

export function WeeklyChart({ data }: WeeklyChartProps) {
  const maxValue = Math.max(...data.map(d => d.value))
  return (
    <div className="flex items-end gap-2 h-24 px-1">
      {data.map((d, i) => {
        const heightPct = maxValue > 0 ? (d.value / maxValue) * 80 : 0
        const isToday   = i === TODAY_INDEX
        return (
          <div key={i} className="flex flex-col items-center gap-1 flex-1">
            <div className={`w-full rounded-t-md transition-all duration-500 ${isToday ? 'bg-gradient-bar-active shadow-accent' : 'bg-muvv-mid-light'}`}
                 style={{ height: heightPct, transitionDelay: `${i * 80}ms` }} />
            <span className={`text-[9px] font-semibold ${isToday ? 'text-muvv-accent' : 'text-muvv-muted'}`}>{DAY_LABELS[i]}</span>
          </div>
        )
      })}
    </div>
  )
}
