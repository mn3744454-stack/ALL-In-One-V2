import { useState } from 'react';
import { useI18n } from '@/i18n';
import { useHRSettings } from '@/hooks/hr/useHRSettings';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Menu, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DashboardHRAttendance() {
  const { t, dir } = useI18n();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isModuleEnabled, isLoading } = useHRSettings();

  const isEnabled = isModuleEnabled('attendance');

  return (
    <div className="min-h-screen bg-cream flex" dir={dir}>
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-cream/80 backdrop-blur-xl border-b border-border/50">
          <div className="flex items-center justify-between h-16 px-4 lg:px-8">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2"
                onClick={() => navigate('/dashboard/hr')}
              >
                <ChevronLeft className="w-4 h-4" />
                {t('common.back')}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gold" />
              <h1 className="font-display text-lg font-semibold text-navy">
                {t('hr.attendance.title')}
              </h1>
            </div>
            <div className="w-20" />
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 flex items-center justify-center">
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
        </main>
      </div>
    </div>
  );
}
