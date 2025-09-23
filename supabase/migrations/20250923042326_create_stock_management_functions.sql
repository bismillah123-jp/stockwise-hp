-- Function to add a new brand
CREATE OR REPLACE FUNCTION public.add_brand(p_brand_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_brand_id UUID;
BEGIN
    INSERT INTO public.brands (name)
    VALUES (p_brand_name)
    RETURNING id INTO new_brand_id;
    RETURN new_brand_id;
END;
$$;

-- Function to get all brands
CREATE OR REPLACE FUNCTION public.get_brands()
RETURNS TABLE (id UUID, name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY SELECT b.id, b.name FROM public.brands b ORDER BY b.name;
END;
$$;

-- Function to add a new stock unit
CREATE OR REPLACE FUNCTION public.add_stock_unit(
    p_imei TEXT,
    p_phone_model_id UUID,
    p_location_id UUID,
    p_entry_date DATE,
    p_notes TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_unit_id UUID;
BEGIN
    INSERT INTO public.stock_units (imei, phone_model_id, location_id, entry_date, notes)
    VALUES (p_imei, p_phone_model_id, p_location_id, p_entry_date, p_notes)
    RETURNING id INTO new_unit_id;

    INSERT INTO public.stock_transactions (stock_unit_id, transaction_type, transaction_date, to_location_id, notes)
    VALUES (new_unit_id, 'available', p_entry_date, p_location_id, 'Initial stock entry');

    RETURN new_unit_id;
END;
$$;

-- Function to sell a stock unit
CREATE OR REPLACE FUNCTION public.sell_stock_unit(
    p_imei TEXT,
    p_sell_date DATE,
    p_notes TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_unit_id UUID;
    v_location_id UUID;
BEGIN
    SELECT id, location_id INTO v_unit_id, v_location_id
    FROM public.stock_units
    WHERE imei = p_imei;

    IF v_unit_id IS NULL THEN
        RAISE EXCEPTION 'Unit with IMEI % not found', p_imei;
    END IF;

    UPDATE public.stock_units
    SET status = 'sold', transaction_date = p_sell_date, notes = p_notes, updated_at = now()
    WHERE id = v_unit_id;

    INSERT INTO public.stock_transactions (stock_unit_id, transaction_type, transaction_date, from_location_id, notes)
    VALUES (v_unit_id, 'sold', p_sell_date, v_location_id, p_notes);
END;
$$;

-- Function to transfer a stock unit
CREATE OR REPLACE FUNCTION public.transfer_stock_unit(
    p_imei TEXT,
    p_new_location_id UUID,
    p_transfer_date DATE,
    p_notes TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_unit_id UUID;
    v_from_location_id UUID;
BEGIN
    SELECT id, location_id INTO v_unit_id, v_from_location_id
    FROM public.stock_units
    WHERE imei = p_imei;

    IF v_unit_id IS NULL THEN
        RAISE EXCEPTION 'Unit with IMEI % not found', p_imei;
    END IF;

    -- Update the unit's current location and transaction date
    UPDATE public.stock_units
    SET location_id = p_new_location_id, transaction_date = p_transfer_date, notes = p_notes, updated_at = now()
    WHERE id = v_unit_id;

    -- Log the transfer transaction
    INSERT INTO public.stock_transactions (stock_unit_id, transaction_type, transaction_date, from_location_id, to_location_id, notes)
    VALUES (v_unit_id, 'transferred', p_transfer_date, v_from_location_id, p_new_location_id, p_notes);
END;
$$;


-- The core function to get stock for a specific date and location
CREATE OR REPLACE FUNCTION public.get_stock_by_date(
    p_report_date DATE,
    p_location_id UUID
)
RETURNS TABLE (
    id UUID,
    imei TEXT,
    phone_model_id UUID,
    location_id UUID,
    status stock_status,
    entry_date DATE,
    transaction_date DATE,
    notes TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    WITH daily_statuses AS (
        -- For each unit, find the last transaction on or before the report date
        SELECT
            su.id,
            su.imei,
            su.phone_model_id,
            t.to_location_id as current_location_id,
            t.transaction_type as current_status,
            su.entry_date,
            t.transaction_date
        FROM public.stock_units su
        JOIN (
            SELECT
                stock_unit_id,
                transaction_type,
                transaction_date,
                to_location_id,
                -- Get the latest transaction for each unit on or before the report date
                ROW_NUMBER() OVER(PARTITION BY stock_unit_id ORDER BY transaction_date DESC, created_at DESC) as rn
            FROM public.stock_transactions
            WHERE transaction_date <= p_report_date
        ) t ON su.id = t.stock_unit_id
        WHERE t.rn = 1
    )
    -- Filter for units that are available at the specified location
    SELECT
        ds.id,
        ds.imei,
        ds.phone_model_id,
        ds.current_location_id AS location_id,
        ds.current_status AS status,
        ds.entry_date,
        ds.transaction_date,
        su.notes
    FROM daily_statuses ds
    JOIN public.stock_units su ON ds.id = su.id
    WHERE ds.current_location_id = p_location_id
      AND ds.current_status = 'available';
END;
$$;
