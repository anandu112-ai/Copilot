-- Supabase PostgreSQL Schema for CA Copilot Phase 1
-- Run this in your Supabase SQL Editor to set up the database tables.

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Organizations Table
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    registration TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    workspace_type TEXT DEFAULT 'single', -- 'single', 'multi-partner', 'branch', 'department'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 2. Profiles/Users Table (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    mobile TEXT,
    firm_name TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('super_admin', 'partner', 'manager', 'auditor', 'ca', 'article_assistant', 'data_entry_operator', 'read_only', 'user')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'locked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Teams Table
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on teams
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- 4. Organization Members Table (for multi-tenant mapping if needed)
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (organization_id, profile_id)
);

-- Enable RLS on organization_members
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;


-- ─── Automatic Profile Trigger ───────────────────────────────────────────
-- Trigger to automatically create a profile in public.profiles when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    default_org_id UUID;
    firm_name_val TEXT;
    full_name_val TEXT;
    mobile_val TEXT;
BEGIN
    -- Extract metadata from raw_user_meta_data
    firm_name_val := COALESCE(new.raw_user_meta_data->>'firmName', new.raw_user_meta_data->>'firm_name', 'My Firm');
    full_name_val := COALESCE(new.raw_user_meta_data->>'fullName', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
    mobile_val := COALESCE(new.raw_user_meta_data->>'mobile', '');

    -- Create a default organization for the new user if they register a firmName
    INSERT INTO public.organizations (name, email, workspace_type)
    VALUES (firm_name_val, new.email, 'single')
    RETURNING id INTO default_org_id;

    -- Insert into public.profiles
    INSERT INTO public.profiles (id, organization_id, full_name, email, mobile, firm_name, role, status)
    VALUES (
        new.id,
        default_org_id,
        full_name_val,
        new.email,
        mobile_val,
        firm_name_val,
        'super_admin', -- First user creating an org gets super_admin
        'active'
    );

    -- Add member mapping
    INSERT INTO public.organization_members (organization_id, profile_id, role)
    VALUES (default_org_id, new.id, 'super_admin');

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger definition
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ─── Row Level Security (RLS) Policies ───────────────────────────────────

-- Profiles policies
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Organization admins/partners can view all profiles in organization"
    ON public.profiles FOR SELECT
    USING (
        organization_id IN (
            SELECT org_id FROM (
                SELECT organization_id AS org_id FROM public.profiles 
                WHERE id = auth.uid() AND role IN ('super_admin', 'partner', 'manager')
            ) AS member_orgs
        )
    );

CREATE POLICY "Organization admins/partners can update profiles in organization"
    ON public.profiles FOR UPDATE
    USING (
        organization_id IN (
            SELECT org_id FROM (
                SELECT organization_id AS org_id FROM public.profiles 
                WHERE id = auth.uid() AND role IN ('super_admin', 'partner')
            ) AS admin_orgs
        )
    );

-- Organizations policies
CREATE POLICY "Users can view organizations they belong to"
    ON public.organizations FOR SELECT
    USING (
        id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can update their organizations"
    ON public.organizations FOR UPDATE
    USING (
        id IN (
            SELECT organization_id FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('super_admin', 'partner')
        )
    );

-- Teams policies
CREATE POLICY "Users can view teams in their organization"
    ON public.teams FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Managers and above can manage teams"
    ON public.teams FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('super_admin', 'partner', 'manager')
        )
    );
