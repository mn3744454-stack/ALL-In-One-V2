import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Pencil } from "lucide-react";
import { useI18n } from "@/i18n";

interface Horse {
  birth_date?: string | null;
  microchip_number?: string | null;
  passport_number?: string | null;
  ueln?: string | null;
  breed?: string | null;
  color?: string | null;
  mother_name?: string | null;
  father_name?: string | null;
}

interface Props {
  horse: Horse;
  onEdit: () => void;
}

export function HorseProfileCompleteness({ horse, onEdit }: Props) {
  const { t } = useI18n();

  const checks = [
    { key: "birth_date", filled: !!horse.birth_date, label: t("horses.wizard.birthDate") },
    { key: "microchip", filled: !!horse.microchip_number, label: t("horses.profile.microchip") },
    { key: "passport", filled: !!horse.passport_number, label: t("horses.profile.passport") },
    { key: "breed", filled: !!horse.breed, label: t("horses.profile.breed") },
    { key: "pedigree", filled: !!(horse.mother_name || horse.father_name), label: t("horses.profile.pedigree") },
  ];

  const missing = checks.filter(c => !c.filled);
  if (missing.length === 0) return null;

  return (
    <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4" />
          {t("horses.profile.incompleteTitle")}
          <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 ms-auto">
            {checks.filter(c => c.filled).length}/{checks.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-1.5">
          {checks.map(c => (
            <div key={c.key} className="flex items-center gap-1.5 text-xs">
              {c.filled ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              )}
              <span className={c.filled ? "text-muted-foreground" : "text-foreground font-medium"}>
                {c.label}
              </span>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" className="w-full gap-1.5 mt-2" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
          {t("horses.profile.completeProfile")}
        </Button>
      </CardContent>
    </Card>
  );
}
