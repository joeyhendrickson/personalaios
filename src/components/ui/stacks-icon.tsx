interface StacksIconProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function StacksIcon({ className = '', size = 'md' }: StacksIconProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  }

  const layerClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  }

  const gapClasses = {
    sm: 'space-y-0.5',
    md: 'space-y-1',
    lg: 'space-y-1.5',
  }

  return (
    <div className={`${sizeClasses[size]} flex items-center justify-center ${className}`}>
      <div className={`flex flex-col ${gapClasses[size]} w-full`}>
        <div className={`w-full ${layerClasses[size]} bg-white rounded`}></div>
        <div className={`w-full ${layerClasses[size]} bg-white rounded`}></div>
        <div className={`w-full ${layerClasses[size]} bg-white rounded`}></div>
      </div>
    </div>
  )
}
