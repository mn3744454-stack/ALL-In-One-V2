import { useI18n } from "@/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { LayoutGrid, Home, Users, Ban } from "lucide-react";
import { useMemo } from "react";

interface HousingUnit {
  id: string;
  capacity: number;
  current_occupants?: number;
}

interface HousingStatsProps {
  units: HousingUnit[];
}

export function HousingStats({ units }: HousingStatsProps) {
  const { t } = useI18n();

  const stats = useMemo(() => {
    const total = units.length;
    const vacant = units.filter(u => (u.current_occupants ?? 0) === 0).length;
    const occupied = units.filter(u => {
      const occ = u.current_occupants ?? 0;
      return occ > 0 && occ < u.capacity;
    }).length;
    const full = units.filter(u => (u.current_occupants ?? 0) >= u.capacity).length;
    const totalHorses = units.reduce((sum, u) => sum + (u.current_occupants ?? 0), 0);
    
    return { total, vacant, occupied, full, totalHorses };
  }, [units]);

  const statItems = [
    { label: t('housing.stats.total'), value: stats.total, icon: LayoutGrid, color: "text-slate-600 dark:text-slate-400" },
    { label: t('housing.stats.vacant'), value: stats.vacant, icon: Home, color: "text-green-600 dark:text-green-400" },
    { label: t('housing.stats.occupied'), value: stats.occupied, icon: Users, color: "text-blue-600 dark:text-blue-400" },
    { label: t('housing.stats.full'), value: stats.full, icon: Ban, color: "text-amber-600 dark:text-amber-400" },
  ];

  if (units.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
      {statItems.map((item) => (
        <Card key={item.label} className="border-border/50">
          <CardContent className="p-3 flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-muted ${item.color}`}>
              <item.icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-2xl font-bold">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
