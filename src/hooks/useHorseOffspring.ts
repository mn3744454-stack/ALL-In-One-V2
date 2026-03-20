import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface OffspringRecord {
  id: string;
  name: string;
  name_ar: string | null;
  gender: string;
  birth_date: string | null;
  avatar_url: string | null;
  status: string | null;
}

export function useHorseOffspring(horseId: string | undefined, gender: string | undefined) {
  const [offspring, setOffspring] = useState<OffspringRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!horseId || !gender) {
      setOffspring([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetch() {
      setLoading(true);
      try {
        const parentField = gender === "male" ? "father_id" : "mother_id";

        const { data, error } = await supabase
          .from("horses")
          .select("id, name, name_ar, gender, birth_date, avatar_url, status")
          .eq(parentField, horseId)
          .order("birth_date", { ascending: false, nullsFirst: false });

        if (error) throw error;
        if (!cancelled) {
          setOffspring((data as OffspringRecord[]) || []);
        }
      } catch (err) {
        console.error("Error fetching offspring:", err);
        if (!cancelled) setOffspring([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, [horseId, gender]);

  return { offspring, loading };
}
