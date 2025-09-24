-- Update the date range availability function to include unapproved ads
CREATE OR REPLACE FUNCTION is_date_range_available(
  p_start_date DATE,
  p_end_date DATE,
  p_exclude_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if any ads (approved or unapproved) overlap with the requested date range
  RETURN NOT EXISTS (
    SELECT 1 FROM ad_slots
    WHERE is_active = true
      AND (p_exclude_id IS NULL OR id != p_exclude_id)
      AND (
        (start_date <= p_start_date AND end_date >= p_start_date) OR
        (start_date <= p_end_date AND end_date >= p_end_date) OR
        (start_date >= p_start_date AND end_date <= p_end_date)
      )
  );
END;
$$;

-- Update the featured spot availability function to include unapproved ads
CREATE OR REPLACE FUNCTION is_featured_spot_available(
  p_spot_number INTEGER,
  p_start_date DATE,
  p_end_date DATE,
  p_exclude_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if the specific spot is available for the date range (including unapproved ads)
  RETURN NOT EXISTS (
    SELECT 1 FROM featured_ads
    WHERE spot_number = p_spot_number
      AND is_active = true
      AND (p_exclude_id IS NULL OR id != p_exclude_id)
      AND (
        (start_date <= p_start_date AND end_date >= p_start_date) OR
        (start_date <= p_end_date AND end_date >= p_end_date) OR
        (start_date >= p_start_date AND end_date <= p_end_date)
      )
  );
END;
$$;
