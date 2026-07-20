import { create } from 'zustand'
import type { ChatConversation, ChatMessage, SessionContext, SuggestedPrompt } from '../types/chat'

// --- Rich Mock Conversations ---

const mockConversations: ChatConversation[] = [
  {
    id: 'conv-1',
    title: 'GST Blocked Credit Check',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    pinned: true,
    context: {
      clientId: 'client-1',
      clientName: 'Apex Steel Industries Pvt Ltd',
      financialYear: '2026-27',
      assessmentYear: '2027-28',
      activeDocuments: ['doc-1', 'doc-4'],
      preferredExportFormat: 'Excel'
    },
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        content: { text: 'Find duplicate invoices or blocked credits in the uploaded files.' },
        status: 'complete',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        attachments: [],
        relatedDocuments: []
      },
      {
        id: 'msg-2',
        role: 'assistant',
        status: 'complete',
        timestamp: new Date(Date.now() - 3600000 * 1.9).toISOString(),
        attachments: [],
        relatedDocuments: ['doc-1', 'doc-4'],
        content: {
          text: `I have analyzed 4 uploaded documents for **Apex Steel Industries Pvt Ltd**.

### Key Findings:
1. **Critical Audit Alert**: Found a potential blocked credit purchase under **Section 17(5)** of the CGST Act.
2. **Duplicate Entry Check**: Found 1 exact duplicate invoice booked in Tally.

Here is the breakdown of findings:`,
          tableData: {
            headers: ['Category', 'Details', 'Value (INR)', 'Risk Level', 'Recommendation'],
            rows: [
              ['Blocked Credit (17(5))', 'Toyota Innova Purchase (INV-982181) CGST/SGST claimed', '2,38,000.00', 'Critical', 'Reverse claimed ITC in GSTR-3B'],
              ['Duplicate Purchase', 'Om Packaging double voucher entry (INV-441028)', '53,100.00', 'High', 'Delete redundant voucher PV-2026-419']
            ]
          },
          exportable: true,
          exportType: 'Excel',
          exportLabel: 'Export Audit Observations',
          findings: 2,
          confidence: 98
        }
      }
    ]
  },
  {
    id: 'conv-2',
    title: 'GSTR-2B vs Purchase Register',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 23).toISOString(),
    pinned: false,
    context: {
      clientId: 'client-1',
      clientName: 'Apex Steel Industries Pvt Ltd',
      financialYear: '2026-27',
      activeDocuments: ['doc-4']
    },
    messages: [
      {
        id: 'msg-3',
        role: 'user',
        content: { text: 'Compare GSTR-2B with my purchase register.' },
        status: 'complete',
        timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
        attachments: [],
        relatedDocuments: []
      },
      {
        id: 'msg-4',
        role: 'assistant',
        status: 'complete',
        timestamp: new Date(Date.now() - 3600000 * 23.9).toISOString(),
        attachments: [],
        relatedDocuments: ['doc-4'],
        content: {
          text: `Comparing GSTR-2B with the Purchase Register of **Apex Steel Industries Pvt Ltd** revealed **3 discrepancies** totaling **₹23,500.00** in tax difference.

### Reconciliation Highlights:`,
          tableData: {
            headers: ['Invoice No', 'Vendor', 'Type of Mismatch', 'Purchase Reg', 'GSTR-2B Portal', 'Difference'],
            rows: [
              ['INV-2026-8941', 'Apex Steel Industries', 'Amount Mismatch', '₹27,000.00 GST', '₹26,000.00 GST', '₹1,000.00'],
              ['MS-55102', 'Max Software Solutions', 'Missing in GSTR-2B', '₹22,500.00 GST', '₹0.00 GST', '₹22,500.00'],
              ['PO-INVALID-929', 'Unknown Vendor', 'Invalid GSTIN format', '₹15,300.00 GST', '₹15,300.00 GST', '₹0.00 (Flagged)']
            ]
          },
          exportable: true,
          exportType: 'Excel',
          exportLabel: 'Export GST Mismatch Report',
          findings: 3,
          confidence: 99
        }
      }
    ]
  }
]

// --- Zustand Store ---

interface ChatStore {
  conversations: ChatConversation[]
  activeConversationId: string | null
  isTyping: boolean
  currentContext: SessionContext

  // Actions
  setActiveConversation: (id: string | null) => void
  createConversation: (title?: string) => void
  deleteConversation: (id: string) => void
  addMessage: (conversationId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  setIsTyping: (v: boolean) => void
  updateContext: (updates: Partial<SessionContext>) => void
  pinConversation: (id: string) => void
  renameConversation: (id: string, newTitle: string) => void

  // Derived
  getActiveConversation: () => ChatConversation | undefined
}

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: mockConversations,
  activeConversationId: 'conv-1',
  isTyping: false,
  currentContext: {
    clientId: 'client-1',
    clientName: 'Apex Steel Industries Pvt Ltd',
    financialYear: '2026-27',
    activeDocuments: []
  },

  setActiveConversation: (id) => set({ activeConversationId: id }),

  createConversation: (title) => {
    const newConv: ChatConversation = {
      id: `conv-${Date.now()}`,
      title: title || 'New Assistant Chat',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pinned: false,
      context: { ...get().currentContext },
      messages: [
        {
          id: `msg-${Date.now()}-welcome`,
          role: 'assistant',
          content: {
            text: `Hello! I am your **CA Copilot Assistant**. I function as your virtual junior Chartered Accountant.

I can help you:
- Find anomalies and compliance warnings (GST mismatches, duplicate vouchers, Section 40A(3) violations).
- Compare ledgers, registers, and bank statements.
- Retrieve local regulatory tax compliance citations.
- Generate structured summaries or export files.

How can I help you today?`
          },
          status: 'complete',
          timestamp: new Date().toISOString(),
          attachments: [],
          relatedDocuments: []
        }
      ]
    }
    set((state) => ({
      conversations: [newConv, ...state.conversations],
      activeConversationId: newConv.id
    }))
  },

  deleteConversation: (id) =>
    set((state) => {
      const remaining = state.conversations.filter((c) => c.id !== id)
      let nextActive = state.activeConversationId
      if (state.activeConversationId === id) {
        nextActive = remaining.length > 0 ? remaining[0].id : null
      }
      return { conversations: remaining, activeConversationId: nextActive }
    }),

  addMessage: (conversationId, message) =>
    set((state) => {
      const timestamp = new Date().toISOString()
      const newMsg: ChatMessage = {
        ...message,
        id: `msg-${Date.now()}`,
        timestamp
      }
      return {
        conversations: state.conversations.map((c) => {
          if (c.id === conversationId) {
            return {
              ...c,
              messages: [...c.messages, newMsg],
              updatedAt: timestamp
            }
          }
          return c
        })
      }
    }),

  setIsTyping: (v) => set({ isTyping: v }),

  updateContext: (updates) =>
    set((state) => ({
      currentContext: { ...state.currentContext, ...updates }
    })),

  pinConversation: (id) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, pinned: !c.pinned } : c
      )
    })),

  renameConversation: (id, newTitle) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, title: newTitle } : c
      )
    })),

  getActiveConversation: () => {
    const { conversations, activeConversationId } = get()
    return conversations.find((c) => c.id === activeConversationId)
  }
}))
