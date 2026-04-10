
CREATE OR REPLACE FUNCTION public.assign_unit_lead(
  p_unit_id uuid,
  p_membership_id uuid,
  p_contact_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Reset is_lead for all memberships of this unit
  UPDATE unit_contact_memberships
  SET is_lead = false, updated_at = now()
  WHERE unit_id = p_unit_id;

  -- Set the target membership as lead
  UPDATE unit_contact_memberships
  SET is_lead = true, member_role = 'lead', updated_at = now()
  WHERE membership_id = p_membership_id AND unit_id = p_unit_id;

  -- Update the unit's lead_contact_id
  UPDATE miem_units
  SET lead_contact_id = p_contact_id, updated_at = now()
  WHERE unit_id = p_unit_id;
END;
$$;
