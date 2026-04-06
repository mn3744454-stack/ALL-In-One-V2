import { useState, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BilingualName } from "@/components/ui/BilingualName";
import { UnitTypeBadge } from "./UnitTypeBadge";
import { OccupancyBadge } from "./OccupancyBadge";
import { AssignHorseDialog } from "./AssignHorseDialog";
import { LifecycleActionMenu, LifecycleStateBadge, type LifecycleBlocker } from "./LifecycleActionMenu";
import { useUnitOccupants } from "@/hooks/housing/useUnitOccupants";
import { useHousingUnits } from "@/hooks/housing/useHousingUnits";
import { useI18n } from "@/i18n";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { cn } from "@/lib/utils";
import { formatStandardDate } from "@/lib/displayHelpers";
import { Plus, LogOut, Home, Trees, BedDouble, Loader2, Pencil, Check, X, Wrench, Ban, CircleCheck, MoreVertical } from "lucide-react";
import type { HousingUnit } from "@/hooks/housing/useHousingUnits";

interface UnitDetailsSheetProps {
  unit: HousingUnit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UnitDetailsSheet({ unit, open, onOpenChange }: UnitDetailsSheetProps) {
  const { t, dir, lang: language } = useI18n();
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [vacateTarget, setVacateTarget] = useState<{ occupantId: string; horseId: string; horseName: string } | null>(null);
  
  // Inline editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');
  const [showOccupiedWarning, setShowOccupiedWarning] = useState(false);
  const [pendingEdit, setPendingEdit] = useState<{ code: string; name: string } | null>(null);

  // Status change state
  const [statusChangeTarget, setStatusChangeTarget] = useState<{ status: string; warning: string } | null>(null);

  const { 
    occupants, 
    isLoading, 
    canManage, 
    vacateHorse, 
    isVacating 
  } = useUnitOccupants(unit?.id);

  const { updateUnit, setUnitStatus } = useHousingUnits();

  if (!unit) return null;

  const displayName = language === 'ar' && unit.name_ar ? unit.name_ar : (unit.name || unit.code);
  const isFull = (unit.current_occupants || 0) >= unit.capacity;
  const isOccupied = occupants.length > 0;
  const isMaintenance = unit.status === 'maintenance';
  const isOutOfService = unit.status === 'out_of_service';
  const isUnavailable = isMaintenance || isOutOfService;
  const canAssign = !isFull && !isUnavailable;

  const iconMap: Record<string, React.ElementType> = {
    stall: Home,
    paddock: Trees,
    room: BedDouble,
  };
  const Icon = iconMap[unit.unit_type] || Home;

  const handleStartEditing = () => {
    setEditCode(unit.code);
    setEditName(unit.name || unit.code);
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setEditCode('');
    setEditName('');
  };

  const handleSaveEdit = () => {
    const codeChanged = editCode !== unit.code;
    const nameChanged = editName !== (unit.name || unit.code);
    if (!codeChanged && !nameChanged) {
      setIsEditing(false);
      return;
    }
    if (isOccupied) {
      setPendingEdit({ code: editCode, name: editName });
      setShowOccupiedWarning(true);
      return;
    }
    commitEdit(editCode, editName);
  };

  const commitEdit = async (code: string, name: string) => {
    try {
      await updateUnit({ id: unit.id, code, name });
      setIsEditing(false);
    } catch {
      // handled by mutation
    }
  };

  const handleConfirmOccupiedEdit = async () => {
    if (!pendingEdit) return;
    await commitEdit(pendingEdit.code, pendingEdit.name);
    setPendingEdit(null);
    setShowOccupiedWarning(false);
  };

  const handleVacateConfirm = async () => {
    if (!vacateTarget) return;
    try {
      await vacateHorse({ occupantId: vacateTarget.occupantId, horseId: vacateTarget.horseId });
    } finally {
      setVacateTarget(null);
    }
  };

  const handleStatusChange = async () => {
    if (!statusChangeTarget) return;
    try {
      await setUnitStatus({ id: unit.id, status: statusChangeTarget.status });
    } finally {
      setStatusChangeTarget(null);
    }
  };

  // Status badge for the header area
  const getStatusBadge = () => {
    if (isOutOfService) {
      return (
        <Badge variant="outline" className="gap-1 bg-destructive/10 text-destructive border-destructive/30">
          <Ban className="w-3 h-3" />
          {t('housing.units.status.outOfService')}
        </Badge>
      );
    }
    if (isMaintenance) {
      return (
        <Badge variant="outline" className="gap-1 bg-muted text-muted-foreground border-muted-foreground/30">
          <Wrench className="w-3 h-3" />
          {t('housing.units.status.maintenance')}
        </Badge>
      );
    }
    return null;
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => { if (!o) handleCancelEditing(); onOpenChange(o); }}>
        <SheetContent side={dir === 'rtl' ? 'left' : 'right'} className="w-full sm:max-w-md">
          <SheetHeader>
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                isOutOfService ? "bg-destructive/10" : isMaintenance ? "bg-muted" : "bg-primary/10"
              )}>
                <Icon className={cn(
                  "w-6 h-6",
                  isOutOfService ? "text-destructive" : isMaintenance ? "text-muted-foreground" : "text-primary"
                )} />
              </div>
              <div className="flex-1">
                <SheetTitle>{displayName}</SheetTitle>
                <SheetDescription>{unit.code}</SheetDescription>
              </div>
              <div className="flex items-center gap-1">
                {canManage && !isEditing && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleStartEditing}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('housing.units.editRoom')}</TooltipContent>
                  </Tooltip>
                )}
                {canManage && !isEditing && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreVertical className="w-3.5 h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {unit.status !== 'available' && (
                        <DropdownMenuItem onClick={() => setStatusChangeTarget({ status: 'available', warning: '' })}>
                          <CircleCheck className="w-4 h-4 me-2 text-emerald-600" />
                          {t('housing.units.setAvailable')}
                        </DropdownMenuItem>
                      )}
                      {unit.status !== 'maintenance' && !isOccupied && (
                        <DropdownMenuItem onClick={() => setStatusChangeTarget({
                          status: 'maintenance',
                          warning: t('housing.units.maintenanceWarning'),
                        })}>
                          <Wrench className="w-4 h-4 me-2 text-muted-foreground" />
                          {t('housing.units.setMaintenance')}
                        </DropdownMenuItem>
                      )}
                      {unit.status !== 'out_of_service' && !isOccupied && (
                        <DropdownMenuItem onClick={() => setStatusChangeTarget({
                          status: 'out_of_service',
                          warning: t('housing.units.outOfServiceWarning'),
                        })}>
                          <Ban className="w-4 h-4 me-2 text-destructive" />
                          {t('housing.units.setOutOfService')}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Inline edit fields */}
            {isEditing && (
              <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t('housing.units.roomCode')}</Label>
                  <Input value={editCode} onChange={(e) => setEditCode(e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t('housing.units.roomName')}</Label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={handleCancelEditing}>
                    <X className="w-3.5 h-3.5 me-1" /> {t('common.cancel')}
                  </Button>
                  <Button size="sm" onClick={handleSaveEdit}>
                    <Check className="w-3.5 h-3.5 me-1" /> {t('common.save')}
                  </Button>
                </div>
              </div>
            )}

            {/* Unit Info */}
            <div className="flex flex-wrap gap-2">
              <UnitTypeBadge type={unit.unit_type} />
              <OccupancyBadge 
                occupancy={unit.occupancy} 
                current={unit.current_occupants || 0} 
                capacity={unit.capacity}
                status={unit.status}
              />
              {getStatusBadge()}
              {unit.is_demo && (
                <Badge variant="outline">Demo</Badge>
              )}
            </div>

            {/* Unavailable notice */}
            {isUnavailable && (
              <div className={cn(
                "rounded-lg p-3 text-sm",
                isOutOfService ? "bg-destructive/5 text-destructive border border-destructive/20" : "bg-muted text-muted-foreground border"
              )}>
                {t('housing.units.unitUnavailable')}
              </div>
            )}

            {unit.area && (
              <div>
                <p className="text-sm text-muted-foreground">{t('housing.areas.title')}</p>
                <p className="font-medium">
                  <BilingualName name={unit.area.name} nameAr={null} inline />
                </p>
              </div>
            )}

            {unit.notes && (
              <div>
                <p className="text-sm text-muted-foreground">{t('common.notes')}</p>
                <p className="text-sm">{unit.notes}</p>
              </div>
            )}

            <Separator />

            {/* Occupants Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">{t('housing.occupants.title')}</h3>
                {canManage && canAssign && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="gap-2"
                    onClick={() => setAssignDialogOpen(true)}
                  >
                    <Plus className="w-4 h-4" />
                    {t('housing.occupants.assignHorse')}
                  </Button>
                )}
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : occupants.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Home className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>{t('housing.occupants.noOccupants')}</p>
                  {canManage && canAssign && (
                    <Button 
                      variant="link" 
                      className="mt-2"
                      onClick={() => setAssignDialogOpen(true)}
                    >
                      {t('housing.occupants.assignFirst')}
                    </Button>
                  )}
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {occupants.map((occupant) => {
                      const horseName = language === 'ar' && occupant.horse?.name_ar
                        ? occupant.horse.name_ar
                        : occupant.horse?.name || '—';

                      return (
                        <div 
                          key={occupant.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={occupant.horse?.avatar_url || ''} />
                              <AvatarFallback>
                                {occupant.horse?.name?.[0]?.toUpperCase() || 'H'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <BilingualName
                                name={occupant.horse?.name || '—'}
                                nameAr={occupant.horse?.name_ar}
                                primaryClassName="text-sm font-medium"
                                secondaryClassName="text-xs"
                                inline
                              />
                              <p className="text-xs text-muted-foreground">
                                {t('housing.occupants.since')} {formatStandardDate(occupant.since)}
                              </p>
                            </div>
                          </div>
                          {canManage && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive"
                                  disabled={isVacating}
                                  onClick={() => setVacateTarget({
                                    occupantId: occupant.id,
                                    horseId: occupant.horse_id,
                                    horseName,
                                  })}
                                >
                                  <LogOut className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t('housing.occupants.vacateTooltip')}</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Occupied Room Rename Warning */}
      <AlertDialog open={showOccupiedWarning} onOpenChange={(o) => { if (!o) { setShowOccupiedWarning(false); setPendingEdit(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('housing.units.renameOccupiedTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('housing.units.renameOccupiedDesc')
                .replace('{unit}', unit.code)
                .replace('{count}', String(occupants.length))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmOccupiedEdit}>
              {t('housing.units.confirmRename')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Vacate Confirmation Dialog */}
      <AlertDialog open={!!vacateTarget} onOpenChange={(open) => { if (!open) setVacateTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('housing.facilities.vacateConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('housing.facilities.vacateConfirmDesc')
                .replace('{horse}', vacateTarget?.horseName || '')
                .replace('{unit}', unit?.code || '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleVacateConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('housing.occupants.vacate')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Status Change Confirmation */}
      <AlertDialog open={!!statusChangeTarget} onOpenChange={(open) => { if (!open) setStatusChangeTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusChangeTarget?.status === 'maintenance' && t('housing.units.setMaintenance')}
              {statusChangeTarget?.status === 'out_of_service' && t('housing.units.setOutOfService')}
              {statusChangeTarget?.status === 'available' && t('housing.units.setAvailable')}
            </AlertDialogTitle>
            {statusChangeTarget?.warning && (
              <AlertDialogDescription>{statusChangeTarget.warning}</AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleStatusChange}>
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AssignHorseDialog
        unit={unit}
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
      />
    </>
  );
}
