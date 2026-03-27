import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useBoardingAdmissions, type AdmissionStatus, type BoardingAdmission } from "@/hooks/housing/useBoardingAdmissions";
import { getWarningCount } from "@/hooks/housing/admissionChecks";
import { usePermissions } from "@/hooks/usePermissions";
import { useI18n } from "@/i18n";
import { BilingualName } from "@/components/ui/BilingualName";
import { Plus, Search, AlertTriangle, CheckCircle2, Clock, LogOut, Heart, Building2, CreditCard, DoorOpen, Receipt, FileX } from "lucide-react";
import { formatStandardDate } from "@/lib/displayHelpers";
import { formatStayDuration, formatBoardingRate, computeStayDays } from "@/lib/boardingUtils";
import { cn } from "@/lib/utils";
import { AdmissionWizard } from "./AdmissionWizard";
import { AdmissionDetailSheet } from "./AdmissionDetailSheet";
import { ViewSwitcher, getGridClass } from "@/components/ui/ViewSwitcher";
import { useViewPreference } from "@/hooks/useViewPreference";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";


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
  const { t, lang } = useI18n();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('boarding.admission.create');
  const { viewMode, gridColumns, setViewMode, setGridColumns } = useViewPreference('housing-admissions');
  const [searchParams, setSearchParams] = useSearchParams();
  const [subFilter, setSubFilter] = useState<AdmissionSubFilter>('active');
  const [search, setSearch] = useState('');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedAdmissionId, setSelectedAdmissionId] = useState<string | null>(null);
  const [preselectedHorseId, setPreselectedHorseId] = useState<string | undefined>(undefined);

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

  const { admissions: allAdmissions, isLoading } = useBoardingAdmissions({
    status: 'all',
    search: search || undefined,
  });

  const branchFiltered = useMemo(() => 
    branchId ? allAdmissions.filter(a => a.branch_id === branchId) : allAdmissions,
    [allAdmissions, branchId]
  );

  // Fetch billing links for all active boarding admissions to determine "no invoice" state
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;

  const activeAdmissionIds = useMemo(() =>
    branchFiltered.filter(a => a.status === 'active' || a.status === 'checkout_pending').map(a => a.id),
    [branchFiltered]
  );

  const { data: boardingBillingLinks = [] } = useQuery({
    queryKey: ['billing-links-boarding-bulk', tenantId, activeAdmissionIds],
    queryFn: async () => {
      if (!tenantId || activeAdmissionIds.length === 0) return [];
      const { data } = await supabase
        .from('billing_links')
        .select('source_id')
        .eq('tenant_id', tenantId)
        .eq('source_type', 'boarding')
        .in('source_id', activeAdmissionIds);
      return data || [];
    },
    enabled: !!tenantId && activeAdmissionIds.length > 0,
  });

  const invoicedAdmissionIds = useMemo(() =>
    new Set(boardingBillingLinks.map((l: { source_id: string }) => l.source_id)),
    [boardingBillingLinks]
  );

  const counts = useMemo(() => {
    const active = branchFiltered.filter(a => a.status === 'active').length;
    const checkoutPending = branchFiltered.filter(a => a.status === 'checkout_pending').length;
    const checkedOut = branchFiltered.filter(a => a.status === 'checked_out').length;
    const draft = branchFiltered.filter(a => a.status === 'draft').length;
    // "No Invoice" = active admissions with a rate but no billing_link (never invoiced)
    const noInvoice = branchFiltered.filter(a =>
      (a.status === 'active' || a.status === 'checkout_pending') &&
      (a.daily_rate || a.monthly_rate) &&
      !invoicedAdmissionIds.has(a.id)
    ).length;
    // "Outstanding" = active/pending admissions with a rate that are not balance-cleared and have been invoiced
    const outstanding = branchFiltered.filter(a =>
      (a.status === 'active' || a.status === 'checkout_pending') &&
      !a.balance_cleared &&
      invoicedAdmissionIds.has(a.id)
    ).length;
    return { all: branchFiltered.length, active, checkoutPending, checkedOut, draft, noInvoice, outstanding };
  }, [branchFiltered, invoicedAdmissionIds]);

  const filteredAdmissions = useMemo(() => {
    switch (subFilter) {
      case 'active': return branchFiltered.filter(a => a.status === 'active');
      case 'checkout_pending': return branchFiltered.filter(a => a.status === 'checkout_pending');
      case 'checked_out': return branchFiltered.filter(a => a.status === 'checked_out');
      case 'draft': return branchFiltered.filter(a => a.status === 'draft');
      case 'no_invoice': return branchFiltered.filter(a =>
        (a.status === 'active' || a.status === 'checkout_pending') &&
        (a.daily_rate || a.monthly_rate) &&
        !invoicedAdmissionIds.has(a.id)
      );
      case 'outstanding': return branchFiltered.filter(a =>
        (a.status === 'active' || a.status === 'checkout_pending') &&
        !a.balance_cleared &&
        invoicedAdmissionIds.has(a.id)
      );
      default: return branchFiltered;
    }
  }, [branchFiltered, subFilter, invoicedAdmissionIds]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{t('housing.admissions.title')}</h2>
        <div className="flex items-center gap-2">
          <div className="hidden md:block">
            <ViewSwitcher
              viewMode={viewMode}
              gridColumns={gridColumns}
              onViewModeChange={setViewMode}
              onGridColumnsChange={setGridColumns}
              showTable={true}
            />
          </div>
          {canCreate && (
            <Button onClick={() => setWizardOpen(true)} size="sm">
              <Plus className="h-4 w-4 me-1" />
              {t('housing.admissions.newAdmission')}
            </Button>
          )}
        </div>
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

      {/* Sub-filter tabs – operational lifecycle + financial state */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Operational lifecycle group */}
        <Tabs value={['all','active','checkout_pending','checked_out','draft'].includes(subFilter) ? subFilter : ''} onValueChange={(v) => setSubFilter(v as AdmissionSubFilter)}>
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
          </TabsList>
        </Tabs>

        {/* Visual separator */}
        <div className="h-6 w-px bg-border hidden sm:block" />

        {/* Financial state group */}
        <Tabs value={['no_invoice','outstanding'].includes(subFilter) ? subFilter : ''} onValueChange={(v) => setSubFilter(v as AdmissionSubFilter)}>
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="no_invoice" className="gap-1.5">
              <FileX className="h-3.5 w-3.5" />
              {t('housing.admissions.subFilters.noInvoice')}
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 min-w-4">{counts.noInvoice}</Badge>
            </TabsTrigger>
            <TabsTrigger value="outstanding" className="gap-1.5">
              <Receipt className="h-3.5 w-3.5" />
              {t('housing.admissions.subFilters.outstanding')}
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 min-w-4">{counts.outstanding}</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

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
      ) : viewMode === 'table' ? (
        <div className="rounded-md border" dir={isRTL ? 'rtl' : 'ltr'}>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/80">
                <TableHead className="text-start font-bold text-sm">{t('housing.admissions.table.horse')}</TableHead>
                <TableHead className="text-start font-bold text-sm">{t('housing.admissions.table.client')}</TableHead>
                <TableHead className="text-start font-bold text-sm">{t('housing.admissions.table.branch')}</TableHead>
                <TableHead className="text-center font-bold text-sm">{t('housing.admissions.table.unit')}</TableHead>
                <TableHead className="text-center font-bold text-sm">{t('housing.admissions.table.status')}</TableHead>
                <TableHead className="text-center font-bold text-sm whitespace-nowrap">{t('housing.admissions.table.admitted')}</TableHead>
                <TableHead className="text-center font-bold text-sm">{t('housing.admissions.table.stay')}</TableHead>
                <TableHead className="text-start font-bold text-sm">{t('housing.admissions.table.rate')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAdmissions.map((admission) => {
                const stayDays = computeStayDays(admission.admitted_at, admission.checked_out_at);
                const rateDisplay = formatBoardingRate(admission.daily_rate, admission.monthly_rate, admission.rate_currency, lang);
                return (
                  <TableRow key={admission.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedAdmissionId(admission.id)}>
                    <TableCell className="text-start">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={admission.horse?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">{admission.horse?.name?.charAt(0) || '?'}</AvatarFallback>
                        </Avatar>
                        <BilingualName name={admission.horse?.name} nameAr={admission.horse?.name_ar} primaryClassName="text-sm" />
                      </div>
                    </TableCell>
                    <TableCell className="text-start text-muted-foreground text-sm">
                      {(admission.client?.name || admission.client?.name_ar)
                        ? <BilingualName name={admission.client.name} nameAr={admission.client.name_ar} primaryClassName="text-sm font-normal" />
                        : '—'}
                    </TableCell>
                    <TableCell className="text-start text-muted-foreground text-sm">
                      {admission.branch
                        ? <BilingualName name={admission.branch.name} nameAr={admission.branch.name_ar} primaryClassName="text-sm font-normal" />
                        : '—'}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground text-sm">{admission.unit?.code || '—'}</TableCell>
                    <TableCell className="text-center">{getStatusBadge(admission.status, t)}</TableCell>
                    <TableCell className="text-center whitespace-nowrap text-muted-foreground text-sm">{formatStandardDate(admission.admitted_at)}</TableCell>
                    <TableCell className="text-center text-sm whitespace-nowrap">
                      <span dir="ltr" className="inline-block">{formatStayDuration(stayDays, lang)}</span>
                    </TableCell>
                    <TableCell className="text-start whitespace-nowrap text-sm">
                      {rateDisplay
                        ? <span dir="ltr" className="inline-block">{rateDisplay}</span>
                        : <span className="text-amber-500 text-xs italic">{t('housing.admissions.list.noBilling')}</span>
                      }
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className={getGridClass(gridColumns, viewMode)}>
          {filteredAdmissions.map((admission) => (
            <AdmissionCard
              key={admission.id}
              admission={admission}
              onClick={() => setSelectedAdmissionId(admission.id)}
              t={t}
              lang={lang}
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

function AdmissionCard({ admission, onClick, t, lang }: { admission: BoardingAdmission; onClick: () => void; t: (key: string) => string; lang: string }) {
  const warnCount = getWarningCount(admission.admission_checks || {});
  const stayDays = computeStayDays(admission.admitted_at, admission.checked_out_at);
  const rateDisplay = formatBoardingRate(admission.daily_rate, admission.monthly_rate, admission.rate_currency, lang);

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
            <div className="flex items-center gap-2 flex-wrap">
              <BilingualName name={admission.horse?.name} nameAr={admission.horse?.name_ar} primaryClassName="font-semibold" />
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
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              {(admission.client?.name || admission.client?.name_ar) && (
                <span className="flex items-center gap-1">
                  <BilingualName name={admission.client.name} nameAr={admission.client.name_ar} primaryClassName="text-xs font-medium text-foreground/70" secondaryClassName="text-[10px]" />
                </span>
              )}
              {admission.branch && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  <BilingualName name={admission.branch.name} nameAr={admission.branch.name_ar} primaryClassName="text-xs" inline />
                </span>
              )}
              {admission.area && (
                <span className="flex items-center gap-1">
                  <span>›</span>
                  <BilingualName name={admission.area.name} nameAr={admission.area.name_ar} primaryClassName="text-xs" inline />
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
            <div className="flex items-center gap-3 text-xs flex-wrap">
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatStandardDate(admission.admitted_at)}
                <span className="text-foreground/60">·</span>
                <span className="font-medium text-foreground/70">{formatStayDuration(stayDays, lang)}</span>
              </span>
              {rateDisplay ? (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <CreditCard className="h-3 w-3" />
                  {rateDisplay}
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
