import { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { 
  getCurrentAgeParts, 
  formatAgeCompact, 
  getHorseTypeLabel, 
  getHorseTypeBadgeProps 
} from "@/lib/horseClassification";

interface Horse {
  id: string;
  name: string;
  name_ar?: string | null;
  gender: string;
  status?: string | null;
  age_category?: string | null;
  birth_date?: string | null;
  birth_at?: string | null;
  avatar_url?: string | null;
  breed?: string | null;
  color?: string | null;
  is_gelded?: boolean;
  breeding_role?: string | null;
  breed_data?: { name: string } | null;
  color_data?: { name: string } | null;
  branch_data?: { name: string } | null;
  primary_owner?: { name: string } | null;
}

interface HorsesTableProps {
  horses: Horse[];
  onHorseClick?: (horse: Horse) => void;
}

export const HorsesTable = ({ horses, onHorseClick }: HorsesTableProps) => {
  const { t } = useI18n();

  const getStatusColor = (status?: string | null) => {
    if (status === "active") return "bg-success/10 text-success";
    if (status === "inactive") return "bg-muted text-muted-foreground";
    return "bg-muted text-muted-foreground";
  };

  const getGenderIcon = (gender: string) => {
    return gender === "female" ? "♀" : "♂";
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]"></TableHead>
            <TableHead>{t('horses.table.name')}</TableHead>
            <TableHead>{t('horses.table.breed')}</TableHead>
            <TableHead>{t('horses.table.type')}</TableHead>
            <TableHead>{t('horses.table.age')}</TableHead>
            <TableHead>{t('horses.table.color')}</TableHead>
            <TableHead>{t('horses.table.owner')}</TableHead>
            <TableHead>{t('horses.table.status')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {horses.map((horse) => {
            const ageParts = getCurrentAgeParts({
              gender: horse.gender,
              birth_date: horse.birth_date,
              birth_at: horse.birth_at,
              is_gelded: horse.is_gelded,
              breeding_role: horse.breeding_role,
            });
            
            const horseType = getHorseTypeLabel({
              gender: horse.gender,
              birth_date: horse.birth_date,
              birth_at: horse.birth_at,
              is_gelded: horse.is_gelded,
              breeding_role: horse.breeding_role,
            });
            
            const formattedAge = formatAgeCompact(ageParts);
            const typeBadgeProps = getHorseTypeBadgeProps(horseType);
            const breedName = horse.breed_data?.name || horse.breed || t('horses.unknownBreed');
            const colorName = horse.color_data?.name || horse.color || "-";
            const ownerName = horse.primary_owner?.name || "-";

            return (
              <TableRow 
                key={horse.id} 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onHorseClick?.(horse)}
              >
                <TableCell>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center text-xs font-bold">
                    {getGenderIcon(horse.gender)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{horse.name}</div>
                    {horse.name_ar && (
                      <div className="text-xs text-muted-foreground truncate" dir="rtl">
                        {horse.name_ar}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{breedName}</TableCell>
                <TableCell>
                  <Badge className={cn("text-xs", typeBadgeProps.className)}>
                    {typeBadgeProps.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{formattedAge || "-"}</TableCell>
                <TableCell className="text-muted-foreground">{colorName}</TableCell>
                <TableCell className="text-muted-foreground">{ownerName}</TableCell>
                <TableCell>
                  <Badge 
                    variant="secondary" 
                    className={cn("text-xs", getStatusColor(horse.status))}
                  >
                    {horse.status || "draft"}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
