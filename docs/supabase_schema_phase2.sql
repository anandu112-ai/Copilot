-- Supabase PostgreSQL Schema for CA Copilot Phase 2
-- Run this in your Supabase SQL Editor to append Phase 2 normalized tables.

-- 1. Branches Table (If not already created)
CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    address TEXT,
    phone TEXT,
    version_number INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- 2. Companies Table
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL, -- references public.clients(id) created in Phase 1
    legal_name TEXT NOT NULL,
    cin VARCHAR(21),
    date_of_incorporation DATE,
    registered_address TEXT,
    version_number INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 3. Projects Table
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL,
    title TEXT NOT NULL,
    project_type TEXT NOT NULL, -- 'audit', 'tax_compliance', 'gst_return', 'bookkeeping'
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'review', 'completed')),
    assigned_lead_id UUID REFERENCES public.profiles(id),
    start_date DATE,
    due_date DATE,
    completed_at TIMESTAMP WITH TIME ZONE,
    version_number INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 4. Documents Table (If not already created)
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_type TEXT,
    category TEXT CHECK (category IN ('bank_statement', 'gst_file', 'audit_file', 'invoice', 'report', 'image', 'other')),
    storage_path TEXT NOT NULL,
    checksum TEXT,
    status TEXT DEFAULT 'pending',
    version_number INTEGER DEFAULT 1 NOT NULL,
    uploaded_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- 5. OCR Results Table
CREATE TABLE IF NOT EXISTS public.ocr_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    engine TEXT DEFAULT 'tesseract',
    extracted_text TEXT NOT NULL,
    confidence_score REAL,
    processing_time_ms INTEGER,
    version_number INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.ocr_results ENABLE ROW LEVEL SECURITY;

-- 6. Invoices Table
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    invoice_number TEXT,
    invoice_date DATE,
    vendor_name TEXT,
    customer_name TEXT,
    taxable_amount NUMERIC(15, 2),
    gst_amount NUMERIC(15, 2),
    total_amount NUMERIC(15, 2),
    version_number INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- 7. Bank Statements Table
CREATE TABLE IF NOT EXISTS public.bank_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    account_number TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    start_date DATE,
    end_date DATE,
    version_number INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.bank_statements ENABLE ROW LEVEL SECURITY;

-- 8. Ledger Entries Table
CREATE TABLE IF NOT EXISTS public.ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL,
    voucher_number TEXT NOT NULL,
    ledger_name TEXT NOT NULL,
    txn_date DATE NOT NULL,
    debit NUMERIC(15, 2) DEFAULT 0.00,
    credit NUMERIC(15, 2) DEFAULT 0.00,
    narration TEXT,
    version_number INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

-- 9. GST Returns Table
CREATE TABLE IF NOT EXISTS public.gst_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL,
    gstin VARCHAR(15) NOT NULL,
    return_period VARCHAR(7) NOT NULL, -- e.g. "07-2026"
    return_type VARCHAR(10) NOT NULL, -- 'GSTR-1', 'GSTR-3B', 'GSTR-2B'
    taxable_value NUMERIC(15, 2) NOT NULL,
    tax_amount NUMERIC(15, 2) NOT NULL,
    version_number INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.gst_returns ENABLE ROW LEVEL SECURITY;

-- 10. Audit Reports Table
CREATE TABLE IF NOT EXISTS public.audit_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL,
    document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    opinion TEXT, -- 'unmodified', 'qualified', 'adverse', 'disclaimer'
    financial_year VARCHAR(9),
    version_number INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.audit_reports ENABLE ROW LEVEL SECURITY;

-- 11. Tasks Table (If not already created)
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_date DATE,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'review', 'completed')),
    assigned_to UUID REFERENCES public.profiles(id),
    version_number INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 12. Comments Table (If not already created)
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    attachment_path TEXT,
    is_internal BOOLEAN DEFAULT true,
    version_number INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- 13. Notifications Table (If not already created)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    read BOOLEAN DEFAULT false,
    version_number INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 14. Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    plan_name TEXT NOT NULL, -- 'trial', 'professional', 'enterprise'
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'cancelled', 'expired')),
    expires_at TIMESTAMP WITH TIME ZONE,
    max_users INTEGER DEFAULT 5,
    version_number INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 15. Device Registry Table (If not already created)
CREATE TABLE IF NOT EXISTS public.device_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    device_name TEXT,
    os_type TEXT,
    app_version TEXT,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.device_registry ENABLE ROW LEVEL SECURITY;

-- 16. System Settings Table (If not already created)
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    version_number INTEGER DEFAULT 1 NOT NULL,
    updated_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE (organization_id, key)
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;


-- ─── Database Indexes for Query Optimization ─────────────────────────────
CREATE INDEX IF NOT EXISTS idx_branches_org ON public.branches(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_org ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_org ON public.clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_companies_client ON public.companies(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_client ON public.projects(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_proj ON public.documents(project_id);
CREATE INDEX IF NOT EXISTS idx_ocr_results_doc ON public.ocr_results(document_id);
CREATE INDEX IF NOT EXISTS idx_invoices_doc ON public.invoices(document_id);
CREATE INDEX IF NOT EXISTS idx_bank_statements_client ON public.bank_statements(client_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_client ON public.ledger_entries(client_id);
CREATE INDEX IF NOT EXISTS idx_gst_returns_client ON public.gst_returns(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_comments_task ON public.comments(task_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_system_settings_org ON public.system_settings(organization_id);


-- ─── Row Level Security (RLS) Policies for Phase 2 ──────────────────────────

-- Branches Policies
CREATE POLICY "Users can select branches in their organization"
    ON public.branches FOR SELECT
    USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Partners/Admins can modify branches in their organization"
    ON public.branches FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('super_admin', 'partner')
    ));

-- Clients Policies
CREATE POLICY "Employees can select clients in their organization"
    ON public.clients FOR SELECT
    USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Partners/Admins can modify clients in their organization"
    ON public.clients FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('super_admin', 'partner')
    ));

-- Documents Policies
CREATE POLICY "Employees can select documents in their organization"
    ON public.documents FOR SELECT
    USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Employees can upload/insert documents in their organization"
    ON public.documents FOR INSERT
    WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Employees can update documents in their organization"
    ON public.documents FOR UPDATE
    USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Partners/Admins can delete documents in their organization"
    ON public.documents FOR DELETE
    USING (organization_id IN (
        SELECT organization_id FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('super_admin', 'partner')
    ));
