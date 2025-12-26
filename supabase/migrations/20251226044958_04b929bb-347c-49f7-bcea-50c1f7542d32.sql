-- STEP 5B: Add horse age classification fields

-- 1. Add birth_at (TIMESTAMPTZ for proper timezone handling - stores UTC)
ALTER TABLE public.horses
ADD COLUMN IF NOT EXISTS birth_at TIMESTAMPTZ NULL;

-- 2. Add is_gelded flag (for male horses only)
ALTER TABLE public.horses
ADD COLUMN IF NOT EXISTS is_gelded BOOLEAN NOT NULL DEFAULT false;

-- 3. Add breeding_role (for female horses: 'broodmare' or null)
ALTER TABLE public.horses
ADD COLUMN IF NOT EXISTS breeding_role TEXT NULL;

-- 4. Constraint: breeding_role can only be 'broodmare' or null
ALTER TABLE public.horses
ADD CONSTRAINT chk_breeding_role 
CHECK (breeding_role IS NULL OR breeding_role = 'broodmare');

-- 5. Constraint: is_gelded can only be true for male horses
ALTER TABLE public.horses
ADD CONSTRAINT chk_is_gelded_male 
CHECK (is_gelded = false OR gender = 'male');