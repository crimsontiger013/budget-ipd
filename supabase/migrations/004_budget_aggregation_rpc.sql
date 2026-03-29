-- ============================================================================
-- Budget Aggregation RPC Functions
-- Replaces client-side pagination + JS aggregation with server-side SQL
-- ============================================================================

-- Covering composite index for all three functions
CREATE INDEX IF NOT EXISTS idx_budget_entries_composite
  ON budget_entries(operational_unit_id, budget_line_id, year, month)
  INCLUDE (amount);

-- ============================================================================
-- 1. get_consolidated_budget()
-- Returns: { year: { lineName: { total: number, monthly: number[12] } } }
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_consolidated_budget()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  result jsonb;
BEGIN
  WITH annual_totals AS (
    SELECT
      be.year::text AS yr,
      bl.name AS line_name,
      SUM(be.amount) AS total
    FROM budget_entries be
    JOIN budget_lines bl ON bl.id = be.budget_line_id
    WHERE be.month IS NULL
    GROUP BY be.year, bl.name
  ),
  monthly_totals AS (
    SELECT
      be.year::text AS yr,
      bl.name AS line_name,
      be.month,
      SUM(be.amount) AS amt
    FROM budget_entries be
    JOIN budget_lines bl ON bl.id = be.budget_line_id
    WHERE be.month IS NOT NULL
    GROUP BY be.year, bl.name, be.month
  ),
  line_objects AS (
    SELECT
      a.yr,
      a.line_name,
      jsonb_build_object(
        'total', a.total,
        'monthly', (
          SELECT jsonb_agg(COALESCE(m.amt, 0) ORDER BY g.n)
          FROM generate_series(1, 12) g(n)
          LEFT JOIN monthly_totals m ON m.yr = a.yr AND m.line_name = a.line_name AND m.month = g.n
        )
      ) AS obj
    FROM annual_totals a
  ),
  year_objects AS (
    SELECT
      lo.yr,
      jsonb_object_agg(lo.line_name, lo.obj) AS lines
    FROM line_objects lo
    GROUP BY lo.yr
  )
  SELECT COALESCE(jsonb_object_agg(yr, lines), '{}'::jsonb)
  INTO result
  FROM year_objects;

  RETURN result;
END;
$$;

-- ============================================================================
-- 2. get_unit_budgets()
-- Returns: { unitName: { lineName: { year: amount } } }
-- Only annual entries (month IS NULL)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_unit_budgets()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  result jsonb;
BEGIN
  WITH unit_line_years AS (
    SELECT
      ou.name AS unit_name,
      bl.name AS line_name,
      jsonb_object_agg(be.year::text, be.amount) AS years
    FROM budget_entries be
    JOIN operational_units ou ON ou.id = be.operational_unit_id
    JOIN budget_lines bl ON bl.id = be.budget_line_id
    WHERE be.month IS NULL
    GROUP BY ou.name, bl.name
  ),
  unit_lines AS (
    SELECT
      unit_name,
      jsonb_object_agg(line_name, years) AS lines
    FROM unit_line_years
    GROUP BY unit_name
  )
  SELECT COALESCE(jsonb_object_agg(unit_name, lines), '{}'::jsonb)
  INTO result
  FROM unit_lines;

  RETURN result;
END;
$$;

-- ============================================================================
-- 3. get_unit_monthly()
-- Returns: { unitName: { lineName: [12 monthly amounts] } }
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_unit_monthly()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  result jsonb;
BEGIN
  WITH distinct_pairs AS (
    SELECT DISTINCT operational_unit_id, budget_line_id
    FROM budget_entries
    WHERE month IS NOT NULL
  ),
  monthly_arrays AS (
    SELECT
      ou.name AS unit_name,
      bl.name AS line_name,
      (
        SELECT jsonb_agg(COALESCE(m.amount, 0) ORDER BY g.n)
        FROM generate_series(1, 12) g(n)
        LEFT JOIN budget_entries m
          ON m.operational_unit_id = dp.operational_unit_id
          AND m.budget_line_id = dp.budget_line_id
          AND m.month = g.n
      ) AS monthly
    FROM distinct_pairs dp
    JOIN operational_units ou ON ou.id = dp.operational_unit_id
    JOIN budget_lines bl ON bl.id = dp.budget_line_id
  ),
  unit_lines AS (
    SELECT
      unit_name,
      jsonb_object_agg(line_name, monthly) AS lines
    FROM monthly_arrays
    GROUP BY unit_name
  )
  SELECT COALESCE(jsonb_object_agg(unit_name, lines), '{}'::jsonb)
  INTO result
  FROM unit_lines;

  RETURN result;
END;
$$;
