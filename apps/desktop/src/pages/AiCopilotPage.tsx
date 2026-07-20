import React, { useState, useRef, useEffect } from 'react'
import {
  Bot, Sparkles, Send, Paperclip, Pin, Trash2, Edit3, X, Download,
  CheckCircle, Table, FileText, ChevronRight, CornerDownRight, RefreshCw, AlertTriangle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useChatStore } from '../stores/chatStore'
import { useDocumentStore } from '../stores/documentStore'
import { SUGGESTED_PROMPTS } from '../types/chat'
import type { ChatMessage, MessageAttachment } from '../types/chat'

export default function AiCopilotPage() {
  const {
    conversations,
    activeConversationId,
    isTyping,
    currentContext,
    setActiveConversation,
    createConversation,
    deleteConversation,
    addMessage,
    setIsTyping,
    pinConversation,
    renameConversation,
    updateContext,
    getActiveConversation
  } = useChatStore()

  const { documents } = useDocumentStore()
  const activeConv = getActiveConversation()
  const [inputText, setInputText] = useState('')
  const [editingConvId, setEditingConvId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [selectedAttachments, setSelectedAttachments] = useState<File[]>([])
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [activeConv?.messages, isTyping])

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!inputText.trim() && selectedAttachments.length === 0) return
    if (!activeConversationId) return

    // Prepare attachments metadata
    const attachments: MessageAttachment[] = selectedAttachments.map((f, i) => ({
      id: `attach-${Date.now()}-${i}`,
      name: f.name,
      type: f.name.split('.').pop() || 'file',
      size: `${(f.size / 1024).toFixed(1)} KB`
    }))

    // Add user message
    addMessage(activeConversationId, {
      role: 'user',
      content: { text: inputText },
      status: 'complete',
      attachments,
      relatedDocuments: []
    })

    const question = inputText.trim()
    setInputText('')
    setSelectedAttachments([])

    // Simulate AI response
    setIsTyping(true)
    setTimeout(() => {
      let aiText = ''
      let tableData = undefined
      let exportable = false
      let exportType = undefined
      let exportLabel = undefined
      let relatedDocs: string[] = []

      const qLower = question.toLowerCase()

      if (qLower.includes('duplicate')) {
        aiText = `### Duplicate Vouchers and Invoices Check
I scanned the accounting transactions for **${currentContext.clientName || 'Apex Steel'}**.
Found **1 potential duplicate voucher** matching your parameters.

Here are the details:
`
        tableData = {
          headers: ['Voucher Number', 'Date', 'Vendor Name', 'GSTIN', 'Total Amount', 'Duplicate Match %'],
          rows: [
            ['PV-2026-419', '2026-07-18', 'Om Packaging Industries', '27AABCO5512N1Z4', '₹53,100.00', '99% (Duplicate of PV-2026-401)']
          ]
        }
        exportable = true
        exportType = 'Excel' as const
        exportLabel = 'Export Duplicate Findings'
        relatedDocs = ['doc-1']
      } else if (qLower.includes('blocked') || qLower.includes('17(5)')) {
        aiText = `### Blocked Credits Detection (Section 17(5))
I have parsed the purchases. One invoice violates the blocked credit provisions of the CGST Act:

- **Invoice INV-982181** (Toyota Motors): Purchase of passenger motor vehicle.
- **Involved CGST/SGST**: ₹2,38,000.00.
- **Compliance Risk**: Section 17(5) prohibits claiming ITC on passenger motor vehicles unless used for specific transport businesses.

*Recommended Action:* Reverse the ITC of **₹2,38,000.00** in your July GSTR-3B filings.`
        relatedDocs = ['doc-1', 'doc-4']
      } else if (qLower.includes('reconcile') && qLower.includes('sbi')) {
        aiText = `### SBI Bank Reconciliation Report
I analyzed 5 transactions from your bank statement against the purchase ledger. 
- **Matched**: 4 transactions (96% overall match confidence).
- **Unmatched / Requires Review**: 1 cash transaction.

Please review the reconciliation:
`
        tableData = {
          headers: ['Date', 'Narration', 'Bank Debit/Credit', 'Ledger Match', 'Status'],
          rows: [
            ['2026-04-03', 'NEFT Cr - APEX STEEL', '+₹1,77,000', 'Apex Steel Invoice (99% match)', 'Matched'],
            ['2026-04-05', 'IMPS Dr - MGM Logistics', '-₹53,100', 'MGM Statement (98% match)', 'Matched'],
            ['2026-04-22', 'CASH ATM Withdrawal', '-₹50,000', 'No Ledger Entry Found', 'Unmatched (Check Sec 40A(3))']
          ]
        }
        exportable = true
        exportType = 'Excel' as const
        exportLabel = 'Export Bank Reconciliation Report'
        relatedDocs = ['doc-3']
      } else if (qLower.includes('compare gstr') || qLower.includes('2b')) {
        aiText = `### GSTR-2B vs Purchase Register Summary
I have matched the GSTR-2B portal download against the local Purchase Register. 
**3 anomalies** detected.

`
        tableData = {
          headers: ['Invoice No', 'Vendor', 'Mismatch Class', 'Purchase Register', 'GSTR-2B', 'Action Required'],
          rows: [
            ['INV-2026-8941', 'Apex Steel', 'Amount Difference', '₹27,000 GST', '₹26,000 GST', 'Verify rate calculation'],
            ['MS-55102', 'Max Software', 'Missing in Portal GSTR-2B', '₹22,500 GST', '₹0.00', 'Verify if vendor has filed GSTR-1'],
            ['PO-INVALID-929', 'Unknown', 'Invalid GSTIN format', '₹15,300 GST', '₹15,300 GST', 'Correction required']
          ]
        }
        exportable = true
        exportType = 'Excel' as const
        exportLabel = 'Export GST Mismatch Report'
        relatedDocs = ['doc-4']
      } else if (qLower.includes('cash payment') || qLower.includes('40a')) {
        aiText = `### Cash Disallowance Check (Section 40A(3))
Under Section 40A(3) of the Income Tax Act, cash payments exceeding **₹10,000** in a single day to a single person are not deductible.

**Identified Violations:**
1. **PV-9902** (15-Jul-2026): **₹45,000.00** cash paid for office renovation maintenance.
2. **SBI Statement** (22-Apr-2026): **₹50,000.00** ATM cash withdrawal with no linked voucher.

*Recommendation:* Flag both transactions in the Tax Audit report (Form 3CD Clause 21) or replace cash transactions with digital modes.`
        relatedDocs = ['doc-3']
      } else if (qLower.includes('export of services') || qLower.includes('lut')) {
        aiText = `### GST Treatment: Export of Services (Under LUT)
Under Section 16 of the IGST Act 2017, export of services is categorized as a **Zero-Rated Supply**.

#### Two options for GST:
1. **Under LUT (Letter of Undertaking):** Export without paying integrated tax (IGST) and claim refund of unutilized Input Tax Credit (ITC).
2. **On Payment of IGST:** Pay IGST and subsequently claim a refund of tax paid.

*Source Reference:* Section 16(3) of IGST Act & Circular No. 125/44/2019-GST.`
      } else {
        aiText = `I processed your request regarding: "${question}".

As an offline junior CA, I can parse any accounting document or bank statement. Please try a more specific command like:
- *Compare GSTR-2B with purchase register*
- *Find duplicate invoices*
- *Check for Section 40A(3) cash violations*
- *Reconcile the SBI statement*`
      }

      addMessage(activeConversationId, {
        role: 'assistant',
        content: {
          text: aiText,
          tableData,
          exportable,
          exportType,
          exportLabel
        },
        status: 'complete',
        attachments: [],
        relatedDocuments: relatedDocs
      })
      setIsTyping(false)
    }, 1500)
  }

  const handlePromptClick = (text: string) => {
    setInputText(text)
    if (!activeConversationId) {
      createConversation()
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const arr = Array.from(e.target.files)
      setSelectedAttachments([...selectedAttachments, ...arr])
      toast.success(`${arr.length} file(s) attached.`)
    }
  }

  const handleTriggerExport = (label: string) => {
    toast.success(`Generating and exporting ${label} directly to Excel...`)
  }

  return (
    <div className="page-container h-[calc(100vh-var(--topbar-height))] flex flex-col p-0">
      
      {/* Upper panel layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Side: Conversation Hub */}
        <div className="w-64 border-r border-surface-700 bg-surface-900/60 flex flex-col">
          <div className="p-3 border-b border-surface-700">
            <button
              onClick={() => createConversation()}
              className="btn-primary w-full text-xs py-2 gap-1.5 justify-center shadow-md bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500"
            >
              <Sparkles size={13} />
              New Assistant Session
            </button>
          </div>

          {/* Conversations list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {/* Pinned Section */}
            {conversations.some(c => c.pinned) && (
              <div className="mb-2">
                <span className="text-[10px] uppercase font-bold text-surface-500 px-2 tracking-wider">Pinned Chats</span>
                {conversations.filter(c => c.pinned).map(c => renderConvItem(c))}
              </div>
            )}

            {/* Recent Section */}
            <div>
              <span className="text-[10px] uppercase font-bold text-surface-500 px-2 tracking-wider">Recent Sessions</span>
              {conversations.filter(c => !c.pinned).map(c => renderConvItem(c))}
            </div>
          </div>

          {/* Assistant Metadata / Session context */}
          <div className="p-3 border-t border-surface-700 bg-surface-950/40 text-xs">
            <div className="flex items-center gap-1.5 text-surface-400 font-semibold mb-2">
              <Bot size={13} className="text-brand-400" />
              Active Session Scope
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-[9px] text-surface-500 uppercase tracking-wider block font-bold">Client Account</label>
                <select
                  value={currentContext.clientId}
                  onChange={(e) => {
                    const clientName = e.target.options[e.target.selectedIndex].text
                    updateContext({ clientId: e.target.value, clientName })
                    toast.success(`Context switched to: ${clientName}`)
                  }}
                  className="w-full bg-surface-900 border border-surface-700 rounded px-1.5 py-0.5 mt-0.5 text-[11px] text-surface-300 outline-none"
                >
                  <option value="client-1">Apex Steel Industries Pvt Ltd</option>
                  <option value="client-2">MGM Logistics Services</option>
                  <option value="client-3">Om Packaging Industries</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="text-[9px] text-surface-500 uppercase tracking-wider block font-bold">Financial Year</label>
                  <select
                    value={currentContext.financialYear}
                    onChange={(e) => updateContext({ financialYear: e.target.value })}
                    className="w-full bg-surface-900 border border-surface-700 rounded px-1 py-0.5 mt-0.5 text-[10px] text-surface-300 outline-none"
                  >
                    <option value="2026-27">FY 2026-27</option>
                    <option value="2025-26">FY 2025-26</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] text-surface-500 uppercase tracking-wider block font-bold">Assessment Year</label>
                  <select
                    value={currentContext.assessmentYear}
                    onChange={(e) => updateContext({ assessmentYear: e.target.value })}
                    className="w-full bg-surface-900 border border-surface-700 rounded px-1 py-0.5 mt-0.5 text-[10px] text-surface-300 outline-none"
                  >
                    <option value="2027-28">AY 2027-28</option>
                    <option value="2026-27">AY 2026-27</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Conversation Area */}
        <div className="flex-1 flex flex-col bg-surface-950/20 overflow-hidden">
          {activeConv ? (
            <>
              {/* Active Conversation Header */}
              <div className="px-4 py-3 border-b border-surface-700 bg-surface-900/30 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-surface-100 flex items-center gap-1.5">
                    <Bot size={15} className="text-brand-500 animate-pulse" />
                    {activeConv.title}
                  </h3>
                  <p className="text-[10px] text-surface-500 mt-0.5">
                    Scanned context includes {documents.length} offline accounting documents.
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => pinConversation(activeConv.id)}
                    className={`p-1.5 rounded-md hover:bg-surface-800 transition-colors ${activeConv.pinned ? 'text-brand-400' : 'text-surface-500'}`}
                    title="Pin conversation"
                  >
                    <Pin size={13} />
                  </button>
                  <button
                    onClick={() => deleteConversation(activeConv.id)}
                    className="p-1.5 rounded-md hover:bg-surface-800 text-surface-500 hover:text-red-400 transition-colors"
                    title="Delete conversation"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Chat Message Scroll */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {activeConv.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 max-w-3xl ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                  >
                    {/* Icon/Avatar */}
                    <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center font-bold text-xs ${
                      msg.role === 'user'
                        ? 'bg-brand-600 text-white'
                        : 'bg-gradient-to-br from-brand-500 to-indigo-600 text-white'
                    }`}>
                      {msg.role === 'user' ? 'U' : <Bot size={14} />}
                    </div>

                    {/* Chat Bubble */}
                    <div className="space-y-2">
                      <div className={`p-3 rounded-xl border text-xs leading-relaxed text-left ${
                        msg.role === 'user'
                          ? 'bg-brand-500/10 border-brand-500/30 text-surface-200'
                          : 'bg-surface-900 border-surface-800 text-surface-200 shadow-sm'
                      }`}>
                        {/* Render Markdown-like texts */}
                        <div className="space-y-1.5 whitespace-pre-wrap">
                          {msg.content.text}
                        </div>

                        {/* Render Table Data if exists */}
                        {msg.content.tableData && (
                          <div className="mt-3 table-wrapper border border-surface-800 rounded-lg max-w-full overflow-x-auto">
                            <table className="min-w-full divide-y divide-surface-800 text-[10px]">
                              <thead className="bg-surface-950">
                                <tr>
                                  {msg.content.tableData.headers.map((h, i) => (
                                    <th key={i} className="px-3 py-1.5 text-left text-surface-400 font-bold tracking-wider">
                                      {h}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="bg-surface-900 divide-y divide-surface-800">
                                {msg.content.tableData.rows.map((row, idx) => (
                                  <tr key={idx} className="hover:bg-surface-800/30">
                                    {row.map((cell, cidx) => (
                                      <td key={cidx} className="px-3 py-1.5 text-surface-300 font-medium">
                                        {cell}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Export Action Button */}
                        {msg.content.exportable && msg.content.exportLabel && (
                          <div className="mt-3 pt-2.5 border-t border-surface-800 flex items-center justify-between">
                            <span className="text-[10px] text-surface-500">AI Confidence: {msg.content.confidence || 98}%</span>
                            <button
                              onClick={() => handleTriggerExport(msg.content.exportLabel || 'data')}
                              className="btn-secondary py-1 px-2.5 text-[10px] gap-1 border border-surface-700 bg-surface-800"
                            >
                              <Download size={11} /> {msg.content.exportLabel}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Attachments rendering */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 justify-end">
                          {msg.attachments.map(att => (
                            <div key={att.id} className="bg-surface-900 border border-surface-800 rounded-lg p-2 flex items-center gap-2 max-w-[200px]">
                              <FileText size={14} className="text-brand-500" />
                              <div className="min-w-0 text-left">
                                <p className="text-[10px] font-bold text-surface-300 truncate">{att.name}</p>
                                <p className="text-[9px] text-surface-500">{att.size}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Related local documents tags */}
                      {msg.relatedDocuments && msg.relatedDocuments.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap justify-start">
                          <span className="text-[9px] text-surface-500 uppercase tracking-wider font-bold">Related Documents:</span>
                          {msg.relatedDocuments.map((docId) => {
                            const matched = documents.find(d => d.id === docId)
                            return matched ? (
                              <span key={docId} className="text-[9px] bg-brand-500/10 text-brand-400 border border-brand-500/20 px-2 py-0.5 rounded font-mono font-semibold">
                                {matched.name}
                              </span>
                            ) : null
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex gap-3 max-w-lg">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                      <Bot size={14} className="animate-spin" />
                    </div>
                    <div className="bg-surface-900 border border-surface-800 p-3 rounded-xl flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Inputs & Prompt Helpers */}
              <div className="p-3 border-t border-surface-700 bg-surface-900/10">
                {/* Suggestions panel */}
                {activeConv.messages.length === 1 && (
                  <div className="mb-3 space-y-1.5">
                    <span className="text-[10px] text-surface-500 font-bold uppercase tracking-wider block text-left">Suggested Commands</span>
                    <div className="flex flex-wrap gap-1.5 max-h-[85px] overflow-y-auto">
                      {SUGGESTED_PROMPTS.map(p => (
                        <button
                          key={p.id}
                          onClick={() => handlePromptClick(p.text)}
                          className="bg-surface-900 border border-surface-800 hover:border-surface-700 hover:bg-surface-800 text-surface-300 hover:text-surface-100 rounded-full px-2.5 py-1 text-[10px] transition-all flex items-center gap-1"
                        >
                          <span>{p.icon}</span>
                          <span>{p.text}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input Text Form */}
                <form onSubmit={handleSendMessage} className="space-y-2">
                  {selectedAttachments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 bg-surface-950 p-2 rounded-lg border border-surface-800">
                      {selectedAttachments.map((f, i) => (
                        <div key={i} className="text-[10px] bg-surface-900 border border-surface-800 text-surface-300 rounded px-2 py-0.5 flex items-center gap-1.5">
                          <FileText size={10} className="text-brand-500" />
                          <span className="truncate max-w-[120px]">{f.name}</span>
                          <button
                            type="button"
                            onClick={() => setSelectedAttachments(selectedAttachments.filter((_, idx) => idx !== i))}
                            className="text-surface-500 hover:text-red-400"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 items-end">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 border border-surface-700 bg-surface-900 text-surface-400 hover:text-surface-200 rounded-lg hover:border-surface-600 transition-colors flex-shrink-0"
                      title="Attach documents"
                    >
                      <Paperclip size={16} />
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={handleFileUpload}
                      multiple
                      accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg"
                    />

                    <textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSendMessage()
                        }
                      }}
                      placeholder="Ask the assistant to reconcile, scan duplicates, check disallowed credits, or search compliance databases..."
                      className="input flex-1 resize-none py-2 h-10 min-h-10 max-h-24"
                      rows={1}
                    />

                    <button
                      type="submit"
                      disabled={!inputText.trim() && selectedAttachments.length === 0}
                      className="btn-primary p-2 h-10 flex items-center justify-center flex-shrink-0 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500"
                    >
                      <Send size={15} />
                    </button>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-700 flex items-center justify-center mb-5 shadow-lg">
                <Bot size={28} className="text-white" />
              </div>
              <h3 className="text-base font-semibold text-surface-200 mb-2">No Active AI Assistant Session</h3>
              <p className="text-sm text-surface-500 max-w-sm leading-relaxed mb-6">
                Create a session to execute accounting audits, run local reconciliations, and search regulatory compliance standards.
              </p>
              <button
                onClick={() => createConversation()}
                className="btn-primary px-4 py-2 text-xs flex items-center gap-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500"
              >
                <Sparkles size={13} />
                Open AI Session
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  )

  function renderConvItem(c: typeof conversations[0]) {
    const isActive = c.id === activeConversationId
    const isEditing = c.id === editingConvId

    return (
      <div
        key={c.id}
        onClick={() => !isEditing && setActiveConversation(c.id)}
        className={`group p-2 rounded-lg text-left cursor-pointer transition-all flex items-center justify-between gap-1.5 ${
          isActive
            ? 'bg-brand-500/10 border border-brand-500/30 text-surface-100 shadow-sm font-medium'
            : 'hover:bg-surface-800 text-surface-400 hover:text-surface-200 border border-transparent'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Bot size={13} className={isActive ? 'text-brand-400' : 'text-surface-500'} />
          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={() => {
                if (editTitle.trim()) renameConversation(c.id, editTitle)
                setEditingConvId(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (editTitle.trim()) renameConversation(c.id, editTitle)
                  setEditingConvId(null)
                }
              }}
              className="bg-surface-950 text-xs border border-surface-700 rounded px-1 py-0.5 text-surface-200 w-full outline-none focus:border-brand-500"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="text-[11px] truncate">{c.title}</span>
          )}
        </div>

        {/* Action icons hidden by default, visible on hover */}
        {!isEditing && (
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setEditingConvId(c.id)
                setEditTitle(c.title)
              }}
              className="p-0.5 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-200"
              title="Rename"
            >
              <Edit3 size={10} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                deleteConversation(c.id)
              }}
              className="p-0.5 rounded hover:bg-surface-700 text-surface-400 hover:text-red-400"
              title="Delete"
            >
              <Trash2 size={10} />
            </button>
          </div>
        )}
      </div>
    )
  }
}
