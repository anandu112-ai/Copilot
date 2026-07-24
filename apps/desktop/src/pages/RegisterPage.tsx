import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Shield, Eye, EyeOff, Loader2, AlertCircle, Lock, Mail, User, Phone, Building
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'
import AuthLayout from '../components/AuthLayout'

export default function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [mobile, setMobile] = useState('')
  const [firmName, setFirmName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { register } = useAuthStore()
  const navigate = useNavigate()

  // Real-time password strength indicator
  const getPasswordStrength = (pwd: string): { score: number; label: string; color: string } => {
    if (!pwd) return { score: 0, label: '', color: '' }
    
    let score = 0
    if (pwd.length >= 8) score++
    if (/[A-Z]/.test(pwd)) score++
    if (/[a-z]/.test(pwd)) score++
    if (/[0-9]/.test(pwd)) score++
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) score++

    if (score <= 2) return { score, label: 'Weak', color: 'text-red-400' }
    if (score === 3) return { score, label: 'Fair', color: 'text-amber-400' }
    if (score === 4) return { score, label: 'Good', color: 'text-yellow-400' }
    return { score, label: 'Strong', color: 'text-green-400' }
  }

  const passwordStrength = getPasswordStrength(password)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation - with defensive null/undefined checks
    if (!fullName || !fullName.trim() || !email || !email.trim() || !password) {
      setError('Please fill in all required fields.')
      return
    }

    if (fullName.trim().length < 2) {
      setError('Full name must be at least 2 characters.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.')
      return
    }

    if (mobile && mobile.trim() && !/^(\+91|0)?[6-9]\d{9}$/.test(mobile.trim().replace(/[\s\-()]/g, ''))) {
      setError('Please enter a valid mobile number.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    if (!/[A-Z]/.test(password)) {
      setError('Password must contain at least one uppercase letter.')
      return
    }

    if (!/[a-z]/.test(password)) {
      setError('Password must contain at least one lowercase letter.')
      return
    }

    if (!/[0-9]/.test(password)) {
      setError('Password must contain at least one number.')
      return
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      setError('Password must contain at least one special character.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setError('')
    setLoading(true)

    try {
      const result = await register({
        fullName: fullName?.trim() || '',
        email: email?.trim() || '',
        mobile: mobile?.trim() || undefined,
        firmName: firmName?.trim() || undefined,
        password: password || '',
        confirmPassword: confirmPassword || '',
      })

      if (!result.success) {
        setError(result.error || 'Registration failed. Please try again.')
        toast.error(result.error || 'Registration failed')
        setLoading(false)
        return
      }

      toast.success('Your account has been created.', { icon: '🎉' })
      
      // Navigate to dashboard
      navigate('/dashboard')
    } catch (err: any) {
      const msg = err?.message || 'Registration failed. Please try again.'
      setError(msg)
      toast.error(msg)
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="mb-6">
        <h2 className="text-2xl font-black text-white">Create Account</h2>
        <p className="text-surface-400 text-sm mt-1">
          Set up your CA Copilot account
        </p>
      </div>

      <form onSubmit={handleRegister} className="space-y-4">
        {/* Full Name */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-surface-400 uppercase tracking-wider">
            Full Name <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-500" />
            <input
              type="text"
              value={fullName}
              onChange={e => { setFullName(e.target.value); setError('') }}
              className="w-full bg-white/[0.04] border border-white/[0.10] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-surface-600 outline-none focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 transition-all"
              placeholder="John Doe"
              maxLength={100}
              disabled={loading}
              autoFocus
            />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-surface-400 uppercase tracking-wider">
            Email Address <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-500" />
            <input
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

        {/* Mobile */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-surface-400 uppercase tracking-wider">
            Mobile Number
          </label>
          <div className="relative">
            <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-500" />
            <input
              type="tel"
              value={mobile}
              onChange={e => { setMobile(e.target.value); setError('') }}
              className="w-full bg-white/[0.04] border border-white/[0.10] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-surface-600 outline-none focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 transition-all"
              placeholder="+91 9876543210"
              maxLength={15}
              disabled={loading}
            />
          </div>
        </div>

        {/* Firm Name */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-surface-400 uppercase tracking-wider">
            Company/Firm Name
          </label>
          <div className="relative">
            <Building size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-500" />
            <input
              type="text"
              value={firmName}
              onChange={e => { setFirmName(e.target.value); setError('') }}
              className="w-full bg-white/[0.04] border border-white/[0.10] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-surface-600 outline-none focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 transition-all"
              placeholder="ABC & Associates"
              maxLength={100}
              disabled={loading}
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-surface-400 uppercase tracking-wider">
            Password <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-500" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              className="w-full bg-white/[0.04] border border-white/[0.10] rounded-xl pl-10 pr-11 py-3 text-sm text-white placeholder-surface-600 outline-none focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 transition-all"
              placeholder="••••••••"
              autoComplete="new-password"
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
          {password && (
            <div className="flex items-center gap-2 text-xs">
              <div className="flex-1 h-1 bg-surface-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    passwordStrength.score <= 2 ? 'bg-red-500' :
                    passwordStrength.score === 3 ? 'bg-amber-500' :
                    passwordStrength.score === 4 ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                />
              </div>
              <span className={passwordStrength.color}>
                {passwordStrength.label}
              </span>
            </div>
          )}
          <p className="text-[10px] text-surface-500 leading-relaxed">
            Must contain uppercase, lowercase, number, and special character (min 8 chars)
          </p>
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-surface-400 uppercase tracking-wider">
            Confirm Password <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-500" />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => { setConfirmPassword(e.target.value); setError('') }}
              className="w-full bg-white/[0.04] border border-white/[0.10] rounded-xl pl-10 pr-11 py-3 text-sm text-white placeholder-surface-600 outline-none focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 transition-all"
              placeholder="••••••••"
              autoComplete="new-password"
              maxLength={128}
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(v => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300 transition-colors"
              tabIndex={-1}
            >
              {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
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
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-bold text-sm shadow-lg shadow-brand-500/25 transition-all hover:shadow-brand-500/40 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {loading ? (
            <><Loader2 size={15} className="animate-spin" /> Creating Account…</>
          ) : (
            <><Shield size={15} /> Create Account</>
          )}
        </button>
      </form>

      {/* Login link */}
      <div className="mt-6 text-center">
        <p className="text-surface-400 text-sm">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-brand-400 hover:text-brand-300 font-semibold transition-colors"
          >
            Sign In
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
