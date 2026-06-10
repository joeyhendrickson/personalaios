'use client'

type VoiceWaveformProps = {
  levels: number[]
  active?: boolean
  variant?: 'listening' | 'speaking' | 'processing' | 'idle'
}

export function VoiceWaveform({
  levels,
  active = true,
  variant = 'listening',
}: VoiceWaveformProps) {
  const barColor =
    variant === 'speaking'
      ? 'bg-amber-500'
      : variant === 'processing'
        ? 'bg-violet-400'
        : 'bg-red-500'

  return (
    <div className="flex h-8 shrink-0 items-end gap-[3px]" aria-hidden>
      {levels.map((level, i) => (
        <span
          key={i}
          className={`w-[3px] rounded-full transition-[height] duration-75 ${barColor} ${
            active ? 'opacity-90' : 'opacity-40'
          }`}
          style={{
            height: `${Math.round(6 + level * 22)}px`,
          }}
        />
      ))}
    </div>
  )
}
