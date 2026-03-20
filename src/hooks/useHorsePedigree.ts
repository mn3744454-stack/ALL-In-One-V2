import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PedigreeHorse {
  id: string;
  name: string;
  name_ar: string | null;
  gender: string;
  avatar_url: string | null;
  birth_date: string | null;
}

export interface PedigreeData {
  sire: PedigreeHorse | null;
  dam: PedigreeHorse | null;
  paternalGrandsire: PedigreeHorse | null;
  paternalGranddam: PedigreeHorse | null;
  maternalGrandsire: PedigreeHorse | null;
  maternalGranddam: PedigreeHorse | null;
  // Text-only fallbacks from the horse record itself
  sireNameFallback: string | null;
  damNameFallback: string | null;
  paternalGrandfatherFallback: string | null;
  paternalGrandmotherFallback: string | null;
  maternalGrandfatherFallback: string | null;
  maternalGrandmotherFallback: string | null;
}

interface HorseRecord {
  father_id: string | null;
  father_name: string | null;
  mother_id: string | null;
  mother_name: string | null;
  paternal_grandfather: string | null;
  paternal_grandmother: string | null;
  maternal_grandfather: string | null;
  maternal_grandmother: string | null;
}

const SELECT_FIELDS = "id, name, name_ar, gender, avatar_url, birth_date, father_id, mother_id";

export function useHorsePedigree(horseId: string | undefined) {
  const [pedigree, setPedigree] = useState<PedigreeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!horseId) {
      setPedigree(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetch() {
      setLoading(true);
      try {
        // Get the horse's own record for parent IDs and text fallbacks
        const { data: horse, error } = await supabase
          .from("horses")
          .select("father_id, father_name, mother_id, mother_name, paternal_grandfather, paternal_grandmother, maternal_grandfather, maternal_grandmother")
          .eq("id", horseId)
          .single();

        if (error || !horse || cancelled) {
          if (!cancelled) setPedigree(null);
          return;
        }

        const h = horse as HorseRecord;
        const parentIds = [h.father_id, h.mother_id].filter(Boolean) as string[];

        let sire: PedigreeHorse | null = null;
        let dam: PedigreeHorse | null = null;
        let paternalGrandsire: PedigreeHorse | null = null;
        let paternalGranddam: PedigreeHorse | null = null;
        let maternalGrandsire: PedigreeHorse | null = null;
        let maternalGranddam: PedigreeHorse | null = null;

        if (parentIds.length > 0) {
          const { data: parents } = await supabase
            .from("horses")
            .select(SELECT_FIELDS)
            .in("id", parentIds);

          if (parents && !cancelled) {
            sire = (parents.find((p: any) => p.id === h.father_id) as PedigreeHorse) || null;
            dam = (parents.find((p: any) => p.id === h.mother_id) as PedigreeHorse) || null;

            // Fetch grandparents from linked parent records
            const grandparentIds: string[] = [];
            if (sire) {
              const s = sire as any;
              if (s.father_id) grandparentIds.push(s.father_id);
              if (s.mother_id) grandparentIds.push(s.mother_id);
            }
            if (dam) {
              const d = dam as any;
              if (d.father_id) grandparentIds.push(d.father_id);
              if (d.mother_id) grandparentIds.push(d.mother_id);
            }

            if (grandparentIds.length > 0) {
              // We need sire's parent IDs — re-fetch parents with father_id/mother_id
              const { data: parentsWithRefs } = await supabase
                .from("horses")
                .select("id, father_id, mother_id")
                .in("id", parentIds);

              const sireRef = parentsWithRefs?.find((p: any) => p.id === h.father_id) as any;
              const damRef = parentsWithRefs?.find((p: any) => p.id === h.mother_id) as any;

              const allGpIds = [
                sireRef?.father_id, sireRef?.mother_id,
                damRef?.father_id, damRef?.mother_id,
              ].filter(Boolean) as string[];

              if (allGpIds.length > 0 && !cancelled) {
                const { data: gps } = await supabase
                  .from("horses")
                  .select("id, name, name_ar, gender, avatar_url, birth_date")
                  .in("id", allGpIds);

                if (gps) {
                  paternalGrandsire = (gps.find((g: any) => g.id === sireRef?.father_id) as PedigreeHorse) || null;
                  paternalGranddam = (gps.find((g: any) => g.id === sireRef?.mother_id) as PedigreeHorse) || null;
                  maternalGrandsire = (gps.find((g: any) => g.id === damRef?.father_id) as PedigreeHorse) || null;
                  maternalGranddam = (gps.find((g: any) => g.id === damRef?.mother_id) as PedigreeHorse) || null;
                }
              }
            }
          }
        }

        if (!cancelled) {
          setPedigree({
            sire,
            dam,
            paternalGrandsire,
            paternalGranddam,
            maternalGrandsire,
            maternalGranddam,
            sireNameFallback: h.father_name,
            damNameFallback: h.mother_name,
            paternalGrandfatherFallback: h.paternal_grandfather,
            paternalGrandmotherFallback: h.paternal_grandmother,
            maternalGrandfatherFallback: h.maternal_grandfather,
            maternalGrandmotherFallback: h.maternal_grandmother,
          });
        }
      } catch (err) {
        console.error("Error fetching pedigree:", err);
        if (!cancelled) setPedigree(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, [horseId]);

  return { pedigree, loading };
}
