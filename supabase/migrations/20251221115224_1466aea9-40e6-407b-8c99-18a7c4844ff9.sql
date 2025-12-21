-- Step 1: Add 'manager' role to tenant_role enum
-- This must be in its own transaction before being used
ALTER TYPE public.tenant_role ADD VALUE IF NOT EXISTS 'manager';