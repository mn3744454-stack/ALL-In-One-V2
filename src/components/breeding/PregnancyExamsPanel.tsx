import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Plus, Stethoscope } from "lucide-react";
import { formatBreedingDate } from "@/lib/displayHelpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { usePregnancyChecks, PregnancyCheck, CreatePregnancyCheckData } from "@/hooks/breeding/usePregnancyChecks";
import { useI18n } from "@/i18n";

interface PregnancyExamsPanelProps {
  pregnancyId: string;
  canManage?: boolean;
}

export function PregnancyExamsPanel({ pregnancyId, canManage = false }: PregnancyExamsPanelProps) {
  const { checks, loading, createCheck } = usePregnancyChecks(pregnancyId);
  const { t } = useI18n();
  const [showAddDialog, setShowAddDialog] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-primary" />
            {t("breeding.pregnancyExams")}
          </CardTitle>
          {canManage && (
            <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-3.5 w-3.5" />
              {t("breeding.addExam")}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : checks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">{t("breeding.noExams")}</p>
        ) : (
          <div className="space-y-3">
            {checks.map((check) => (
              <ExamRow key={check.id} check={check} />
            ))}
          </div>
        )}
      </CardContent>

      <AddExamDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        pregnancyId={pregnancyId}
        onSubmit={createCheck}
      />
    </Card>
  );
}

function ExamRow({ check }: { check: PregnancyCheck }) {
  const { t } = useI18n();

  const outcomeStyles: Record<string, string> = {
    confirmed_pregnant: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30",
    confirmed_open: "bg-red-500/20 text-red-600 border-red-500/30",
    inconclusive: "bg-amber-500/20 text-amber-600 border-amber-500/30",
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{format(new Date(check.check_date), "PP")}</span>
          <Badge variant="secondary" className="text-xs">{t(`breeding.examMethods.${check.method}`)}</Badge>
          <Badge variant="outline" className={cn("text-xs", outcomeStyles[check.outcome] || "")}>
            {t(`breeding.examOutcomes.${check.outcome}`)}
          </Badge>
        </div>
        {check.performer && (
          <p className="text-xs text-muted-foreground mt-1">
            {t("breeding.performedBy")}: {check.performer.full_name}
          </p>
        )}
        {check.notes && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{check.notes}</p>
        )}
      </div>
    </div>
  );
}

interface AddExamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pregnancyId: string;
  onSubmit: (data: CreatePregnancyCheckData) => Promise<unknown>;
}

function AddExamDialog({ open, onOpenChange, pregnancyId, onSubmit }: AddExamDialogProps) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [checkDate, setCheckDate] = useState<Date | undefined>(new Date());
  const [method, setMethod] = useState<PregnancyCheck["method"]>("ultrasound");
  const [outcome, setOutcome] = useState<PregnancyCheck["outcome"]>("inconclusive");
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setCheckDate(new Date());
    setMethod("ultrasound");
    setOutcome("inconclusive");
    setNotes("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkDate) return;

    setLoading(true);
    try {
      await onSubmit({
        pregnancy_id: pregnancyId,
        check_date: format(checkDate, "yyyy-MM-dd"),
        method,
        outcome,
        notes: notes || null,
      });
      resetForm();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md">
        <DialogHeader>
          <DialogTitle>{t("breeding.addExam")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t("common.date")} *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !checkDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {checkDate ? format(checkDate, "PPP") : t("common.select")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[200]" align="start">
                <Calendar mode="single" selected={checkDate} onSelect={setCheckDate} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>{t("breeding.examMethod")}</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as PregnancyCheck["method"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="z-[200]">
                <SelectItem value="ultrasound">{t("breeding.examMethods.ultrasound")}</SelectItem>
                <SelectItem value="palpation">{t("breeding.examMethods.palpation")}</SelectItem>
                <SelectItem value="blood_test">{t("breeding.examMethods.blood_test")}</SelectItem>
                <SelectItem value="other">{t("breeding.examMethods.other")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("breeding.examOutcome")}</Label>
            <Select value={outcome} onValueChange={(v) => setOutcome(v as PregnancyCheck["outcome"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="z-[200]">
                <SelectItem value="confirmed_pregnant">{t("breeding.examOutcomes.confirmed_pregnant")}</SelectItem>
                <SelectItem value="confirmed_open">{t("breeding.examOutcomes.confirmed_open")}</SelectItem>
                <SelectItem value="inconclusive">{t("breeding.examOutcomes.inconclusive")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("common.notes")}</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
            <Button type="submit" className="flex-1" disabled={loading || !checkDate}>
              {loading ? t("common.loading") : t("common.create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
