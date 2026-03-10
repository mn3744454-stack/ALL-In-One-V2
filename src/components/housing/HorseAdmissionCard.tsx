import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { useI18n } from '@/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardCheck, Calendar, DoorOpen, User, Building2, FileText, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { useHorseCareNotes } from '@/hooks/housing/useHorseCareNotes';

const fromTable = (table: string) => (supabase as any).from(table);

interface HorseAdmissionCardProps {
  horseId: string;
}

export function HorseAdmissionCard({ horseId }: HorseAdmissionCardProps) {
  const { t, dir } = useI18n();
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;

  const { data: admission, isLoading } = useQuery({
    queryKey: ['horse-active-admission', tenantId, horseId],
    queryFn: async () => {
      if (!tenantId || !horseId) return null;
      const { data, error } = await fromTable('boarding_admissions')
        .select(`
          id, status, admitted_at, expected_departure, billing_cycle, rate_currency, monthly_rate, daily_rate,
          client:clients!client_id(id, name, name_ar),
          branch:branches!branch_id(id, name),
          unit:housing_units!unit_id(id, code, name)
        `)
        .eq('tenant_id', tenantId)
        .eq('horse_id', horseId)
        .in('status', ['active', 'checkout_pending'])
        .order('admitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!tenantId && !!horseId,
  });

  // Active care notes for this horse
  const { notes: careNotes } = useHorseCareNotes(horseId, admission?.id);
  const activeCareCount = careNotes.length;

  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  if (!admission) return null;

  const statusColors: Record<string, string> = {
    active: 'bg-success/10 text-success border-success/20',
    checkout_pending: 'text-amber-600 border-amber-300',
  };

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-primary" />
          {t('housing.horseProfile.activeAdmission')}
        </CardTitle>
        <Link to={`/dashboard/housing?tab=admissions`}>
          <Button variant="ghost" size="sm" className="text-xs h-7">
            {t('housing.horseProfile.viewDetails')}
            <ChevronRight className={`h-3 w-3 ms-1 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={statusColors[admission.status] || ''}>
            {t(`housing.admissions.status.${admission.status === 'checkout_pending' ? 'checkoutPending' : admission.status}`)}
          </Badge>
          {admission.unit && (
            <Badge variant="secondary" className="gap-1">
              <DoorOpen className="h-3 w-3" />
              {admission.unit.code}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          {admission.client && (
            <div className="flex items-center gap-1.5">
              <User className="h-3 w-3 text-muted-foreground" />
              <span className="truncate">{admission.client.name}</span>
            </div>
          )}
          {admission.branch && (
            <div className="flex items-center gap-1.5">
              <Building2 className="h-3 w-3 text-muted-foreground" />
              <span className="truncate">{admission.branch.name}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span>{t('housing.admissions.list.since')} {format(new Date(admission.admitted_at), 'MMM d')}</span>
          </div>
          {admission.expected_departure && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span>{t('housing.admissions.detail.expectedDeparture')}: {format(new Date(admission.expected_departure), 'MMM d')}</span>
            </div>
          )}
        </div>

        {activeCareCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
            <FileText className="h-3 w-3" />
            {activeCareCount} {t('housing.horseProfile.activeCareNotes')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
