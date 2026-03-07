import { useState } from 'react';
import { useI18n } from '@/i18n';
import { useHRSettings } from '@/hooks/hr/useHRSettings';
import { useHRDemo } from '@/hooks/hr/useHRDemo';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Settings,
  FlaskConical,
  Download,
  Trash2,
  CheckCircle,
} from 'lucide-react';
import { MobilePageHeader } from '@/components/navigation';
import { cn } from '@/lib/utils';

export default function DashboardHRSettings() {
  const { t } = useI18n();
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  const {
    settings,
    isLoading: isLoadingSettings,
    canManage,
    isModuleEnabled,
    updateModules,
    isUpdating,
  } = useHRSettings();

  const {
    canManageDemo,
    demoExists,
    isCheckingDemo,
    loadDemoData,
    isLoading: isLoadingDemo,
    removeDemoData,
    isRemoving,
  } = useHRDemo();

  const modules = [
    { key: 'attendance', icon: Settings, label: t('hr.settings.attendance'), description: t('hr.settings.attendanceDesc'), available: true },
    { key: 'payroll', icon: Settings, label: t('hr.settings.payroll'), description: t('hr.settings.payrollDesc'), available: true },
    { key: 'documents', icon: Settings, label: t('hr.settings.documents'), description: t('hr.settings.documentsDesc'), available: false },
  ];

  const handleModuleToggle = async (key: string, enabled: boolean) => {
    const current = settings?.enabled_modules || {} as Record<string, boolean>;
    await updateModules({ ...current, [key]: enabled });
  };

  const handleRemoveDemo = async () => {
    await removeDemoData();
    setShowRemoveConfirm(false);
  };

  return (
    <DashboardShell>
      <MobilePageHeader title={t('hr.settings.title')} backTo="/dashboard/hr" />

      <div className="flex-1 p-4 lg:p-8 max-w-3xl mx-auto w-full">
        <div className="space-y-6">
          {/* Modules Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-gold" />
                {t('hr.settings.modules')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingSettings ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="w-10 h-10 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                      <Skeleton className="w-10 h-6 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : (
                modules.map((module) => {
                  const Icon = module.icon;
                  const isEnabled = isModuleEnabled(module.key);

                  return (
                    <div
                      key={module.key}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-lg border",
                        isEnabled ? "bg-muted/30 border-border" : "bg-background border-border/50"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                        isEnabled ? "bg-gold/20 text-gold" : "bg-muted text-muted-foreground"
                      )}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Label className="font-medium">{module.label}</Label>
                          {!module.available && (
                            <Badge variant="outline" className="text-xs">
                              {t('hr.settings.comingSoon')}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {module.description}
                        </p>
                      </div>
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) => handleModuleToggle(module.key, checked)}
                        disabled={!canManage || isUpdating || !module.available}
                      />
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Demo Mode Card */}
          {canManageDemo && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FlaskConical className="w-5 h-5 text-gold" />
                  {t('hr.demo.title')}
                </CardTitle>
                <CardDescription>
                  {t('hr.demo.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={() => loadDemoData()}
                    disabled={demoExists || isLoadingDemo || isCheckingDemo}
                    variant="outline"
                    className="flex-1 gap-2"
                  >
                    <Download className="w-4 h-4" />
                    {t('hr.demo.load')}
                  </Button>
                  <Button
                    onClick={() => setShowRemoveConfirm(true)}
                    disabled={!demoExists || isRemoving || isCheckingDemo}
                    variant="destructive"
                    className="flex-1 gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t('hr.demo.remove')}
                  </Button>
                </div>
                {demoExists && (
                  <Badge variant="secondary" className="gap-1.5">
                    <CheckCircle className="w-3 h-3" />
                    {t('hr.demo.active')}
                  </Badge>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Remove Demo Confirmation */}
      <AlertDialog open={showRemoveConfirm} onOpenChange={setShowRemoveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('hr.demo.remove')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('hr.demo.confirmRemove')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveDemo} disabled={isRemoving}>
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardShell>
  );
}
