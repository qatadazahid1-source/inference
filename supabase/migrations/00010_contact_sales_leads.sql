-- Create sales_leads table for contact sales form submissions
CREATE TABLE IF NOT EXISTS public.sales_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    company TEXT,
    employees TEXT,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'closed', 'junk')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.sales_leads ENABLE ROW LEVEL SECURITY;

-- Admins can read all leads
CREATE POLICY "Admins can view all sales leads"
    ON public.sales_leads
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.system_role = 'admin'
        )
    );

-- Admins can update leads
CREATE POLICY "Admins can update sales leads"
    ON public.sales_leads
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.system_role = 'admin'
        )
    );

-- Anyone (including anonymous) can insert leads (via backend API which will bypass RLS, or directly if we allow anon inserts)
-- Since we are doing it via a public backend API, we don't necessarily need a public INSERT policy if the backend uses the service role key.
-- But just in case, we can keep it strict. The backend will use the service role key.

-- Add updated_at trigger
CREATE TRIGGER update_sales_leads_updated_at
    BEFORE UPDATE ON public.sales_leads
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
