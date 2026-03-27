import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VetStatusBadge } from "./VetStatusBadge";
import { VetPriorityBadge } from "./VetPriorityBadge";
import { VetCategoryBadge } from "./VetCategoryBadge";
import { BilingualName } from "@/components/ui/BilingualName";
import { CreateInvoiceFromTreatment } from "./CreateInvoiceFromTreatment";
import type { VetTreatment } from "@/hooks/vet/useVetTreatments";
import { useVetMedications } from "@/hooks/vet/useVetMedications";
import { useVetFollowups } from "@/hooks/vet/useVetFollowups";
import { useBillingLinks } from "@/hooks/billing/useBillingLinks";
import { formatStandardDate, formatStandardDateTime } from "@/lib/displayHelpers";
import { isPast } from "date-fns";
import { useI18n } from "@/i18n";
import { tScope } from "@/i18n/labels";
import {
  Calendar,
  Clock,
  User,
  Building2,
  Pill,
  CalendarClock,
  AlertTriangle,
  Edit,
  CheckCircle,
  Plus,
  Loader2,
  Receipt,
  FileText,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface TreatmentDetailSheetProps {
  treatment: VetTreatment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (treatment: VetTreatment) => void;
}

export function TreatmentDetailSheet({
  treatment,
  open,
  onOpenChange,
  onEdit,
}: TreatmentDetailSheetProps) {
  const { t } = useI18n();
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);

  if (!treatment) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4 pe-10">
          <SheetTitle className="text-start">{treatment.title}</SheetTitle>
        </SheetHeader>

        {/* Action buttons row */}
        <div className="flex justify-end gap-2 mb-4">
          {onEdit && treatment.status !== 'completed' && treatment.status !== 'cancelled' && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onEdit(treatment)}>
              <Edit className="w-3.5 h-3.5" />
              {t("common.edit")}
            </Button>
          )}
          <BillingActionButton treatment={treatment} onOpenInvoiceDialog={() => setInvoiceDialogOpen(true)} />
        </div>

        <div className="space-y-6">
          {/* Horse Context */}
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12 rounded-xl">
              <AvatarImage src={treatment.horse?.avatar_url || undefined} />
              <AvatarFallback className="bg-gold/20 text-gold-dark rounded-xl">
                {treatment.horse?.name?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <BilingualName
                name={treatment.horse?.name}
                nameAr={(treatment.horse as any)?.name_ar}
                primaryClassName="font-semibold"
              />
            </div>
          </div>

          {/* Status & Badges */}
          <div className="flex flex-wrap gap-2">
            <VetStatusBadge status={treatment.status} />
            <VetCategoryBadge category={treatment.category} />
            <VetPriorityBadge priority={treatment.priority} />
            <Badge variant="outline" className="text-xs">{tScope(treatment.service_mode)}</Badge>
          </div>

          {/* Key Dates */}
          <div className="space-y-2">
            <DetailRow icon={Clock} label={t("vet.detail.requestedAt")} value={formatStandardDate(treatment.requested_at)} />
            {treatment.scheduled_for && (
              <DetailRow icon={Calendar} label={t("vet.detail.scheduledFor")} value={formatStandardDate(treatment.scheduled_for)} />
            )}
            {treatment.completed_at && (
              <DetailRow icon={CheckCircle} label={t("vet.detail.completedAt")} value={formatStandardDate(treatment.completed_at)} />
            )}
          </div>

          {/* Provider / Assignee */}
          <div className="space-y-2">
            {treatment.assignee && (
              <DetailRow icon={User} label={t("vet.detail.assignedTo")} value={treatment.assignee.full_name} />
            )}
            {treatment.service_mode === 'external' && (treatment.provider?.name || treatment.external_provider_name) && (
              <DetailRow icon={Building2} label={t("vet.detail.provider")} value={treatment.provider?.name || treatment.external_provider_name || ''} />
            )}
          </div>

          {/* Description / Notes */}
          {(treatment.description || treatment.notes) && (
            <div className="space-y-2">
              {treatment.description && (
                <p className="text-sm text-muted-foreground">{treatment.description}</p>
              )}
              {treatment.notes && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm">{treatment.notes}</p>
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Medications Section */}
          <MedicationsSection treatmentId={treatment.id} />

          <Separator />

          {/* Follow-ups Section */}
          <FollowupsSection treatmentId={treatment.id} />
        </div>
      </SheetContent>
    </Sheet>

    <CreateInvoiceFromTreatment
      open={invoiceDialogOpen}
      onOpenChange={setInvoiceDialogOpen}
      data={{
        treatment,
        horseName: treatment.horse?.name,
        horseNameAr: (treatment.horse as any)?.name_ar,
      }}
    />
  </>
  );
}

/** Shows billing status + generate invoice button */
function BillingActionButton({ treatment, onOpenInvoiceDialog }: { treatment: VetTreatment; onOpenInvoiceDialog: () => void }) {
  const { t } = useI18n();
  const { links, isLoading } = useBillingLinks("vet_treatment", treatment.id);
  const hasInvoice = links.length > 0;

  if (isLoading) return null;

  if (hasInvoice) {
    return (
      <Badge variant="secondary" className="gap-1 text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
        <FileText className="w-3 h-3" />
        {t("vet.billing.invoiced")}
      </Badge>
    );
  }

  return (
    <Button variant="outline" size="sm" className="gap-1.5" onClick={onOpenInvoiceDialog}>
      <Receipt className="w-3.5 h-3.5" />
      {t("vet.billing.generateInvoice")}
    </Button>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function MedicationsSection({ treatmentId }: { treatmentId: string }) {
  const { t } = useI18n();
  const { medications, loading, canManage, addMedication } = useVetMedications(treatmentId);
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newMed, setNewMed] = useState({ name: '', dose: '', frequency: '', duration_days: '' });

  const handleAdd = async () => {
    if (!newMed.name) return;
    setAdding(true);
    await addMedication({
      treatment_id: treatmentId,
      name: newMed.name,
      dose: newMed.dose || undefined,
      frequency: newMed.frequency || undefined,
      duration_days: newMed.duration_days ? Number(newMed.duration_days) : undefined,
    });
    setNewMed({ name: '', dose: '', frequency: '', duration_days: '' });
    setShowAdd(false);
    setAdding(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Pill className="w-4 h-4 text-primary" />
          {t("vet.detail.medications")}
        </h4>
        {canManage && (
          <Button variant="ghost" size="sm" className="gap-1 h-7" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="w-3.5 h-3.5" />
            {t("vet.detail.addMedication")}
          </Button>
        )}
      </div>

      {showAdd && (
        <div className="bg-muted/50 rounded-lg p-3 mb-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">{t("vet.detail.medicationName")} *</Label>
              <Input value={newMed.name} onChange={e => setNewMed({ ...newMed, name: e.target.value })} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">{t("vet.detail.dose")}</Label>
              <Input value={newMed.dose} onChange={e => setNewMed({ ...newMed, dose: e.target.value })} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">{t("vet.detail.frequency")}</Label>
              <Input value={newMed.frequency} onChange={e => setNewMed({ ...newMed, frequency: e.target.value })} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">{t("vet.detail.duration")}</Label>
              <Input type="number" value={newMed.duration_days} onChange={e => setNewMed({ ...newMed, duration_days: e.target.value })} className="h-8 text-sm" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" className="h-7" onClick={() => setShowAdd(false)}>{t("common.cancel")}</Button>
            <Button size="sm" className="h-7" onClick={handleAdd} disabled={adding || !newMed.name}>
              {adding && <Loader2 className="w-3 h-3 me-1 animate-spin" />}
              {t("common.add")}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-12 rounded-lg" />
        </div>
      ) : medications.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">{t("vet.detail.noMedications")}</p>
      ) : (
        <div className="space-y-2">
          {medications.map(med => (
            <div key={med.id} className="bg-muted/50 rounded-lg p-3">
              <p className="font-medium text-sm">{med.name}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-1">
                {med.dose && <span>{t("vet.detail.dose")}: {med.dose}</span>}
                {med.frequency && <span>{t("vet.detail.frequency")}: {med.frequency}</span>}
                {med.duration_days && <span>{t("vet.detail.duration")}: {med.duration_days}</span>}
                {med.start_date && <span>{t("vet.detail.startDate")}: {formatStandardDate(med.start_date)}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FollowupsSection({ treatmentId }: { treatmentId: string }) {
  const { t } = useI18n();
  const { followups, loading, markAsDone } = useVetFollowups({ treatment_id: treatmentId });

  return (
    <div>
      <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
        <CalendarClock className="w-4 h-4 text-primary" />
        {t("vet.detail.followups")}
      </h4>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 rounded-lg" />
        </div>
      ) : followups.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">{t("vet.detail.noFollowups")}</p>
      ) : (
        <div className="space-y-2">
          {followups.map(fu => {
            const isOverdue = fu.status === 'open' && isPast(new Date(fu.due_at));
            return (
              <div key={fu.id} className={`rounded-lg p-3 ${isOverdue ? 'bg-destructive/10 border border-destructive/20' : 'bg-muted/50'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <Badge variant="secondary" className="text-xs mb-1">
                      {t(`vet.followupType.${fu.type}`)}
                    </Badge>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {isOverdue && <AlertTriangle className="w-3 h-3 text-destructive" />}
                      <span className={isOverdue ? 'text-destructive font-medium' : ''}>
                        {formatStandardDateTime(fu.due_at)}
                      </span>
                    </div>
                  </div>
                  {fu.status === 'open' && markAsDone && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-success hover:text-success hover:bg-success/10" onClick={() => markAsDone(fu.id)}>
                      <CheckCircle className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                {fu.notes && <p className="text-xs text-muted-foreground mt-1">{fu.notes}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
