-- Add approval columns to profiles
ALTER TABLE public.profiles 
  ADD COLUMN approved boolean NOT NULL DEFAULT false,
  ADD COLUMN approved_by uuid,
  ADD COLUMN approved_at timestamptz;

-- Mark all existing profiles as approved so current users keep access
UPDATE public.profiles SET approved = true, approved_at = now();