import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Shield, Eye, EyeOff, Loader2, AlertCircle, Lock, Mail
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'
import AuthLayout from '../components/AuthLayout'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const emailTrimmed = email?.trim() || ''
    const passwordTrimmed = password?.trim() || ''
    
    if (!emailTrimmed || !passwordTrimmed) {
      setError('Please enter your email and password.')
      return
    }
    
    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      setError('Please enter a valid email address.')
      return
    }
    
    if (passwordTrimmed.length < 4) {
      setError('Password is too short.')
      return
    }
    
    setError('')
    setLoading(true)
    
    try {
      const result = await window.electronAPI.auth.login({
        email: emailTrimmed,
        password: passwordTrimmed,
      })

      if (!result.success) {
        setError(result.error || 'Login failed. Please try again.')
        toast.error(result.error || 'Login failed')
        setLoading(false)
        return
      }

      if (!result.user || !result.sessionToken) {
        setError('Login failed. Invalid response from server.')
        toast.error('Login failed')
        setLoading(false)
        return
      }

      // Set auth state
      setAuth(result.user, result.sessionToken)
      
      const userName = result.user?.full_name || result.user?.email || 'User'
      toast.success(`Welcome back, ${userName}!`, { icon: '👋' })
      
      // Navigate to dashboard
      navigate('/dashboard')
    } catch (err: any) {
      const msg = err?.message || 'Login failed. Please check your credentials.'
      setError(msg)
      toast.error(msg)
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="mb-8">
        <h2 className="text-2xl font-black text-white">Sign in</h2>
        <p className="text-surface-400 text-sm mt-1">
          Enter your credentials to access the dashboard.
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-5">
        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-surface-400 uppercase tracking-wider">
            Email Address
          </label>
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
              autoFocus
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-surface-400 uppercase tracking-wider">
            Password
          </label>
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

      {/* Register link */}
      <div className="mt-6 text-center">
        <p className="text-surface-400 text-sm">
          Don't have an account?{' '}
          <Link
            to="/register"
            className="text-brand-400 hover:text-brand-300 font-semibold transition-colors"
          >
            Create Account
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
