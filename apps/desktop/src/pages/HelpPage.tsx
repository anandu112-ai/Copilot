import { HelpCircle, Book, Github, ExternalLink, MessageCircle, Shield } from 'lucide-react'

export default function HelpPage() {
  return (
    <div className="page-container max-w-3xl">
      <div className="section-header">
        <div>
          <h2 className="text-lg font-bold text-surface-100 flex items-center gap-2">
            <HelpCircle size={18} className="text-brand-400" />
            Help & About
          </h2>
          <p className="text-sm text-surface-400 mt-0.5">Documentation, keyboard shortcuts, and application information</p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Getting Started */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-surface-200 mb-3 flex items-center gap-2">
            <Book size={14} className="text-brand-400" />
            Getting Started
          </h3>
          <div className="space-y-3 text-sm text-surface-400">
            <div className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
              <div>
                <p className="text-surface-200 font-medium">PDF to Excel Conversion</p>
                <p className="text-xs mt-0.5">Navigate to PDF to Excel, upload a PDF invoice or statement, select the document type, review extracted data, and export to Excel.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
              <div>
                <p className="text-surface-200 font-medium">Conversion History</p>
                <p className="text-xs mt-0.5">All conversions are saved locally. Access them from the History section in the sidebar.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
              <div>
                <p className="text-surface-200 font-medium">Settings</p>
                <p className="text-xs mt-0.5">Configure theme, default export folder, and OCR settings from the Settings page.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-surface-200 mb-3">Keyboard Shortcuts</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              ['Ctrl+K', 'Global search'],
              ['Ctrl+U', 'Quick upload'],
              ['Ctrl+,', 'Open settings'],
              ['Esc', 'Close dialog/search'],
            ].map(([key, desc]) => (
              <div key={key} className="flex items-center justify-between py-2 px-3 bg-surface-900 rounded-lg">
                <span className="text-surface-400">{desc}</span>
                <kbd className="px-1.5 py-0.5 bg-surface-800 border border-surface-700 rounded text-surface-300 font-mono">{key}</kbd>
              </div>
            ))}
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="card p-5 border-emerald-500/20 bg-emerald-500/5">
          <h3 className="text-sm font-semibold text-emerald-400 mb-2 flex items-center gap-2">
            <Shield size={14} />
            Privacy & Security
          </h3>
          <ul className="space-y-1.5 text-xs text-surface-400">
            <li className="flex gap-2"><span className="text-emerald-400 mt-0.5">✓</span> All documents are processed locally on this machine</li>
            <li className="flex gap-2"><span className="text-emerald-400 mt-0.5">✓</span> No document is uploaded to any cloud service in the MVP</li>
            <li className="flex gap-2"><span className="text-emerald-400 mt-0.5">✓</span> No analytics or tracking without your explicit consent</li>
            <li className="flex gap-2"><span className="text-emerald-400 mt-0.5">✓</span> All data is stored in a local SQLite database</li>
            <li className="flex gap-2"><span className="text-emerald-400 mt-0.5">✓</span> Python processing service runs only on localhost</li>
          </ul>
        </div>

        {/* Disclaimer */}
        <div className="card p-5 border-amber-500/20 bg-amber-500/5">
          <h3 className="text-sm font-semibold text-amber-400 mb-2">Professional Disclaimer</h3>
          <p className="text-xs text-surface-400 leading-relaxed">
            CA Copilot is a productivity and decision support tool. It does not provide professional tax advice, audit opinions, or legal guidance. All outputs must be reviewed and verified by a qualified Chartered Accountant or relevant professional. The application makes no representations regarding the completeness or accuracy of extracted data.
          </p>
        </div>
      </div>
    </div>
  )
}
