import { useState, useEffect } from 'react'
import {
  Shield, Eye, EyeOff, Loader2, AlertCircle, Lock, Mail,
  BookOpen, BarChart3, FileText, Sparkles
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { processorApi } from '../services/processorApi'
import toast from 'react-hot-toast'

const FEATURES = [
  { icon: <FileText size={15} />, label: 'Document Intelligence', desc: 'AI-powered invoice & PDF processing' },
  { icon: <BarChart3 size={15} />, label: 'GST Reconciliation', desc: 'GSTR-2B vs ledger variance detection' },
  { icon: <Shield size={15} />, label: 'Audit Workflows', desc: 'Multi-level voucher approval pipeline' },
  { icon: <Sparkles size={15} />, label: 'AI Copilot', desc: 'Local LLM for CA-specific queries' },
]

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { setAuth } = useAuthStore()

  // subtle floating particle animation data
  const particles = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    size: 2 + Math.random() * 4,
    left: Math.random() * 100,
    delay: Math.random() * 8,
    duration: 6 + Math.random() * 10,
  }))

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const emailTrimmed = email.trim()
    if (!emailTrimmed || !password.trim()) {
      setError('Please enter your email and password.')
      return
    }
    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      setError('Please enter a valid email address.')
      return
    }
    if (password.length < 4) {
      setError('Password is too short.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await processorApi.login(emailTrimmed, password)
      setAuth(res.user, res.access_token)
      toast.success(`Welcome back, ${res.user.name}!`, { icon: '👋' })
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Login failed. Please check your credentials.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

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

      {/* Right — login card */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-6 lg:p-12 relative z-10">
        <div className="w-full max-w-[400px] space-y-8">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <BookOpen size={18} className="text-white" />
            </div>
            <p className="text-white font-black text-base">CA Copilot</p>
          </div>

          {/* Card */}
          <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-8 shadow-2xl shadow-black/60">
            <div className="mb-8">
              <h2 className="text-2xl font-black text-white">Sign in</h2>
              <p className="text-surface-400 text-sm mt-1">Enter your firm credentials to access the dashboard.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-surface-400 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-500" />
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError('') }}
                    className="w-full bg-white/[0.04] border border-white/[0.10] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-surface-600 outline-none focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 transition-all"
                    placeholder="you@yourfirm.com"
                    autoComplete="email"
                    maxLength={254}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-surface-400 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-500" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError('') }}
                    className="w-full bg-white/[0.04] border border-white/[0.10] rounded-xl pl-10 pr-11 py-3 text-sm text-white placeholder-surface-600 outline-none focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 transition-all"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    maxLength={128}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs">
                  <AlertCircle size={13} className="flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-bold text-sm shadow-lg shadow-brand-500/25 transition-all hover:shadow-brand-500/40 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {loading ? (
                  <><Loader2 size={15} className="animate-spin" /> Signing in…</>
                ) : (
                  <><Shield size={15} /> Sign In Securely</>
                )}
              </button>
            </form>
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
