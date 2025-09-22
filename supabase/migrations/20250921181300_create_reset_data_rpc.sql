CREATE OR REPLACE FUNCTION public.reset_all_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'You must be authenticated to perform this action.';
  END IF;

  -- Truncate all relevant tables to reset data
  -- Using CASCADE to handle foreign key dependencies automatically
  -- Using RESTART IDENTITY to reset any auto-incrementing sequences
  TRUNCATE TABLE
    public.stock_entries,
    public.stock_transactions_log,
    public.phone_models
  RESTART IDENTITY CASCADE;
END;
$$;

-- Grant execute permission to the authenticated role
GRANT EXECUTE ON FUNCTION public.reset_all_data() TO authenticated;
