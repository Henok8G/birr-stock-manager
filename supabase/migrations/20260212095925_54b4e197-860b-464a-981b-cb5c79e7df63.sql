
-- Create notes table
CREATE TABLE public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- All authenticated users with roles can view notes
CREATE POLICY "Users with roles can view notes"
ON public.notes FOR SELECT
USING (has_any_role(auth.uid()));

-- Only owners can insert notes
CREATE POLICY "Owners can insert notes"
ON public.notes FOR INSERT
WITH CHECK (has_role(auth.uid(), 'owner'));

-- Only owners can update notes
CREATE POLICY "Owners can update notes"
ON public.notes FOR UPDATE
USING (has_role(auth.uid(), 'owner'));

-- Only owners can delete notes
CREATE POLICY "Owners can delete notes"
ON public.notes FOR DELETE
USING (has_role(auth.uid(), 'owner'));

-- Auto-update updated_at
CREATE TRIGGER update_notes_updated_at
BEFORE UPDATE ON public.notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
