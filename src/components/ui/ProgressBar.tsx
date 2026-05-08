interface Props {
  value: number
  max: number
  showLabel?: boolean
  size?: 'sm' | 'md'
  color?: string
}

export default function ProgressBar({
  value,
  max,
  showLabel = true,
  size = 'sm',
  color = 'bg-orange-500',
}: Props) {
  const pct = Math.min(Math.round((value / max) * 100), 100)
  const height = size === 'sm' ? 'h-1.5' : 'h-2.5'

  return (
    <div>
      {showLabel && (
        <div className="flex justify-between text-xs text-gray-400 mb-1.5">
          <span className="font-semibold text-gray-600">{pct}%</span>
          <span>meta ${max.toLocaleString('es-CL')}</span>
        </div>
      )}
      <div className={`w-full ${height} bg-gray-100 rounded-full overflow-hidden`}>
        <div
          className={`h-full ${color} rounded-full transition-all duration-1000 ease-out relative overflow-hidden`}
          style={{ width: `${pct}%` }}
        >
          {/* Shimmer effect */}
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_2s_ease-in-out_infinite]" />
        </div>
      </div>
    </div>
  )
}
