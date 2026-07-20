import { Construction } from 'lucide-react'
import React from 'react'

interface FeatureItem {
  label: string
  description?: string
}

interface ComingSoonProps {
  title: string
  description: string
  icon: React.ReactNode
  features?: FeatureItem[]
  accentColor?: string
}

export default function ComingSoon({
  title,
  description,
  icon,
  features = [],
  accentColor = 'from-brand-500 to-brand-700',
}: ComingSoonProps) {
  return (
    <div className="page-container flex flex-col items-center justify-center min-h-[calc(100vh-52px)] max-w-2xl mx-auto text-center">
      {/* Icon */}
      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${accentColor} flex items-center justify-center mb-6 shadow-lg`}>
        {icon}
      </div>

      {/* Title */}
      <h2 className="text-xl font-bold text-surface-100 mb-2">{title}</h2>

      {/* Coming Soon Badge */}
      <div className="coming-soon-badge mb-4">
        <Construction size={10} />
        Coming in a future version
      </div>

      {/* Description */}
      <p className="text-sm text-surface-400 leading-relaxed mb-8 max-w-md">
        {description}
      </p>

      {/* Features */}
      {features.length > 0 && (
        <div className="w-full bg-surface-900 border border-surface-800 rounded-xl p-5 text-left">
          <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Construction size={12} />
            Planned Capabilities
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {features.map((feature) => (
              <div key={feature.label} className="flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-surface-300">{feature.label}</p>
                  {feature.description && (
                    <p className="text-xs text-surface-500 mt-0.5">{feature.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-6 text-xs text-surface-600">
        All processing will remain local and private when this feature is released.
      </p>
    </div>
  )
}
