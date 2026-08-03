-- Fix exec_sql RPC function
-- The original had a bug with REVERSE loop that crashed on certain inputs
-- Run this in Supabase SQL Editor to update the function

CREATE OR REPLACE FUNCTION public.exec_sql(sql_text TEXT, sql_args JSONB DEFAULT '[]'::jsonb)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  sql_with_args TEXT;
  arg_count INT;
  i INT;
  arg_value TEXT;
BEGIN
  -- Validate sql_args is an array
  IF jsonb_typeof(sql_args) <> 'array' THEN
    RETURN jsonb_build_object('error', 'sql_args must be an array');
  END IF;

  sql_with_args := sql_text;
  arg_count := jsonb_array_length(sql_args);

  -- Iterate backwards from N to 1
  FOR i IN REVERSE arg_count .. 1 LOOP
    arg_value := jsonb_extract_path_text(sql_args, (i - 1)::text);

    IF arg_value IS NULL OR arg_value = '' THEN
      sql_with_args := REPLACE(sql_with_args, '$' || i::text, 'NULL');
    ELSIF arg_value ~ '^-?[0-9]+(\.[0-9]+)?$' THEN
      sql_with_args := REPLACE(sql_with_args, '$' || i::text, arg_value);
    ELSE
      sql_with_args := REPLACE(sql_with_args, '$' || i::text, '''' || REPLACE(arg_value, '''', '''''') || '''');
    END IF;
  END LOOP;

  -- Run query and return as JSONB array
  EXECUTE 'SELECT jsonb_agg(row_to_json(t)) FROM (' || sql_with_args || ') t' INTO result;
  RETURN COALESCE(result, '[]'::jsonb);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.exec_sql TO service_role;