import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useBoardingAdmissions, type AdmissionStatus, type BoardingAdmission } from "@/hooks/housing/useBoardingAdmissions";
import { useBillingLinks } from "@/hooks/billing/useBillingLinks";
import { getWarningCount } from "@/hooks/housing/admissionChecks";
import { usePermissions } from "@/hooks/usePermissions";
import { useI18n } from "@/i18n";
import { displayClientName } from "@/lib/displayHelpers";
import { Plus, Search, AlertTriangle, CheckCircle2, Clock, LogOut, Heart, Building2, CreditCard, DoorOpen, Receipt, FileX } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { AdmissionWizard } from "./AdmissionWizard";
import { AdmissionDetailSheet } from "./AdmissionDetailSheet";

type AdmissionSubFilter = 'all' | 'active' | 'checkout_pending' | 'checked_out' | 'draft' | 'no_invoice' | 'outstanding';

function getStatusBadge(status: AdmissionStatus, t: (key: string) => string) {
  switch (status) {
    case 'active':
      return <Badge className="bg-success/10 text-success border-success/20 text-[10px] px-1.5 py-0"><CheckCircle2 className="h-2.5 w-2.5 me-0.5" />{t('housing.admissions.status.active')}</Badge>;
    case 'checkout_pending':
      return <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px] px-1.5 py-0"><Clock className="h-2.5 w-2.5 me-0.5" />{t('housing.admissions.status.checkoutPending')}</Badge>;
    case 'checked_out':
      return <Badge variant="secondary" className="text-[10px] px-1.5 py-0"><LogOut className="h-2.5 w-2.5 me-0.5" />{t('housing.admissions.status.checkedOut')}</Badge>;
    case 'cancelled':
      return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{t('housing.admissions.status.cancelled')}</Badge>;
    case 'draft':
      return <Badge variant="outline" className="text-[10px] px-1.5 py-0">{t('housing.admissions.status.draft')}</Badge>;
    default:
      return <Badge variant="outline" className="text-[10px] px-1.5 py-0">{status}</Badge>;
  }
}

interface AdmissionsListProps {
  branchId?: string;
}

export function AdmissionsList({ branchId }: AdmissionsListProps) {
  const { t } = useI18n();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('boarding.admission.create');
  const [searchParams, setSearchParams] = useSearchParams();
  const [subFilter, setSubFilter] = useState<AdmissionSubFilter>('active');
  const [search, setSearch] = useState('');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedAdmissionId, setSelectedAdmissionId] = useState<string | null>(null);
  const [preselectedHorseId, setPreselectedHorseId] = useState<string | undefined>(undefined);

  // Handle startAdmission query param from IncomingArrivals
  useEffect(() => {
    const shouldStart = searchParams.get('startAdmission');
    const horseId = searchParams.get('horseId');
    if (shouldStart === 'true' && canCreate) {
      setPreselectedHorseId(horseId || undefined);
      setWizardOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('startAdmission');
      next.delete('horseId');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, canCreate, setSearchParams]);

  // Fetch all admissions for counts (no status filter) 
  const { admissions: allAdmissions, isLoading } = useBoardingAdmissions({
    status: 'all',
    search: search || undefined,
  });

  // Filter by branch if provided
  const branchFiltered = useMemo(() => 
    branchId ? allAdmissions.filter(a => a.branch_id === branchId) : allAdmissions,
    [allAdmissions, branchId]
  );

  // Compute counts for sub-filter badges
  const counts = useMemo(() => {
    const active = branchFiltered.filter(a => a.status === 'active').length;
    const checkoutPending = branchFiltered.filter(a => a.status === 'checkout_pending').length;
    const checkedOut = branchFiltered.filter(a => a.status === 'checked_out').length;
    const draft = branchFiltered.filter(a => a.status === 'draft').length;
    // no_invoice: active admissions with rates but no billing link (approximation)
    const withRates = branchFiltered.filter(a => a.status === 'active' && (a.daily_rate || a.monthly_rate));
    return { all: branchFiltered.length, active, checkoutPending, checkedOut, draft, withRates: withRates.length };
  }, [branchFiltered]);

  // Apply sub-filter
  const filteredAdmissions = useMemo(() => {
    switch (subFilter) {
      case 'active': return branchFiltered.filter(a => a.status === 'active');
      case 'checkout_pending': return branchFiltered.filter(a => a.status === 'checkout_pending');
      case 'checked_out': return branchFiltered.filter(a => a.status === 'checked_out');
      case 'draft': return branchFiltered.filter(a => a.status === 'draft');
      case 'no_invoice': return branchFiltered.filter(a => a.status === 'active' && (!a.daily_rate && !a.monthly_rate));
      case 'outstanding': return branchFiltered.filter(a => a.status === 'active' && !a.balance_cleared);
      default: return branchFiltered;
    }
  }, [branchFiltered, subFilter]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{t('housing.admissions.title')}</h2>
        {canCreate && (
          <Button onClick={() => setWizardOpen(true)} size="sm">
            <Plus className="h-4 w-4 me-1" />
            {t('housing.admissions.newAdmission')}
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('housing.admissions.searchPlaceholder')}
          className="ps-9"
        />
      </div>

      {/* Sub-filter tabs */}
      <Tabs value={subFilter} onValueChange={(v) => setSubFilter(v as AdmissionSubFilter)}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="all" className="gap-1.5">
            {t('common.all')}
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 min-w-4">{counts.all}</Badge>
          </TabsTrigger>
          <TabsTrigger value="active" className="gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t('housing.admissions.status.active')}
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 min-w-4">{counts.active}</Badge>
          </TabsTrigger>
          {counts.checkoutPending > 0 && (
            <TabsTrigger value="checkout_pending" className="gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {t('housing.admissions.status.checkoutPending')}
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 min-w-4 text-amber-600 border-amber-300">{counts.checkoutPending}</Badge>
            </TabsTrigger>
          )}
          <TabsTrigger value="checked_out" className="gap-1.5">
            <LogOut className="h-3.5 w-3.5" />
            {t('housing.admissions.status.checkedOut')}
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 min-w-4">{counts.checkedOut}</Badge>
          </TabsTrigger>
          {counts.draft > 0 && (
            <TabsTrigger value="draft" className="gap-1.5">
              {t('housing.admissions.status.draft')}
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 min-w-4">{counts.draft}</Badge>
            </TabsTrigger>
          )}
          <TabsTrigger value="no_invoice" className="gap-1.5">
            <FileX className="h-3.5 w-3.5" />
            {t('housing.admissions.subFilters.noInvoice')}
          </TabsTrigger>
          <TabsTrigger value="outstanding" className="gap-1.5">
            <Receipt className="h-3.5 w-3.5" />
            {t('housing.admissions.subFilters.outstanding')}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : filteredAdmissions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{t('housing.admissions.empty')}</p>
            {canCreate && (
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setWizardOpen(true)}>
                <Plus className="h-4 w-4 me-1" />
                {t('housing.admissions.createFirst')}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredAdmissions.map((admission) => (
            <AdmissionCard
              key={admission.id}
              admission={admission}
              onClick={() => setSelectedAdmissionId(admission.id)}
              t={t}
            />
          ))}
        </div>
      )}

      <AdmissionWizard
        open={wizardOpen}
        onOpenChange={(open) => {
          setWizardOpen(open);
          if (!open) setPreselectedHorseId(undefined);
        }}
        preselectedHorseId={preselectedHorseId}
      />
      <AdmissionDetailSheet
        admissionId={selectedAdmissionId}
        open={!!selectedAdmissionId}
        onOpenChange={(open) => { if (!open) setSelectedAdmissionId(null); }}
      />
    </div>
  );
}

function AdmissionCard({ admission, onClick, t }: { admission: BoardingAdmission; onClick: () => void; t: (key: string) => string }) {
  const warnCount = getWarningCount(admission.admission_checks || {});
  const stayDays = differenceInDays(
    admission.checked_out_at ? new Date(admission.checked_out_at) : new Date(),
    new Date(admission.admitted_at)
  );
  const hasRate = !!(admission.monthly_rate || admission.daily_rate);

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 shrink-0 mt-0.5">
            <AvatarImage src={admission.horse?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {admission.horse?.name?.charAt(0) || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 space-y-1.5">
            {/* Row 1: Horse name + status + warnings */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold truncate">
                {admission.horse?.name || t('common.unknown')}
              </span>
              {getStatusBadge(admission.status, t)}
              {admission.reason && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                  {t(`housing.admissions.reasons.${admission.reason}`)}
                </Badge>
              )}
              {warnCount > 0 && (
                <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px] px-1.5 py-0 gap-0.5">
                  <AlertTriangle className="h-2.5 w-2.5" />
                  {warnCount}
                </Badge>
              )}
            </div>
            {/* Row 2: Operational details */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              {(admission.client?.name || admission.client?.name_ar) && (
                <span className="flex items-center gap-1">
                  <span className="font-medium text-foreground/70">{displayClientName(admission.client.name, admission.client.name_ar, lang)}</span>
                </span>
              )}
              {admission.branch && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {admission.branch.name}
                </span>
              )}
              {admission.area && (
                <span className="flex items-center gap-1">
                  <span>›</span>
                  {admission.area.name}
                  {admission.area.facility_type && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 leading-tight">
                      {t(`housing.facilityTypes.${admission.area.facility_type}`)}
                    </Badge>
                  )}
                </span>
              )}
              {admission.unit && (
                <span className="flex items-center gap-1">
                  <DoorOpen className="h-3 w-3" />
                  {admission.unit.code}
                </span>
              )}
            </div>
            {/* Row 3: Duration + financial indicator */}
            <div className="flex items-center gap-3 text-xs flex-wrap">
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(admission.admitted_at), 'MMM d, yyyy')}
                <span className="text-foreground/60">·</span>
                <span className="font-medium text-foreground/70">{stayDays}{t('housing.admissions.list.daysUnit')}</span>
              </span>
              {hasRate ? (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <CreditCard className="h-3 w-3" />
                  {admission.monthly_rate
                    ? `${admission.monthly_rate} ${admission.rate_currency}/${t('housing.admissions.wizard.cycleMonthly').toLowerCase()}`
                    : `${admission.daily_rate} ${admission.rate_currency}/${t('housing.admissions.wizard.cycleDaily').toLowerCase()}`
                  }
                </span>
              ) : (
                <span className="text-amber-500 text-[10px] italic">{t('housing.admissions.list.noBilling')}</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
