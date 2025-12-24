-- PostgreSQL stored procedure for atomic card draw
-- Implements the atomic draw operation per research.md section 7

CREATE OR REPLACE FUNCTION draw_card(
  p_user_id UUID,
  p_drawn_rarity rarity_tier
) RETURNS JSONB AS $$
DECLARE
  v_ticket_balance INTEGER;
  v_card RECORD;
  v_collection_id UUID;
BEGIN
  -- 1. Regenerate tickets (lazy calculation)
  -- Note: This is implemented in application layer before calling this function
  -- The application calls regenerate_tickets() and updates ticket_balances before calling draw_card
  
  -- 2. Check and decrement ticket (row-level lock)
  UPDATE ticket_balances
  SET 
    current_tickets = current_tickets - 1,
    updated_at = now()
  WHERE user_id = p_user_id AND current_tickets > 0
  RETURNING current_tickets INTO v_ticket_balance;
  
  IF v_ticket_balance IS NULL THEN
    RAISE EXCEPTION 'Insufficient tickets' USING ERRCODE = 'check_violation';
  END IF;
  
  -- 3. Select random card from pool (server-side RNG)
  -- Rarity already determined by application layer RNG
  SELECT * INTO v_card
  FROM cards
  WHERE rarity = p_drawn_rarity
  ORDER BY RANDOM()  -- PostgreSQL RANDOM() for card selection within rarity
  LIMIT 1;
  
  IF v_card IS NULL THEN
    RAISE EXCEPTION 'No cards available for rarity: %', p_drawn_rarity
      USING ERRCODE = 'data_exception';
  END IF;
  
  -- 4. Grant card to user
  INSERT INTO user_collections (user_id, card_id, acquired_at, source)
  VALUES (p_user_id, v_card.id, now(), 'draw')
  RETURNING id INTO v_collection_id;
  
  -- 5. Log transaction
  INSERT INTO draw_transactions (id, user_id, card_id, rarity, ticket_cost, created_at)
  VALUES (v_collection_id, p_user_id, v_card.id, p_drawn_rarity, 1, now());
  
  -- 6. Return result
  RETURN jsonb_build_object(
    'transaction_id', v_collection_id,
    'card', row_to_json(v_card),
    'remaining_tickets', v_ticket_balance,
    'rarity_rolled', p_drawn_rarity
  );
  
  -- Automatic COMMIT on success, ROLLBACK on exception
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function for ticket regeneration (lazy calculation)
CREATE OR REPLACE FUNCTION regenerate_tickets(
  p_user_id UUID
) RETURNS ticket_balances AS $$
DECLARE
  v_balance ticket_balances;
  v_now TIMESTAMPTZ;
  v_elapsed INTERVAL;
  v_intervals INTEGER;
  v_new_tickets INTEGER;
BEGIN
  SELECT * INTO v_balance
  FROM ticket_balances
  WHERE user_id = p_user_id
  FOR UPDATE;  -- Lock row for update
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket balance not found for user: %', p_user_id;
  END IF;
  
  v_now := now();
  v_elapsed := v_now - v_balance.last_regen_at;
  
  -- Calculate number of 2-hour intervals elapsed
  v_intervals := EXTRACT(EPOCH FROM v_elapsed) / (2 * 60 * 60);  -- 2 hours in seconds
  
  IF v_intervals < 1 THEN
    -- No regeneration needed
    RETURN v_balance;
  END IF;
  
  -- Add tickets (capped at max_tickets)
  v_new_tickets := LEAST(
    v_balance.max_tickets,
    v_balance.current_tickets + v_intervals::INTEGER
  );
  
  -- Update balance
  UPDATE ticket_balances
  SET 
    current_tickets = v_new_tickets,
    last_regen_at = v_balance.last_regen_at + (v_intervals * INTERVAL '2 hours'),
    updated_at = v_now
  WHERE user_id = p_user_id
  RETURNING * INTO v_balance;
  
  RETURN v_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cards_rarity_random ON cards(rarity) WHERE true;  -- Helps random selection within rarity

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION draw_card(UUID, rarity_tier) TO authenticated;
GRANT EXECUTE ON FUNCTION regenerate_tickets(UUID) TO authenticated;
