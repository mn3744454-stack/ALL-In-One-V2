import { useState } from 'react';
import { useI18n } from '@/i18n';
import { useHRSettings } from '@/hooks/hr/useHRSettings';
import { useHRDemo } from '@/hooks/hr/useHRDemo';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
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
  Users,
  Calendar,
  FileText,
  FlaskConical,
  Download,
  Trash2,
  CheckCircle,
  Menu,
  ChevronLeft,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function DashboardHRSettings() {
  const { t, dir } = useI18n();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
    removeDemoData,
    isLoading: isLoadingDemo,
    isRemoving,
  } = useHRDemo();

  const modules = [
    {
      key: 'assignments' as const,
      icon: Users,
      label: t('hr.settings.assignments'),
      description: t('hr.settings.assignmentsDesc'),
      available: true,
    },
    {
      key: 'attendance' as const,
      icon: Calendar,
      label: t('hr.settings.attendance'),
      description: t('hr.settings.attendanceDesc'),
      available: false,
    },
    {
      key: 'documents' as const,
      icon: FileText,
      label: t('hr.settings.documents'),
      description: t('hr.settings.documentsDesc'),
      available: false,
    },
  ];

  const handleModuleToggle = async (key: 'assignments' | 'attendance' | 'documents', enabled: boolean) => {
    if (!canManage) return;
    await updateModules({ [key]: enabled });
  };

  const handleRemoveDemo = async () => {
    await removeDemoData();
    setShowRemoveConfirm(false);
  };

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
              <Settings className="w-5 h-5 text-gold" />
              <h1 className="font-display text-lg font-semibold text-navy">
                {t('hr.settings.title')}
              </h1>
            </div>
            <div className="w-20" /> {/* Spacer for centering */}
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 max-w-3xl mx-auto w-full">
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
        </main>
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
    </div>
  );
}
