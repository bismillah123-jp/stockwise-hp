create or replace function transfer_stock(
  from_location_id uuid,
  to_location_id uuid,
  p_phone_model_id uuid,
  p_quantity integer,
  p_notes text
)
returns void as $$
declare
  from_entry_id uuid;
  to_entry_id uuid;
  today date := current_date;
begin
  -- Decrement stock from the 'from' location
  -- We'll treat a transfer out as 'sold' for simplicity
  update stock_entries
  set
    sold = sold + p_quantity,
    notes = concat(notes, E'\n', 'Transfer Out: ', p_quantity, ' to ', (select name from stock_locations where id = to_location_id), '. Notes: ', p_notes)
  where
    date = today and
    location_id = from_location_id and
    phone_model_id = p_phone_model_id;

  -- Check if an entry exists for the 'to' location
  select id into to_entry_id
  from stock_entries
  where
    date = today and
    location_id = to_location_id and
    phone_model_id = p_phone_model_id;

  if found then
    -- Increment stock at the 'to' location
    update stock_entries
    set
      incoming = incoming + p_quantity,
      notes = concat(notes, E'\n', 'Transfer In: ', p_quantity, ' from ', (select name from stock_locations where id = from_location_id), '. Notes: ', p_notes)
    where
      id = to_entry_id;
  else
    -- Create a new entry for the 'to' location if it doesn't exist
    insert into stock_entries (date, location_id, phone_model_id, incoming, notes, morning_stock, night_stock, add_stock, returns, sold, adjustment)
    values (today, to_location_id, p_phone_model_id, p_quantity, concat('Transfer In: ', p_quantity, ' from ', (select name from stock_locations where id = from_location_id), '. Notes: ', p_notes), 0, 0, 0, 0, 0, 0);
  end if;

end;
$$ language plpgsql;
