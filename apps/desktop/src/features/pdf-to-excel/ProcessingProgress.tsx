import { Loader2, CheckCircle2 } from 'lucide-react'

interface ProcessingStage {
  label: string
  status: 'pending' | 'active' | 'done'
}

interface ProcessingProgressProps {
  stages: ProcessingStage[]
  fileName: string
  documentType: string
}

export default function ProcessingProgress({ stages, fileName, documentType }: ProcessingProgressProps) {
  const activeIndex = stages.findIndex((s) => s.status === 'active')
  const progress = activeIndex >= 0
    ? Math.round((activeIndex / stages.length) * 100)
    : stages.every((s) => s.status === 'done') ? 100 : 0

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-sm mx-auto text-center">
      {/* Animated spinner */}
      <div className="relative w-20 h-20 mb-6">
        <div className="absolute inset-0 rounded-full border-4 border-surface-800" />
        <div
          className="absolute inset-0 rounded-full border-4 border-transparent border-t-brand-500 animate-spin"
          style={{ animationDuration: '0.8s' }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-brand-400">{progress}%</span>
        </div>
      </div>

      <h3 className="text-base font-semibold text-surface-200 mb-1">Processing Document</h3>
      <p className="text-xs text-surface-500 mb-6 truncate max-w-full">{fileName}</p>

      {/* Stage list */}
      <div className="w-full space-y-2">
        {stages.map((stage, i) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
              {stage.status === 'done' && <CheckCircle2 size={16} className="text-emerald-400" />}
              {stage.status === 'active' && <Loader2 size={16} className="text-brand-400 animate-spin" />}
              {stage.status === 'pending' && <div className="w-1.5 h-1.5 rounded-full bg-surface-700" />}
            </div>
            <span className={
              stage.status === 'done' ? 'text-surface-400' :
              stage.status === 'active' ? 'text-surface-200 font-medium' :
              'text-surface-600'
            }>
              {stage.label}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-6 text-xs text-surface-600">
        Processing happens locally — your document never leaves this machine
      </p>
    </div>
  )
}
