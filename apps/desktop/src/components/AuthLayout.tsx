import { ReactNode } from 'react'
import {
  BookOpen, FileText, BarChart3, Shield, Sparkles
} from 'lucide-react'

interface AuthLayoutProps {
  children: ReactNode
}

const FEATURES = [
  { icon: <FileText size={15} />, label: 'Document Intelligence', desc: 'AI-powered invoice & PDF processing' },
  { icon: <BarChart3 size={15} />, label: 'GST Reconciliation', desc: 'GSTR-2B vs ledger variance detection' },
  { icon: <Shield size={15} />, label: 'Audit Workflows', desc: 'Multi-level voucher approval pipeline' },
  { icon: <Sparkles size={15} />, label: 'AI Copilot', desc: 'Local LLM for CA-specific queries' },
]

/**
 * AuthLayout Component
 * 
 * Shared layout for authentication pages (login, register)
 * Features:
 * - Responsive two-column layout (branding left, form right)
 * - Animated background with floating particles
 * - Glassmorphism card design
 * - Mobile-optimized single column on small screens
 */
export default function AuthLayout({ children }: AuthLayoutProps) {
  // Generate random particles for background animation
  const particles = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    size: 2 + Math.random() * 4,
    left: Math.random() * 100,
    delay: Math.random() * 8,
    duration: 6 + Math.random() * 10,
  }))

  return (
    <div className="min-h-screen bg-[#080c14] flex overflow-hidden relative">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map(p => (
          <div
            key={p.id}
            className="absolute rounded-full bg-brand-500/20 animate-float-up"
            style={{
              width: p.size,
              height: p.size,
              left: `${p.left}%`,
              top: '100%',
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}
        {/* gradient glow orbs */}
        <div className="absolute top-[-200px] left-[-200px] w-[600px] h-[600px] rounded-full bg-brand-600/10 blur-[120px]" />
        <div className="absolute bottom-[-200px] right-[-100px] w-[500px] h-[500px] rounded-full bg-indigo-600/8 blur-[100px]" />
      </div>

      {/* Left — branding panel */}
      <div className="hidden lg:flex lg:w-[55%] flex-col justify-between p-14 relative z-10">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/30">
            <BookOpen size={20} className="text-white" />
          </div>
          <div>
            <p className="text-white font-black text-base tracking-tight">CA Copilot</p>
            <p className="text-surface-500 text-[10px] font-semibold uppercase tracking-widest">AI Accounting OS</p>
          </div>
        </div>

        {/* Hero Text */}
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-[11px] font-bold uppercase tracking-widest">
              <Sparkles size={11} /> Enterprise AI Platform for CAs
            </div>
            <h1 className="text-5xl font-black text-white leading-tight">
              Your entire firm,
              <br />
              <span className="bg-gradient-to-r from-brand-400 to-indigo-400 bg-clip-text text-transparent">
                intelligently automated.
              </span>
            </h1>
            <p className="text-surface-400 text-base leading-relaxed max-w-md">
              GST reconciliation, voucher approvals, tax audit reports — all powered by AI that understands Indian CA workflows.
            </p>
          </div>

          {/* Feature list */}
          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-brand-500/20 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-400 flex-shrink-0">
                  {f.icon}
                </div>
                <div>
                  <p className="text-white text-xs font-bold">{f.label}</p>
                  <p className="text-surface-500 text-[10px] mt-0.5 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 text-[10px] text-surface-600">
          <span>© 2026 CA Copilot</span>
          <span>·</span>
          <span>Data stays 100% local</span>
          <span>·</span>
          <span>ICAI Guideline Compliant</span>
        </div>
      </div>

      {/* Right — form content */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-6 lg:p-12 relative z-10">
        <div className="w-full max-w-[400px] space-y-8">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <BookOpen size={18} className="text-white" />
            </div>
            <p className="text-white font-black text-base">CA Copilot</p>
          </div>

          {/* Form card with glassmorphism */}
          <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-8 shadow-2xl shadow-black/60">
            {children}
          </div>

          {/* Disclaimer */}
          <p className="text-center text-[10px] text-surface-600 leading-relaxed px-4">
            This is a secure, locally-hosted CA Copilot instance. All client data is stored on your device and never transmitted externally.
          </p>
        </div>
      </div>
    </div>
  )
}
