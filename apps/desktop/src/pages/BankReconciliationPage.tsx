import { useState } from 'react'
import {
  GitCompare, CheckCircle2, AlertCircle, HelpCircle, Search, Filter,
  TrendingUp, Download, Eye, RefreshCw, ArrowRightLeft, Check, Play, CheckCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

interface BankTransaction {
  id: string
  date: string
  description: string
  amount: number
  type: 'Withdrawal' | 'Deposit'
  reconciled: boolean
  matchedLedgerId?: string
  confidence?: number
}

interface LedgerTransaction {
  id: string
  date: string
  description: string
  amount: number
  type: 'Debit' | 'Credit'
  reconciled: boolean
}

const mockBankTransactions: BankTransaction[] = [
  { id: 'bt-1', date: '2026-07-12', description: 'NEFT/5512A/ADITYA-BRLA', amount: 283200.00, type: 'Withdrawal', reconciled: false, confidence: 99, matchedLedgerId: 'lt-1' },
  { id: 'bt-2', date: '2026-07-14', description: 'CHQ/OM-PACKAGING/8821', amount: 53100.00, type: 'Withdrawal', reconciled: false, confidence: 98, matchedLedgerId: 'lt-3' },
  { id: 'bt-3', date: '2026-07-15', description: 'UPI/9928128911/MGM-LGS', amount: 53100.00, type: 'Withdrawal', reconciled: false, confidence: 85, matchedLedgerId: 'lt-2' },
  { id: 'bt-4', date: '2026-07-17', description: 'INTEREST CREDIT MAIN', amount: 4800.00, type: 'Deposit', reconciled: true },
  { id: 'bt-5', date: '2026-07-19', description: 'CASH DEPOSIT MUMB BRANCH', amount: 95000.00, type: 'Deposit', reconciled: false, confidence: 92, matchedLedgerId: 'lt-5' },
]

const mockLedgerTransactions: LedgerTransaction[] = [
  { id: 'lt-1', date: '2026-07-11', description: 'Aditya Birla Chemicals Ltd (Vendor payment)', amount: 283200.00, type: 'Debit', reconciled: false },
  { id: 'lt-2', date: '2026-07-10', description: 'MGM Logistics Services (Transport charge)', amount: 53100.00, type: 'Debit', reconciled: false },
  { id: 'lt-3', date: '2026-07-14', description: 'Om Packaging Industries (Box purchases)', amount: 53100.00, type: 'Debit', reconciled: false },
  { id: 'lt-4', date: '2026-07-17', description: 'State Bank Interest Account', amount: 4800.00, type: 'Credit', reconciled: true },
  { id: 'lt-5', date: '2026-07-18', description: 'Petty Cash - Deposit to Bank', amount: 95000.00, type: 'Credit', reconciled: false },
]

export default function BankReconciliationPage() {
  const [bankTxns, setBankTxns] = useState<BankTransaction[]>(mockBankTransactions)
  const [ledgerTxns, setLedgerTxns] = useState<LedgerTransaction[]>(mockLedgerTransactions)
  const [selectedBankTxId, setSelectedBankTxId] = useState<string>('bt-1')

  const selectedBankTx = bankTxns.find(t => t.id === selectedBankTxId)
  const associatedLedgerTx = selectedBankTx?.matchedLedgerId 
    ? ledgerTxns.find(t => t.id === selectedBankTx.matchedLedgerId) 
    : null

  const handleMatchAccept = (bankTxId: string, ledgerTxId: string) => {
    setBankTxns(prev => prev.map(t => t.id === bankTxId ? { ...t, reconciled: true } : t))
    setLedgerTxns(prev => prev.map(t => t.id === ledgerTxId ? { ...t, reconciled: true } : t))
    toast.success('AI Reconciliation Match Accepted!')
  }

  const runReconciliationAI = () => {
    toast.success('Analyzing bank statement feeds vs ledger logs. 4 match recommendations mapped.')
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="section-header">
        <div>
          <h2 className="text-lg font-bold text-surface-100 flex items-center gap-2">
            <GitCompare size={18} className="text-brand-500" />
            Bank Statement Reconciliation
          </h2>
          <p className="text-sm text-surface-400 mt-0.5">Match bank withdrawals and deposits against general ledger records with AI match support</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={runReconciliationAI}
            className="btn-primary text-xs gap-1.5"
          >
            <Play size={13} /> Auto-Reconcile Batch
          </button>
        </div>
      </div>

      {/* Stats Board */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-[10px] text-surface-400 font-bold uppercase tracking-wider">Bank Balance (Statement)</p>
          <p className="text-2xl font-bold text-surface-100 mt-1">₹14,82,410.00</p>
          <p className="text-[10px] text-surface-500 mt-1">As of: 2026-07-20</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] text-surface-400 font-bold uppercase tracking-wider">Ledger Balance (Books)</p>
          <p className="text-2xl font-bold text-surface-100 mt-1">₹14,82,410.00</p>
          <p className="text-[10px] text-emerald-400 mt-1">Fully balanced</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">Unreconciled items</p>
          <p className="text-2xl font-bold text-surface-100 mt-1">
            {bankTxns.filter(t => !t.reconciled).length} records
          </p>
          <p className="text-[10px] text-amber-400/80 mt-1">Requires reconciliation</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider font-semibold">Matched Today</p>
          <p className="text-2xl font-bold text-surface-100 mt-1">
            {bankTxns.filter(t => t.reconciled).length} entries
          </p>
          <p className="text-[10px] text-surface-500 mt-1">Matched automatically</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Side: Bank Statement (Split screen comparison) */}
        <div className="xl:col-span-8 flex flex-col gap-4">
          <div className="card p-4 flex flex-col h-full">
            <h3 className="text-xs font-bold text-surface-300 mb-3 pb-2 border-b border-surface-800 uppercase tracking-wider">
              Comparative Reconciliation feeds
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              
              {/* Bank Statement */}
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs font-bold text-brand-400">Government Bank Statement</span>
                  <span className="text-[10px] text-surface-500 font-mono">feed: active</span>
                </div>
                
                <div className="table-wrapper max-h-[350px] overflow-y-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-surface-900 border-b border-surface-800 text-[10px] text-surface-400 uppercase">
                        <th className="p-2">Date/Details</th>
                        <th className="p-2 text-right">Amount</th>
                        <th className="p-2 text-center">State</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bankTxns.map((t) => {
                        const isSelected = t.id === selectedBankTxId
                        return (
                          <tr 
                            key={t.id}
                            onClick={() => setSelectedBankTxId(t.id)}
                            className={`cursor-pointer hover:bg-surface-750 border-b border-surface-800 text-xs ${
                              isSelected ? 'bg-brand-500/10' : ''
                            }`}
                          >
                            <td className="p-2">
                              <p className="font-semibold text-[11px] text-surface-200 truncate max-w-[150px]">{t.description}</p>
                              <p className="text-[9px] text-surface-500 font-mono">{t.date} · {t.type}</p>
                            </td>
                            <td className="p-2 text-right font-mono text-surface-200">
                              ₹{t.amount.toLocaleString('en-IN')}
                            </td>
                            <td className="p-2 text-center">
                              {t.reconciled ? (
                                <span className="text-emerald-400 text-[10px] bg-emerald-500/10 px-1.5 py-0.5 rounded">Reconciled</span>
                              ) : (
                                <span className="text-amber-400 text-[10px] bg-amber-500/10 px-1.5 py-0.5 rounded">Unmatched</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* General Ledger Book */}
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs font-bold text-emerald-500">General Ledger (Purchase Register)</span>
                  <span className="text-[10px] text-surface-500 font-mono">Tally: synced</span>
                </div>
                
                <div className="table-wrapper max-h-[350px] overflow-y-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-surface-900 border-b border-surface-800 text-[10px] text-surface-400 uppercase">
                        <th className="p-2">Date/Ledger Account</th>
                        <th className="p-2 text-right">Value</th>
                        <th className="p-2 text-center">State</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerTxns.map((t) => {
                        return (
                          <tr 
                            key={t.id} 
                            className="border-b border-surface-800 text-xs hover:bg-surface-750"
                          >
                            <td className="p-2">
                              <p className="font-semibold text-[11px] text-surface-200 truncate max-w-[150px]">{t.description}</p>
                              <p className="text-[9px] text-surface-500 font-mono">{t.date} · {t.type}</p>
                            </td>
                            <td className="p-2 text-right font-mono text-surface-200">
                              ₹{t.amount.toLocaleString('en-IN')}
                            </td>
                            <td className="p-2 text-center">
                              {t.reconciled ? (
                                <span className="text-emerald-400 text-[10px] bg-emerald-500/10 px-1.5 py-0.5 rounded">Matched</span>
                              ) : (
                                <span className="text-amber-400 text-[10px] bg-amber-500/10 px-1.5 py-0.5 rounded">Unmatched</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Right Side: AI Reconciliation Panel */}
        <div className="xl:col-span-4 flex flex-col">
          <div className="card p-5 flex flex-col h-full justify-between gap-4 text-left">
            {selectedBankTx ? (
              <>
                <div className="space-y-4">
                  <div className="border-b border-surface-800 pb-3">
                    <h3 className="text-xs font-bold text-surface-400 uppercase tracking-wider">AI Reconciliation Suggestion</h3>
                    <h4 className="text-sm font-bold text-surface-100 mt-1 truncate">{selectedBankTx.description}</h4>
                    <p className="text-xs text-surface-500 font-mono">Amount: ₹{selectedBankTx.amount.toLocaleString('en-IN')}</p>
                  </div>

                  {selectedBankTx.reconciled ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl p-4 flex flex-col items-center justify-center text-center py-10">
                      <CheckCircle size={32} className="mb-2" />
                      <h4 className="text-xs font-bold">Transaction Reconciled</h4>
                      <p className="text-[11px] text-emerald-400/80 mt-1">This item has been successfully cleared and balanced against general ledger accounts.</p>
                    </div>
                  ) : associatedLedgerTx ? (
                    <div className="space-y-3">
                      <div className="bg-surface-950 p-3 rounded-lg border border-surface-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-brand-400 font-bold uppercase tracking-wider">AI Recommendation match</span>
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-mono px-1 rounded">{selectedBankTx.confidence}% Match Match</span>
                        </div>
                        <div className="space-y-1.5 font-mono text-[11px]">
                          <p className="text-surface-300 font-semibold truncate">{associatedLedgerTx.description}</p>
                          <p className="flex justify-between"><span className="text-surface-500">Ledger Date:</span> <span className="text-surface-200">{associatedLedgerTx.date}</span></p>
                          <p className="flex justify-between"><span className="text-surface-500">Ledger Value:</span> <span className="text-surface-200">₹{associatedLedgerTx.amount.toLocaleString('en-IN')}</span></p>
                        </div>
                      </div>

                      <div className="bg-surface-900 p-3 rounded-lg border border-surface-800 space-y-1.5">
                        <h4 className="text-xs font-semibold text-surface-200">Match Evidence</h4>
                        <p className="text-[11px] text-surface-400 leading-relaxed">
                          1. Amount matches exactly (₹{selectedBankTx.amount.toLocaleString('en-IN')}).<br />
                          2. Transaction dates are within 1 day bounds (Ledger: {associatedLedgerTx.date} vs Bank Statement: {selectedBankTx.date}).<br />
                          3. String similarity between vendor name 'Aditya Birla Chemicals' and banking naration 'ADITYA-BRLA' matches NLP dictionaries.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg p-3 flex gap-2 items-start">
                      <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold">No direct match found</p>
                        <p className="text-[11px] text-amber-500/80 mt-0.5 leading-relaxed">
                          This entry is in the bank statement (Interest Credit) but has no matching voucher in books. Recommendation: Create adjustment entry in general journal.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {!selectedBankTx.reconciled && associatedLedgerTx && (
                    <button
                      onClick={() => handleMatchAccept(selectedBankTx.id, associatedLedgerTx.id)}
                      className="btn-primary w-full text-xs justify-center gap-1.5"
                    >
                      <Check size={13} /> Accept & Link Transactions
                    </button>
                  )}
                  {!selectedBankTx.reconciled && !associatedLedgerTx && (
                    <button
                      onClick={() => toast.success('Creating General Ledger interest income voucher')}
                      className="btn-primary w-full text-xs justify-center gap-1.5"
                    >
                      Create Book Entry for this credit
                    </button>
                  )}
                  <button
                    onClick={() => toast.success('Launching statement visual editor')}
                    className="btn-secondary w-full text-xs justify-center border border-surface-700"
                  >
                    View Narration details
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-20 text-surface-500">
                <GitCompare size={26} className="mb-2" />
                <p className="text-sm">Select bank statement transaction to view matching logic</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
