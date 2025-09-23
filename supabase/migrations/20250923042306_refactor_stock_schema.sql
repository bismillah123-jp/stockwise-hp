-- Step 1: Rename the old stock_entries table
ALTER TABLE public.stock_entries RENAME TO deprecated_stock_entries;

-- Step 2: Create a new brands table
CREATE TABLE public.brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for the new brands table
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view brands" ON public.brands FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage brands" ON public.brands FOR ALL USING (auth.role() = 'authenticated');

-- Step 3: Populate the brands table from the existing phone_models table
INSERT INTO public.brands (name)
SELECT DISTINCT brand FROM public.phone_models
ON CONFLICT (name) DO NOTHING;

-- Step 4: Add brand_id to phone_models table
ALTER TABLE public.phone_models
ADD COLUMN brand_id UUID REFERENCES public.brands(id);

-- Step 5: Update the brand_id in phone_models with the correct references
UPDATE public.phone_models pm
SET brand_id = (SELECT id FROM public.brands b WHERE b.name = pm.brand);

-- Step 6: Alter phone_models to make brand_id non-nullable and drop the old brand column
ALTER TABLE public.phone_models
ALTER COLUMN brand_id SET NOT NULL;

ALTER TABLE public.phone_models
DROP COLUMN brand;

-- Step 7: Define the stock status enum type
CREATE TYPE stock_status AS ENUM ('available', 'sold', 'transferred', 'returned');

-- Step 8: Create the new stock_units table
CREATE TABLE public.stock_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    imei TEXT NOT NULL UNIQUE,
    phone_model_id UUID NOT NULL REFERENCES public.phone_models(id),
    location_id UUID NOT NULL REFERENCES public.stock_locations(id),
    status stock_status NOT NULL DEFAULT 'available',
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    transaction_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for the new stock_units table
ALTER TABLE public.stock_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view stock units" ON public.stock_units FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage stock units" ON public.stock_units FOR ALL USING (auth.role() = 'authenticated');

-- Step 9: Create a new stock_transactions table
CREATE TABLE public.stock_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_unit_id UUID NOT NULL REFERENCES public.stock_units(id) ON DELETE CASCADE,
    transaction_type stock_status NOT NULL,
    transaction_date DATE NOT NULL,
    from_location_id UUID REFERENCES public.stock_locations(id),
    to_location_id UUID REFERENCES public.stock_locations(id),
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for the new stock_transactions table
ALTER TABLE public.stock_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view stock transactions" ON public.stock_transactions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert stock transactions" ON public.stock_transactions FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Step 10: Create indexes for better query performance
CREATE INDEX idx_stock_units_imei ON public.stock_units(imei);
CREATE INDEX idx_stock_units_status ON public.stock_units(status);
CREATE INDEX idx_stock_units_entry_date ON public.stock_units(entry_date);
CREATE INDEX idx_stock_transactions_unit_id ON public.stock_transactions(stock_unit_id);
CREATE INDEX idx_stock_transactions_type ON public.stock_transactions(transaction_type);
