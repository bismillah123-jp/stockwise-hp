-- Function to delete a stock unit and its transactions
CREATE OR REPLACE FUNCTION public.delete_stock_unit(p_unit_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- The ON DELETE CASCADE on the stock_transactions table will handle deleting associated transactions.
    DELETE FROM public.stock_units
    WHERE id = p_unit_id;
END;
$$;
