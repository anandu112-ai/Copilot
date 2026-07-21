import { Loader2 } from 'lucide-react'
import { cn } from '../../utils/cn'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  message?: string
  className?: string
  fullPage?: boolean
}

export function LoadingSpinner({ size = 'md', message, className, fullPage }: LoadingSpinnerProps) {
  const sizeMap = { sm: 16, md: 24, lg: 36 }
  const px = sizeMap[size]

  const inner = (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <Loader2 size={px} className="text-brand-400 animate-spin" />
      {message && (
        <p className="text-sm text-surface-400 animate-pulse">{message}</p>
      )}
    </div>
  )

  if (fullPage) {
    return (
      <div className="flex items-center justify-center min-h-[400px] w-full">
        {inner}
      </div>
    )
  }

  return inner
}

export default LoadingSpinner
