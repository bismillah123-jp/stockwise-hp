-- Grant execute permissions on the new functions to the authenticated role
GRANT EXECUTE ON FUNCTION public.add_brand(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_brands() TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_stock_unit(text, uuid, uuid, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sell_stock_unit(text, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_stock_unit(text, uuid, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_stock_by_date(date, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_stock_unit(uuid) TO authenticated;
