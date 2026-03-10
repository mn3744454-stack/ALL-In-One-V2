import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { useI18n } from '@/i18n';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, CalendarClock, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';

const fromTable = (table: string) => (supabase as any).from(table);

interface BoardingStats {
  activeBoarders: number;
  upcomingDepartures: number;
  pendingCheckouts: number;
}

function useBoardingStats() {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;

  return useQuery({
    queryKey: ['boarding-stats', tenantId],
    queryFn: async (): Promise<BoardingStats> => {
      if (!tenantId) return { activeBoarders: 0, upcomingDepartures: 0, pendingCheckouts: 0 };

      const [activeRes, pendingRes, departingRes] = await Promise.all([
        fromTable('boarding_admissions')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .eq('status', 'active'),
        fromTable('boarding_admissions')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .eq('status', 'checkout_pending'),
        fromTable('boarding_admissions')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .eq('status', 'active')
          .lte('expected_departure', new Date(Date.now() + 7 * 86400000).toISOString()),
      ]);

      return {
        activeBoarders: activeRes.count || 0,
        pendingCheckouts: pendingRes.count || 0,
        upcomingDepartures: departingRes.count || 0,
      };
    },
    enabled: !!tenantId,
    refetchInterval: 60000,
  });
}

export function BoardingDashboardWidgets() {
  const { t } = useI18n();
  const { data: stats, isLoading } = useBoardingStats();

  if (isLoading || !stats) return null;

  const widgets = [
    {
      label: t('housing.dashboard.activeBoarders'),
      value: stats.activeBoarders,
      icon: Heart,
      color: 'text-success',
      bg: 'bg-success/10',
      link: '/dashboard/housing?tab=admissions',
    },
    {
      label: t('housing.dashboard.upcomingDepartures'),
      value: stats.upcomingDepartures,
      icon: CalendarClock,
      color: 'text-amber-600',
      bg: 'bg-amber-100/50 dark:bg-amber-950/20',
      link: '/dashboard/housing?tab=admissions',
    },
    {
      label: t('housing.dashboard.pendingCheckouts'),
      value: stats.pendingCheckouts,
      icon: LogOut,
      color: 'text-primary',
      bg: 'bg-primary/10',
      link: '/dashboard/housing?tab=admissions',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {widgets.map(w => (
        <Link key={w.label} to={w.link}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`${w.bg} rounded-lg p-2.5`}>
                <w.icon className={`h-5 w-5 ${w.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{w.value}</p>
                <p className="text-xs text-muted-foreground">{w.label}</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
