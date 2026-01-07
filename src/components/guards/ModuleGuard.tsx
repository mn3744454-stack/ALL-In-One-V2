import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { useI18n } from "@/i18n";
import { toast } from "sonner";

interface ModuleGuardProps {
  module: 'laboratory' | 'vet' | 'housing' | 'movement' | 'breeding';
  children: React.ReactNode;
  redirectTo?: string;
}

export function ModuleGuard({ module, children, redirectTo = '/dashboard' }: ModuleGuardProps) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { 
    labMode, 
    vetEnabled, 
    housingEnabled, 
    movementEnabled, 
    breedingEnabled, 
    loading 
  } = useModuleAccess();

  const isEnabled = (() => {
    switch (module) {
      case 'laboratory':
        return labMode !== 'none';
      case 'vet':
        return vetEnabled;
      case 'housing':
        return housingEnabled;
      case 'movement':
        return movementEnabled;
      case 'breeding':
        return breedingEnabled;
      default:
        return true;
    }
  })();

  useEffect(() => {
    if (!loading && !isEnabled) {
      toast.error(t('modules.notAvailable') || 'This module is not available for your organization');
      navigate(redirectTo, { replace: true });
    }
  }, [loading, isEnabled, navigate, redirectTo, t]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isEnabled) {
    return null;
  }

  return <>{children}</>;
}
