-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('owner', 'manager');

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user has any role (owner or manager)
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
  )
$$;

-- RLS policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS policies for user_roles (only users with roles can view roles)
CREATE POLICY "Users with roles can view roles"
ON public.user_roles
FOR SELECT
USING (public.has_any_role(auth.uid()));

-- Create trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update trigger for profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update existing table policies to require authentication with roles
-- Products: Only authenticated users with roles can access
DROP POLICY IF EXISTS "Anyone can view products" ON public.products;
DROP POLICY IF EXISTS "Anyone can insert products" ON public.products;
DROP POLICY IF EXISTS "Anyone can update products" ON public.products;
DROP POLICY IF EXISTS "Anyone can delete products" ON public.products;

CREATE POLICY "Authenticated users with roles can view products"
ON public.products FOR SELECT
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Authenticated users with roles can insert products"
ON public.products FOR INSERT
WITH CHECK (public.has_any_role(auth.uid()));

CREATE POLICY "Authenticated users with roles can update products"
ON public.products FOR UPDATE
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Authenticated users with roles can delete products"
ON public.products FOR DELETE
USING (public.has_any_role(auth.uid()));

-- Sales: Only authenticated users with roles can access
DROP POLICY IF EXISTS "Anyone can view sales" ON public.sales;
DROP POLICY IF EXISTS "Anyone can insert sales" ON public.sales;
DROP POLICY IF EXISTS "Anyone can update sales" ON public.sales;

CREATE POLICY "Authenticated users with roles can view sales"
ON public.sales FOR SELECT
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Authenticated users with roles can insert sales"
ON public.sales FOR INSERT
WITH CHECK (public.has_any_role(auth.uid()));

CREATE POLICY "Authenticated users with roles can update sales"
ON public.sales FOR UPDATE
USING (public.has_any_role(auth.uid()));

-- Sale items: Only authenticated users with roles can access
DROP POLICY IF EXISTS "Anyone can view sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Anyone can insert sale_items" ON public.sale_items;

CREATE POLICY "Authenticated users with roles can view sale_items"
ON public.sale_items FOR SELECT
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Authenticated users with roles can insert sale_items"
ON public.sale_items FOR INSERT
WITH CHECK (public.has_any_role(auth.uid()));

-- Stock entries: Only authenticated users with roles can access
DROP POLICY IF EXISTS "Anyone can view stock_entries" ON public.stock_entries;
DROP POLICY IF EXISTS "Anyone can insert stock_entries" ON public.stock_entries;

CREATE POLICY "Authenticated users with roles can view stock_entries"
ON public.stock_entries FOR SELECT
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Authenticated users with roles can insert stock_entries"
ON public.stock_entries FOR INSERT
WITH CHECK (public.has_any_role(auth.uid()));

-- Audit logs: Only authenticated users with roles can access
DROP POLICY IF EXISTS "Anyone can view audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Anyone can insert audit_logs" ON public.audit_logs;

CREATE POLICY "Authenticated users with roles can view audit_logs"
ON public.audit_logs FOR SELECT
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Authenticated users with roles can insert audit_logs"
ON public.audit_logs FOR INSERT
WITH CHECK (public.has_any_role(auth.uid()));