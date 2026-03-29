-- ============================================================================
-- IPD Budget App — Full Database Schema
-- ============================================================================

-- ============================================================================
-- 1. PROFILES (extends auth.users)
-- ============================================================================
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 2. BUSINESS UNITS
-- ============================================================================
CREATE TABLE business_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. OPERATIONAL UNITS
-- ============================================================================
CREATE TABLE operational_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit_id uuid NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
  name text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 4. BUDGET LINES (reference table)
-- ============================================================================
CREATE TABLE budget_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  category text NOT NULL CHECK (category IN ('revenue', 'opex', 'capex')),
  sort_order integer NOT NULL DEFAULT 0
);

-- ============================================================================
-- 5. BUDGET ENTRIES (core data)
-- ============================================================================
CREATE TABLE budget_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operational_unit_id uuid NOT NULL REFERENCES operational_units(id) ON DELETE CASCADE,
  budget_line_id uuid NOT NULL REFERENCES budget_lines(id),
  year integer NOT NULL CHECK (year BETWEEN 2023 AND 2030),
  month integer CHECK (month BETWEEN 1 AND 12),
  amount bigint NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'computed' CHECK (source IN ('computed', 'manual', 'imported')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  UNIQUE(operational_unit_id, budget_line_id, year, month)
);

CREATE INDEX idx_budget_entries_year ON budget_entries(year);
CREATE INDEX idx_budget_entries_unit ON budget_entries(operational_unit_id);
CREATE INDEX idx_budget_entries_line ON budget_entries(budget_line_id);

-- ============================================================================
-- 6. HISTORICAL ENTRIES (consolidated historical data)
-- ============================================================================
CREATE TABLE historical_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_line_id uuid NOT NULL REFERENCES budget_lines(id),
  year text NOT NULL,
  amount bigint NOT NULL DEFAULT 0,
  UNIQUE(budget_line_id, year)
);

-- ============================================================================
-- 7. SCENARIOS
-- ============================================================================
CREATE TABLE scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_base boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 8. SCENARIO OVERRIDES
-- ============================================================================
CREATE TABLE scenario_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id uuid NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  operational_unit_id uuid NOT NULL REFERENCES operational_units(id),
  budget_line_id uuid NOT NULL REFERENCES budget_lines(id),
  year integer NOT NULL,
  amount bigint NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(scenario_id, operational_unit_id, budget_line_id, year)
);

-- ============================================================================
-- 9. USER BU PERMISSIONS
-- ============================================================================
CREATE TABLE user_bu_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_unit_id uuid NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
  access_level text NOT NULL DEFAULT 'read' CHECK (access_level IN ('read', 'write')),
  granted_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, business_unit_id)
);

-- ============================================================================
-- 10. HELPER FUNCTIONS FOR RLS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.user_role()
RETURNS text AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.user_has_bu_access(bu_id uuid, required_level text DEFAULT 'read')
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM public.user_bu_permissions
    WHERE user_id = auth.uid()
      AND business_unit_id = bu_id
      AND (required_level = 'read' OR access_level = 'write')
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- 11. ROW LEVEL SECURITY
-- ============================================================================

-- PROFILES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT TO authenticated WITH CHECK (public.user_role() = 'admin');

CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE TO authenticated USING (public.user_role() = 'admin');

CREATE POLICY "profiles_delete" ON profiles
  FOR DELETE TO authenticated USING (public.user_role() = 'admin');

-- BUSINESS UNITS
ALTER TABLE business_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bu_select" ON business_units
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "bu_modify" ON business_units
  FOR ALL TO authenticated USING (public.user_role() = 'admin');

-- OPERATIONAL UNITS
ALTER TABLE operational_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ou_select" ON operational_units
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "ou_modify" ON operational_units
  FOR ALL TO authenticated USING (public.user_role() = 'admin');

-- BUDGET LINES
ALTER TABLE budget_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bl_select" ON budget_lines
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "bl_modify" ON budget_lines
  FOR ALL TO authenticated USING (public.user_role() = 'admin');

-- BUDGET ENTRIES
ALTER TABLE budget_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "be_select" ON budget_entries
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "be_insert" ON budget_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_has_bu_access(
      (SELECT ou.business_unit_id FROM operational_units ou WHERE ou.id = operational_unit_id),
      'write'
    )
  );

CREATE POLICY "be_update" ON budget_entries
  FOR UPDATE TO authenticated
  USING (
    public.user_has_bu_access(
      (SELECT ou.business_unit_id FROM operational_units ou WHERE ou.id = operational_unit_id),
      'write'
    )
  );

-- HISTORICAL ENTRIES
ALTER TABLE historical_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "he_select" ON historical_entries
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "he_modify" ON historical_entries
  FOR ALL TO authenticated USING (public.user_role() = 'admin');

-- SCENARIOS
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sc_select" ON scenarios
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "sc_insert" ON scenarios
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "sc_update" ON scenarios
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.user_role() = 'admin');

CREATE POLICY "sc_delete" ON scenarios
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.user_role() = 'admin');

-- SCENARIO OVERRIDES
ALTER TABLE scenario_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "so_select" ON scenario_overrides
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "so_insert" ON scenario_overrides
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "so_update" ON scenario_overrides
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.user_role() = 'admin');

CREATE POLICY "so_delete" ON scenario_overrides
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.user_role() = 'admin');

-- USER BU PERMISSIONS
ALTER TABLE user_bu_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ubp_select_own" ON user_bu_permissions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.user_role() = 'admin');

CREATE POLICY "ubp_modify" ON user_bu_permissions
  FOR ALL TO authenticated USING (public.user_role() = 'admin');
