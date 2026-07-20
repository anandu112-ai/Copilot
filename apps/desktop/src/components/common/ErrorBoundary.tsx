import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  context?: string  // e.g. 'DashboardPage' for better error messages
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  showDetails: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null, showDetails: false }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo)
    this.setState({ errorInfo })
    // In a real app you'd send to a crash reporter here
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    if (this.props.fallback) return this.props.fallback

    const isDev = process.env.NODE_ENV === 'development'
    const contextLabel = this.props.context ?? 'this section'

    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-5">
          <AlertTriangle size={24} className="text-red-400" />
        </div>
        <h3 className="text-base font-bold text-surface-100 mb-2">
          Something went wrong in {contextLabel}
        </h3>
        <p className="text-sm text-surface-400 max-w-md mb-6 leading-relaxed">
          An unexpected error occurred. Your data is safe. You can try reloading this section
          or restart the application if the problem persists.
        </p>

        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={this.handleReset}
            className="btn-primary flex items-center gap-2"
          >
            <RefreshCw size={14} />
            Reload Section
          </button>
          <button
            onClick={() => window.location.reload()}
            className="btn-secondary"
          >
            Reload App
          </button>
        </div>

        {isDev && this.state.error && (
          <div className="w-full max-w-2xl text-left">
            <button
              onClick={() => this.setState(s => ({ showDetails: !s.showDetails }))}
              className="flex items-center gap-2 text-xs text-surface-500 hover:text-surface-300 mb-2"
            >
              {this.state.showDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {this.state.showDetails ? 'Hide' : 'Show'} error details (dev mode)
            </button>
            {this.state.showDetails && (
              <pre className="text-xs text-red-400 bg-red-500/5 border border-red-500/20 rounded-xl p-4 overflow-auto max-h-64">
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            )}
          </div>
        )}
      </div>
    )
  }
}

export default ErrorBoundary
