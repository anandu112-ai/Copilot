import { useState } from 'react'
import { Bot, Sparkles, Lock } from 'lucide-react'
import ComingSoon from '../components/common/ComingSoon'

export default function AiCopilotPage() {
  return (
    <div className="page-container">
      {/* Header */}
      <div className="section-header">
        <div>
          <h2 className="text-lg font-bold text-surface-100 flex items-center gap-2">
            <Bot size={20} className="text-brand-400" />
            AI Copilot
          </h2>
          <p className="text-sm text-surface-400 mt-0.5">Your AI assistant for accounting, audit, and tax work</p>
        </div>
        <div className="coming-soon-badge">
          <Sparkles size={10} />
          AI Integration Coming Soon
        </div>
      </div>

      {/* Layout */}
      <div className="grid grid-cols-4 gap-4 h-[calc(100vh-200px)]">
        {/* Conversation sidebar */}
        <div className="card p-3 flex flex-col">
          <button className="btn-primary w-full mb-3 text-xs py-2 gap-1.5">
            <Sparkles size={12} />
            New Chat
          </button>
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <Bot size={24} className="text-surface-600 mb-2" />
            <p className="text-xs text-surface-500">No conversations yet</p>
          </div>
        </div>

        {/* Main chat area */}
        <div className="col-span-3 card flex flex-col overflow-hidden">
          {/* Chat area */}
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-700 flex items-center justify-center mb-5">
              <Bot size={28} className="text-white" />
            </div>
            <h3 className="text-base font-semibold text-surface-200 mb-2">AI Copilot</h3>
            <p className="text-sm text-surface-500 max-w-sm leading-relaxed mb-6">
              An intelligent assistant for your accounting, GST, and audit questions. Connect an AI provider in Settings to activate.
            </p>

            {/* Planned capabilities */}
            <div className="grid grid-cols-2 gap-3 max-w-lg w-full text-left mb-6">
              {[
                { label: 'Accounting questions', desc: 'AS, Ind AS, accounting standards' },
                { label: 'GST guidance', desc: 'GST rules, returns, ITC analysis' },
                { label: 'Tax questions', desc: 'Income tax, TDS, compliance' },
                { label: 'Document analysis', desc: 'Ask questions about your files' },
                { label: 'Audit assistance', desc: 'Risk assessment support' },
                { label: 'Knowledge search', desc: 'Search regulatory database' },
              ].map((item) => (
                <div key={item.label} className="bg-surface-900 border border-surface-800 rounded-lg p-3">
                  <p className="text-xs font-medium text-surface-300">{item.label}</p>
                  <p className="text-xs text-surface-500 mt-0.5">{item.desc}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs text-surface-500 bg-surface-900 border border-surface-800 rounded-lg px-4 py-2.5">
              <Lock size={12} className="text-surface-500" />
              AI responses are informational only. Professional judgment required for all tax and audit decisions.
            </div>
          </div>

          {/* Input area (disabled) */}
          <div className="border-t border-surface-800 p-4">
            <div className="flex gap-2 items-end">
              <textarea
                disabled
                placeholder="AI provider not configured — see Settings to connect"
                className="input flex-1 resize-none opacity-50 cursor-not-allowed"
                rows={2}
              />
              <button disabled className="btn-primary opacity-50 cursor-not-allowed px-4 py-2">
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
