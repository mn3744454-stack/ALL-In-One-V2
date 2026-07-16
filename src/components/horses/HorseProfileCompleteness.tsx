import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Pencil } from "lucide-react";
import { useI18n } from "@/i18n";
import {
  getCompletenessChecks,
  COMPLETENESS_LABEL_KEYS,
  type CompletenessHorse,
} from "@/lib/horseCompleteness";

interface Props {
  horse: CompletenessHorse;
  onEdit: () => void;
  /**
   * Phase 1.e.f.8.1.4.d.3.fix.1.r1 — Complete Profile is a governance-gated
   * action. Only viewers with owner_authority may open the identity wizard
   * to fill missing fields. current_host_operational and other non-owner
   * modes see the completeness diagnostic but no action button. Default
   * `true` preserves legacy callers.
   */
  canEdit?: boolean;
}

export function HorseProfileCompleteness({ horse, onEdit, canEdit = true }: Props) {
  const { t } = useI18n();

  const checks = getCompletenessChecks(horse);
  const filledCount = checks.filter((c) => c.filled).length;
  if (filledCount === checks.length) return null;

  return (
    <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4" />
          {t("horses.profile.incompleteTitle")}
          <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 ms-auto">
            {filledCount}/{checks.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-1.5">
          {checks.map((c) => (
            <div key={c.key} className="flex items-center gap-1.5 text-xs">
              {c.filled ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              )}
              <span className={c.filled ? "text-muted-foreground" : "text-foreground font-medium"}>
                {t(COMPLETENESS_LABEL_KEYS[c.key])}
              </span>
            </div>
          ))}
        </div>
        {canEdit && (
          <Button variant="outline" size="sm" className="w-full gap-1.5 mt-2" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
            {t("horses.profile.completeProfile")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
