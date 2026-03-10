import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useSingleAdmission, useAdmissionStatusHistory } from "@/hooks/housing/useBoardingAdmissions";
import { usePermissions } from "@/hooks/usePermissions";
import { useI18n } from "@/i18n";
import { format } from "date-fns";
import {
  Heart, User, Building2, DoorOpen, CreditCard, Clock,
  CheckCircle2, AlertTriangle, LogOut, Calendar, FileText
} from "lucide-react";
import { CheckoutDialog } from "./CheckoutDialog";
import { CareNotesList } from "./CareNotesList";

interface AdmissionDetailSheetProps {
  admissionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdmissionDetailSheet({ admissionId, open, onOpenChange }: AdmissionDetailSheetProps) {
  const { t, dir } = useI18n();
  const { hasPermission } = usePermissions();
  const canCheckout = hasPermission('boarding.admission.checkout');
  const { data: admission, isLoading } = useSingleAdmission(admissionId);
  const { data: history = [] } = useAdmissionStatusHistory(admissionId);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const checks = admission?.admission_checks || {};
  const warnings = Object.entries(checks).filter(([, v]: [string, any]) => v?.status === 'warning');

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side={dir === 'rtl' ? 'left' : 'right'} className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t('housing.admissions.detail.title')}</SheetTitle>
          </SheetHeader>

          {isLoading || !admission ? (
            <div className="space-y-4 mt-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <div className="space-y-4 mt-4">
              {/* Horse Info */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={admission.horse?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {admission.horse?.name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold">{admission.horse?.name || t('common.unknown')}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <StatusBadge status={admission.status} t={t} />
                        {admission.reason && (
                          <Badge variant="outline" className="capitalize text-xs">
                            {t(`housing.admissions.reasons.${admission.reason}`)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Warnings */}
              {warnings.length > 0 && (
                <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-950/20">
                  <CardContent className="p-3 space-y-1">
                    {warnings.map(([key, val]: [string, any]) => (
                      <div key={key} className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span>{val.message}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Details */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  {admission.client && (
                    <DetailRow icon={User} label={t('housing.admissions.detail.client')} value={admission.client.name} />
                  )}
                  {admission.branch && (
                    <DetailRow icon={Building2} label={t('housing.admissions.detail.branch')} value={admission.branch.name} />
                  )}
                  {admission.area && (
                    <DetailRow icon={Building2} label={t('housing.admissions.detail.area')} value={admission.area.name} />
                  )}
                  {admission.unit && (
                    <DetailRow icon={DoorOpen} label={t('housing.admissions.detail.unit')} value={admission.unit.code} />
                  )}
                  <DetailRow icon={Calendar} label={t('housing.admissions.detail.admittedAt')} value={format(new Date(admission.admitted_at), 'PPp')} />
                  {admission.expected_departure && (
                    <DetailRow icon={Calendar} label={t('housing.admissions.detail.expectedDeparture')} value={format(new Date(admission.expected_departure), 'PP')} />
                  )}
                  {admission.checked_out_at && (
                    <DetailRow icon={LogOut} label={t('housing.admissions.detail.checkedOutAt')} value={format(new Date(admission.checked_out_at), 'PPp')} />
                  )}
                  {(admission.monthly_rate || admission.daily_rate) && (
                    <DetailRow
                      icon={CreditCard}
                      label={t('housing.admissions.detail.rate')}
                      value={`${admission.monthly_rate ? `${admission.monthly_rate}/${t('housing.admissions.wizard.cycleMonthly').toLowerCase()}` : ''}${admission.daily_rate ? ` ${admission.daily_rate}/${t('housing.admissions.wizard.cycleDaily').toLowerCase()}` : ''} ${admission.rate_currency}`}
                    />
                  )}
                  {admission.special_instructions && (
                    <DetailRow icon={FileText} label={t('housing.admissions.detail.instructions')} value={admission.special_instructions} />
                  )}
                  {admission.emergency_contact && (
                    <DetailRow icon={User} label={t('housing.admissions.detail.emergencyContact')} value={admission.emergency_contact} />
                  )}
                </CardContent>
              </Card>

              {/* Status History */}
              {history.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {t('housing.admissions.detail.statusHistory')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="space-y-2">
                      {history.map((h: any) => (
                        <div key={h.id} className="flex items-center gap-2 text-sm">
                          <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                          <span className="text-muted-foreground">{format(new Date(h.created_at), 'MMM d, HH:mm')}</span>
                          <span>→ <Badge variant="outline" className="text-xs capitalize">{h.to_status}</Badge></span>
                          {h.changed_by_profile?.full_name && (
                            <span className="text-muted-foreground text-xs">
                              {t('housing.admissions.detail.by')} {h.changed_by_profile.full_name}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Care Notes */}
              {admission.horse_id && (
                <CareNotesList
                  horseId={admission.horse_id}
                  admissionId={admission.id}
                />
              )}

              {/* Actions */}
              {canCheckout && (admission.status === 'active' || admission.status === 'checkout_pending') && (
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setCheckoutOpen(true)}
                  >
                    <LogOut className="h-4 w-4 me-1" />
                    {admission.status === 'checkout_pending'
                      ? t('housing.admissions.checkout.confirmCheckout')
                      : t('housing.admissions.checkout.initiateCheckout')
                    }
                  </Button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {admission && (
        <CheckoutDialog
          admission={admission}
          open={checkoutOpen}
          onOpenChange={setCheckoutOpen}
          onSuccess={() => {
            setCheckoutOpen(false);
            onOpenChange(false);
          }}
        />
      )}
    </>
  );
}

function StatusBadge({ status, t }: { status: string; t: (key: string) => string }) {
  switch (status) {
    case 'active': return <Badge className="bg-success/10 text-success border-success/20"><CheckCircle2 className="h-3 w-3 me-1" />{t('housing.admissions.status.active')}</Badge>;
    case 'checkout_pending': return <Badge variant="outline" className="text-amber-600"><Clock className="h-3 w-3 me-1" />{t('housing.admissions.status.checkoutPending')}</Badge>;
    case 'checked_out': return <Badge variant="secondary"><LogOut className="h-3 w-3 me-1" />{t('housing.admissions.status.checkedOut')}</Badge>;
    case 'draft': return <Badge variant="outline">{t('housing.admissions.status.draft')}</Badge>;
    case 'cancelled': return <Badge variant="destructive">{t('housing.admissions.status.cancelled')}</Badge>;
    default: return <Badge variant="outline" className="capitalize">{status}</Badge>;
  }
}

function DetailRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <span className="text-muted-foreground">{label}: </span>
        <span className="font-medium">{value}</span>
      </div>
    </div>
  );
}
