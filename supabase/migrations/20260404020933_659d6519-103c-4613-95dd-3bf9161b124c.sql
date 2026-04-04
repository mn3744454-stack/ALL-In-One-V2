
-- ============================================================
-- PHASE 3 BATCH 3: Backend Permission Enforcement Migration
-- Domains: Horses, Media, Movement
-- ============================================================

-- ============================================================
-- 1. HORSES DOMAIN
-- ============================================================

-- --- horses (special: uses inline can_manage_horses column on tenant_members) ---
DROP POLICY IF EXISTS "Members with permission can manage horses" ON horses;

CREATE POLICY "Permission-based insert horses" ON horses
  FOR INSERT WITH CHECK (has_permission(auth.uid(), tenant_id, 'horses.create'));

CREATE POLICY "Permission-based update horses" ON horses
  FOR UPDATE USING (has_permission(auth.uid(), tenant_id, 'horses.edit'))
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'horses.edit'));

CREATE POLICY "Permission-based delete horses" ON horses
  FOR DELETE USING (has_permission(auth.uid(), tenant_id, 'horses.delete'));

-- --- horse_aliases ---
DROP POLICY IF EXISTS "Horse managers can insert aliases" ON horse_aliases;
DROP POLICY IF EXISTS "Horse managers can update aliases" ON horse_aliases;
DROP POLICY IF EXISTS "Horse managers can delete aliases" ON horse_aliases;

CREATE POLICY "Permission-based insert horse aliases" ON horse_aliases
  FOR INSERT WITH CHECK (has_permission(auth.uid(), tenant_id, 'horses.edit'));

CREATE POLICY "Permission-based update horse aliases" ON horse_aliases
  FOR UPDATE USING (has_permission(auth.uid(), tenant_id, 'horses.edit'))
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'horses.edit'));

CREATE POLICY "Permission-based delete horse aliases" ON horse_aliases
  FOR DELETE USING (has_permission(auth.uid(), tenant_id, 'horses.edit'));

-- --- horse_owners ---
DROP POLICY IF EXISTS "Managers can manage horse owners" ON horse_owners;

CREATE POLICY "Permission-based insert horse owners" ON horse_owners
  FOR INSERT WITH CHECK (has_permission(auth.uid(), tenant_id, 'horses.edit'));

CREATE POLICY "Permission-based update horse owners" ON horse_owners
  FOR UPDATE USING (has_permission(auth.uid(), tenant_id, 'horses.edit'))
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'horses.edit'));

CREATE POLICY "Permission-based delete horse owners" ON horse_owners
  FOR DELETE USING (has_permission(auth.uid(), tenant_id, 'horses.edit'));

-- --- horse_ownership (joins through horses table — no tenant_id column) ---
DROP POLICY IF EXISTS "Managers can manage horse ownership" ON horse_ownership;

CREATE POLICY "Permission-based insert horse ownership" ON horse_ownership
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM horses h
      WHERE h.id = horse_ownership.horse_id
        AND has_permission(auth.uid(), h.tenant_id, 'horses.edit')
    )
  );

CREATE POLICY "Permission-based update horse ownership" ON horse_ownership
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM horses h
      WHERE h.id = horse_ownership.horse_id
        AND has_permission(auth.uid(), h.tenant_id, 'horses.edit')
    )
  );

CREATE POLICY "Permission-based delete horse ownership" ON horse_ownership
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM horses h
      WHERE h.id = horse_ownership.horse_id
        AND has_permission(auth.uid(), h.tenant_id, 'horses.edit')
    )
  );

-- --- breeders ---
DROP POLICY IF EXISTS "Managers can manage breeders" ON breeders;

CREATE POLICY "Permission-based insert breeders" ON breeders
  FOR INSERT WITH CHECK (has_permission(auth.uid(), tenant_id, 'horses.edit'));

CREATE POLICY "Permission-based update breeders" ON breeders
  FOR UPDATE USING (has_permission(auth.uid(), tenant_id, 'horses.edit'))
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'horses.edit'));

CREATE POLICY "Permission-based delete breeders" ON breeders
  FOR DELETE USING (has_permission(auth.uid(), tenant_id, 'horses.edit'));

-- --- horse_breeds ---
DROP POLICY IF EXISTS "Managers can manage horse breeds" ON horse_breeds;

CREATE POLICY "Permission-based insert horse breeds" ON horse_breeds
  FOR INSERT WITH CHECK (has_permission(auth.uid(), tenant_id, 'horses.edit'));

CREATE POLICY "Permission-based update horse breeds" ON horse_breeds
  FOR UPDATE USING (has_permission(auth.uid(), tenant_id, 'horses.edit'))
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'horses.edit'));

CREATE POLICY "Permission-based delete horse breeds" ON horse_breeds
  FOR DELETE USING (has_permission(auth.uid(), tenant_id, 'horses.edit'));

-- --- horse_colors ---
DROP POLICY IF EXISTS "Managers can manage horse colors" ON horse_colors;

CREATE POLICY "Permission-based insert horse colors" ON horse_colors
  FOR INSERT WITH CHECK (has_permission(auth.uid(), tenant_id, 'horses.edit'));

CREATE POLICY "Permission-based update horse colors" ON horse_colors
  FOR UPDATE USING (has_permission(auth.uid(), tenant_id, 'horses.edit'))
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'horses.edit'));

CREATE POLICY "Permission-based delete horse colors" ON horse_colors
  FOR DELETE USING (has_permission(auth.uid(), tenant_id, 'horses.edit'));

-- --- stables ---
DROP POLICY IF EXISTS "Managers can manage stables" ON stables;

CREATE POLICY "Permission-based insert stables" ON stables
  FOR INSERT WITH CHECK (has_permission(auth.uid(), tenant_id, 'horses.edit'));

CREATE POLICY "Permission-based update stables" ON stables
  FOR UPDATE USING (has_permission(auth.uid(), tenant_id, 'horses.edit'))
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'horses.edit'));

CREATE POLICY "Permission-based delete stables" ON stables
  FOR DELETE USING (has_permission(auth.uid(), tenant_id, 'horses.edit'));

-- ============================================================
-- 2. MEDIA DOMAIN
-- ============================================================

-- --- media_assets ---
DROP POLICY IF EXISTS "Managers can insert assets" ON media_assets;
DROP POLICY IF EXISTS "Managers can update assets" ON media_assets;
DROP POLICY IF EXISTS "Managers can delete assets" ON media_assets;

CREATE POLICY "Permission-based insert media assets" ON media_assets
  FOR INSERT WITH CHECK (has_permission(auth.uid(), tenant_id, 'files.assets.manage'));

CREATE POLICY "Permission-based update media assets" ON media_assets
  FOR UPDATE USING (has_permission(auth.uid(), tenant_id, 'files.assets.manage'))
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'files.assets.manage'));

CREATE POLICY "Permission-based delete media assets" ON media_assets
  FOR DELETE USING (has_permission(auth.uid(), tenant_id, 'files.assets.manage'));

-- ============================================================
-- 3. MOVEMENT DOMAIN
-- ============================================================

-- --- horse_movements (special: demo-only DELETE) ---
DROP POLICY IF EXISTS "Managers can insert movements" ON horse_movements;
DROP POLICY IF EXISTS "Managers can delete demo movements" ON horse_movements;

CREATE POLICY "Permission-based insert horse movements" ON horse_movements
  FOR INSERT WITH CHECK (has_permission(auth.uid(), tenant_id, 'movement.manage'));

CREATE POLICY "Permission-based update horse movements" ON horse_movements
  FOR UPDATE USING (has_permission(auth.uid(), tenant_id, 'movement.manage'))
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'movement.manage'));

CREATE POLICY "Permission-based delete horse movements" ON horse_movements
  FOR DELETE USING (has_permission(auth.uid(), tenant_id, 'movement.manage') AND is_demo = true);

-- --- facility_areas ---
DROP POLICY IF EXISTS "Managers can insert areas" ON facility_areas;
DROP POLICY IF EXISTS "Managers can update areas" ON facility_areas;

CREATE POLICY "Permission-based insert facility areas" ON facility_areas
  FOR INSERT WITH CHECK (has_permission(auth.uid(), tenant_id, 'movement.manage'));

CREATE POLICY "Permission-based update facility areas" ON facility_areas
  FOR UPDATE USING (has_permission(auth.uid(), tenant_id, 'movement.manage'))
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'movement.manage'));

CREATE POLICY "Permission-based delete facility areas" ON facility_areas
  FOR DELETE USING (has_permission(auth.uid(), tenant_id, 'movement.manage'));

-- --- housing_units ---
DROP POLICY IF EXISTS "Managers can insert units" ON housing_units;
DROP POLICY IF EXISTS "Managers can update units" ON housing_units;

CREATE POLICY "Permission-based insert housing units" ON housing_units
  FOR INSERT WITH CHECK (has_permission(auth.uid(), tenant_id, 'movement.manage'));

CREATE POLICY "Permission-based update housing units" ON housing_units
  FOR UPDATE USING (has_permission(auth.uid(), tenant_id, 'movement.manage'))
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'movement.manage'));

CREATE POLICY "Permission-based delete housing units" ON housing_units
  FOR DELETE USING (has_permission(auth.uid(), tenant_id, 'movement.manage'));

-- --- housing_unit_occupants ---
DROP POLICY IF EXISTS "Managers can insert occupants" ON housing_unit_occupants;
DROP POLICY IF EXISTS "Managers can update occupants" ON housing_unit_occupants;

CREATE POLICY "Permission-based insert housing unit occupants" ON housing_unit_occupants
  FOR INSERT WITH CHECK (has_permission(auth.uid(), tenant_id, 'movement.manage'));

CREATE POLICY "Permission-based update housing unit occupants" ON housing_unit_occupants
  FOR UPDATE USING (has_permission(auth.uid(), tenant_id, 'movement.manage'))
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'movement.manage'));

CREATE POLICY "Permission-based delete housing unit occupants" ON housing_unit_occupants
  FOR DELETE USING (has_permission(auth.uid(), tenant_id, 'movement.manage'));

-- --- external_locations (inline owner/manager check) ---
DROP POLICY IF EXISTS "Managers can insert external locations" ON external_locations;
DROP POLICY IF EXISTS "Managers can update external locations" ON external_locations;
DROP POLICY IF EXISTS "Managers can delete external locations" ON external_locations;

CREATE POLICY "Permission-based insert external locations" ON external_locations
  FOR INSERT WITH CHECK (has_permission(auth.uid(), tenant_id, 'movement.manage'));

CREATE POLICY "Permission-based update external locations" ON external_locations
  FOR UPDATE USING (has_permission(auth.uid(), tenant_id, 'movement.manage'))
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'movement.manage'));

CREATE POLICY "Permission-based delete external locations" ON external_locations
  FOR DELETE USING (has_permission(auth.uid(), tenant_id, 'movement.manage'));

-- --- branches ---
DROP POLICY IF EXISTS "Managers can manage branches" ON branches;
DROP POLICY IF EXISTS "Managers can delete demo branches" ON branches;

CREATE POLICY "Permission-based insert branches" ON branches
  FOR INSERT WITH CHECK (has_permission(auth.uid(), tenant_id, 'movement.manage'));

CREATE POLICY "Permission-based update branches" ON branches
  FOR UPDATE USING (has_permission(auth.uid(), tenant_id, 'movement.manage'))
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'movement.manage'));

CREATE POLICY "Permission-based delete branches" ON branches
  FOR DELETE USING (has_permission(auth.uid(), tenant_id, 'movement.manage') AND is_demo = true);
