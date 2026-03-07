import { useState } from 'react';
import { useI18n } from '@/i18n';
import { useHRSettings } from '@/hooks/hr/useHRSettings';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { PageToolbar } from '@/components/layout/PageToolbar';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import { MobilePageHeader } from '@/components/navigation';

export default function DashboardHRAttendance() {
  const { t } = useI18n();
  const { isModuleEnabled, isLoading } = useHRSettings();

  const isEnabled = isModuleEnabled('attendance');

  return (
    <DashboardShell>
      {/* Mobile Header */}
      <MobilePageHeader title={t('hr.attendance.title')} backTo="/dashboard/hr" />
      <PageToolbar title={t('hr.attendance.title')} />

      <div className="flex-1 p-4 lg:p-8 flex items-center justify-center">
        {!isEnabled && !isLoading && (
          <Card className="max-w-md w-full">
            <CardContent className="py-12 text-center">
              <Calendar className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">
                {t('hr.attendance.comingSoon')}
              </h2>
              <p className="text-muted-foreground">
                {t('hr.attendance.comingSoonDesc')}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardShell>
  );
}
