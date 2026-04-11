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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { AdmissionWizard } from "./AdmissionWizard";
import { AdmissionDetailSheet } from "./AdmissionDetailSheet";
import { LifecycleActionMenu, LifecycleStateBadge, type LifecycleBlocker } from "./LifecycleActionMenu";
import { useUnitOccupants } from "@/hooks/housing/useUnitOccupants";
import { useUnitHistory } from "@/hooks/housing/useUnitHistory";
import { useHousingUnits } from "@/hooks/housing/useHousingUnits";
import { useI18n } from "@/i18n";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { cn } from "@/lib/utils";
import { formatStandardDate } from "@/lib/displayHelpers";
import {
  Plus, Home, Trees, BedDouble, Loader2, Pencil, Check, X,
  Wrench, Ban, CircleCheck, AlertTriangle, LogIn, Clock, Eye,
  Box, HelpCircle
} from "lucide-react";
import type { HousingUnit } from "@/hooks/housing/useHousingUnits";

// Room function types available for reclassification
const ROOM_FUNCTION_OPTIONS = ['stall', 'storage', 'isolation_room'] as const;

interface UnitDetailsSheetProps {
  unit: HousingUnit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UnitDetailsSheet({ unit, open, onOpenChange }: UnitDetailsSheetProps) {
  const { t, dir, lang: language } = useI18n();
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [orphanRemoveTarget, setOrphanRemoveTarget] = useState<{ occupantId: string; horseId: string; horseName: string } | null>(null);

  // Admission wizard state for Scenario A
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardHorseId, setWizardHorseId] = useState<string | undefined>();

  // Inline editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');
  const [editUnitType, setEditUnitType] = useState('');
  const [showOccupiedWarning, setShowOccupiedWarning] = useState(false);
  const [pendingEdit, setPendingEdit] = useState<{ code: string; name: string; unitType: string } | null>(null);

  // Reclassification guardrail state
  const [showReclassifyConfirm, setShowReclassifyConfirm] = useState(false);
  const [pendingReclassify, setPendingReclassify] = useState<{ code: string; name: string; unitType: string } | null>(null);

  // Status change state
  const [statusChangeTarget, setStatusChangeTarget] = useState<{ status: string; warning: string } | null>(null);

  // In-place boarding detail drill-down
  const [boardingDetailAdmissionId, setBoardingDetailAdmissionId] = useState<string | null>(null);

  const {
    occupants,
    isLoading,
    canManage,
    removeOrphanOccupant,
    isRemovingOrphan,
  } = useUnitOccupants(unit?.id);

  const { history, isLoading: historyLoading } = useUnitHistory(unit?.id);

  const { updateUnit, setUnitStatus, archiveUnit, restoreUnit, deleteUnit, toggleUnitActive } = useHousingUnits();

  // Fetch active admissions for all occupant horses to detect orphans
  const occupantHorseIds = useMemo(() => occupants.map(o => o.horse_id), [occupants]);
  const { data: occupantAdmissions } = useQuery({
    queryKey: ['occupant-admissions', tenantId, occupantHorseIds],
    queryFn: async () => {
      if (!tenantId || occupantHorseIds.length === 0) return {};
      const { data, error } = await supabase
        .from('boarding_admissions')
        .select('id, horse_id, status, client:clients(name, name_ar), monthly_rate, daily_rate, rate_currency, admitted_at')
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .in('horse_id', occupantHorseIds);
      if (error) return {};
      const map: Record<string, { id: string; clientName?: string; clientNameAr?: string; monthlyRate?: number | null; dailyRate?: number | null; currency?: string; admittedAt?: string }> = {};
      for (const a of (data || [])) {
        map[a.horse_id] = {
          id: a.id,
          clientName: (a.client as any)?.name,
          clientNameAr: (a.client as any)?.name_ar,
          monthlyRate: a.monthly_rate,
          dailyRate: a.daily_rate,
          currency: a.rate_currency,
          admittedAt: a.admitted_at,
        };
      }
      return map;
    },
    enabled: !!tenantId && occupantHorseIds.length > 0,
  });

  // Unit lifecycle blocker queries
  const { data: unitBlockerData } = useQuery({
    queryKey: ['unit-lifecycle-blockers', unit?.id, tenantId],
    queryFn: async () => {
      if (!unit?.id || !tenantId) return { historyCount: 0, admissionCount: 0 };
      const [historyRes, admissionRes] = await Promise.all([
        supabase
          .from('housing_unit_occupants')
          .select('id', { count: 'exact', head: true })
          .eq('unit_id', unit.id)
          .eq('tenant_id', tenantId),
        supabase
          .from('boarding_admissions')
          .select('id', { count: 'exact', head: true })
          .eq('unit_id', unit.id)
          .eq('tenant_id', tenantId),
      ]);
      return {
        historyCount: historyRes.count || 0,
        admissionCount: admissionRes.count || 0,
      };
    },
    enabled: !!unit?.id && !!tenantId,
  });

  const deleteBlockers = useMemo((): LifecycleBlocker[] => {
    if (!unit) return [];
    const blockers: LifecycleBlocker[] = [];
    const currentOcc = unit.current_occupants || 0;
    if (currentOcc > 0) {
      blockers.push({ reason: t('housing.lifecycle.blockers.hasOccupants' as any), count: currentOcc });
    }
    if (unitBlockerData && unitBlockerData.historyCount > 0) {
      blockers.push({ reason: t('housing.lifecycle.blockers.hasHistory' as any), count: unitBlockerData.historyCount });
    }
    if (unitBlockerData && unitBlockerData.admissionCount > 0) {
      blockers.push({ reason: t('housing.lifecycle.blockers.hasAdmissions' as any), count: unitBlockerData.admissionCount });
    }
    return blockers;
  }, [unit, unitBlockerData, t]);

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
    storage: Box,
    isolation_room: HelpCircle,
  };
  const Icon = iconMap[unit.unit_type] || Home;

  const handleStartEditing = () => {
    setEditCode(unit.code);
    setEditName(unit.name || unit.code);
    setEditUnitType(unit.unit_type);
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setEditCode('');
    setEditName('');
    setEditUnitType('');
  };

  const handleSaveEdit = () => {
    const codeChanged = editCode !== unit.code;
    const nameChanged = editName !== (unit.name || unit.code);
    const typeChanged = editUnitType !== unit.unit_type;

    if (!codeChanged && !nameChanged && !typeChanged) {
      setIsEditing(false);
      return;
    }

    // Guardrail: block storage conversion when occupied
    if (typeChanged && editUnitType === 'storage' && isOccupied) {
      return; // blocked — UI already shows tooltip
    }

    // Guardrail: confirm any other occupied room-function change
    if (typeChanged && isOccupied) {
      setPendingReclassify({ code: editCode, name: editName, unitType: editUnitType });
      setShowReclassifyConfirm(true);
      return;
    }

    // Warn about code/name change on occupied room (existing behavior)
    if ((codeChanged || nameChanged) && isOccupied && !typeChanged) {
      setPendingEdit({ code: editCode, name: editName, unitType: editUnitType });
      setShowOccupiedWarning(true);
      return;
    }

    commitEdit(editCode, editName, editUnitType);
  };

  const commitEdit = async (code: string, name: string, unitType: string) => {
    try {
      const updateData: any = { id: unit.id, code, name };
      if (unitType !== unit.unit_type) {
        updateData.unit_type = unitType;
      }
      await updateUnit(updateData);
      setIsEditing(false);
    } catch {
      // handled by mutation
    }
  };

  const handleConfirmOccupiedEdit = async () => {
    if (!pendingEdit) return;
    await commitEdit(pendingEdit.code, pendingEdit.name, pendingEdit.unitType);
    setPendingEdit(null);
    setShowOccupiedWarning(false);
  };

  const handleConfirmReclassify = async () => {
    if (!pendingReclassify) return;
    await commitEdit(pendingReclassify.code, pendingReclassify.name, pendingReclassify.unitType);
    setPendingReclassify(null);
    setShowReclassifyConfirm(false);
  };

  const handleOrphanRemoveConfirm = async () => {
    if (!orphanRemoveTarget) return;
    try {
      await removeOrphanOccupant({ occupantId: orphanRemoveTarget.occupantId, horseId: orphanRemoveTarget.horseId });
    } finally {
      setOrphanRemoveTarget(null);
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

  // Scenario A callback: horse selected from picker with no admission
  const handleAdmitHorse = (horseId: string) => {
    setWizardHorseId(horseId);
    setWizardOpen(true);
  };

  const getUnitTypeLabelForSelect = (type: string) => {
    const map: Record<string, string> = {
      stall: t('housing.units.types.stall'),
      storage: t('housing.create.roomStorage'),
      isolation_room: t('housing.create.roomIsolation'),
    };
    return map[type] || type;
  };

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
        <SheetContent side={dir === 'rtl' ? 'left' : 'right'} className="w-full sm:max-w-md p-0 flex flex-col">
          {/* ── Header ── */}
          <SheetHeader className="p-6 pb-0">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                isOutOfService ? "bg-destructive/10" : isMaintenance ? "bg-muted" : "bg-primary/10"
              )}>
                <Icon className={cn(
                  "w-6 h-6",
                  isOutOfService ? "text-destructive" : isMaintenance ? "text-muted-foreground" : "text-primary"
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <SheetTitle className="truncate">{displayName}</SheetTitle>
                <SheetDescription>{unit.code}</SheetDescription>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {canManage && !isEditing && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleStartEditing}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('housing.units.editRoom')}</TooltipContent>
                  </Tooltip>
                )}
                {canManage && !isEditing && (
                  <LifecycleActionMenu
                    entityType="unit"
                    isActive={unit.is_active}
                    isArchived={unit.is_archived}
                    canDelete={deleteBlockers.length === 0}
                    deleteBlockers={deleteBlockers}
                    onDelete={async () => { await deleteUnit(unit.id); onOpenChange(false); }}
                    onArchive={async () => { await archiveUnit(unit.id); onOpenChange(false); }}
                    onDeactivate={async () => { await toggleUnitActive({ id: unit.id, isActive: false }); onOpenChange(false); }}
                    onReactivate={async () => { await toggleUnitActive({ id: unit.id, isActive: true }); }}
                    onRestore={async () => { await restoreUnit(unit.id); }}
                  />
                )}
              </div>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="p-6 space-y-6">

              {/* ═══════════════════════════════════════════════════════ */}
              {/* SECTION 1 — Room Information & Controls                */}
              {/* ═══════════════════════════════════════════════════════ */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {t('housing.units.sectionRoomInfo' as any)}
                </h3>

                {/* Badges */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <UnitTypeBadge type={unit.unit_type} />
                  <OccupancyBadge
                    occupancy={unit.occupancy}
                    current={unit.current_occupants || 0}
                    capacity={unit.capacity}
                    status={unit.status}
                  />
                  {getStatusBadge()}
                  {unit.is_demo && <Badge variant="outline">Demo</Badge>}
                </div>

                {/* Unavailable notice */}
                {isUnavailable && (
                  <div className={cn(
                    "rounded-lg p-3 text-sm mb-3",
                    isOutOfService ? "bg-destructive/5 text-destructive border border-destructive/20" : "bg-muted text-muted-foreground border"
                  )}>
                    {t('housing.units.unitUnavailable')}
                  </div>
                )}

                {/* Area / notes */}
                {unit.area && (
                  <div className="mb-2">
                    <p className="text-sm text-muted-foreground">{t('housing.areas.title')}</p>
                    <p className="font-medium text-sm">
                      <BilingualName name={unit.area.name} nameAr={null} inline />
                    </p>
                  </div>
                )}
                {unit.notes && (
                  <div className="mb-2">
                    <p className="text-sm text-muted-foreground">{t('common.notes')}</p>
                    <p className="text-sm">{unit.notes}</p>
                  </div>
                )}

                {/* Inline edit form */}
                {isEditing && (
                  <div className="space-y-3 p-3 rounded-lg border bg-muted/30 mt-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">{t('housing.units.roomCode')}</Label>
                      <Input value={editCode} onChange={(e) => setEditCode(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">{t('housing.units.roomName')}</Label>
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">{t('housing.units.roomFunction' as any)}</Label>
                      <Select value={editUnitType} onValueChange={setEditUnitType}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROOM_FUNCTION_OPTIONS.map((opt) => {
                            const isBlocked = opt === 'storage' && isOccupied;
                            return (
                              <SelectItem key={opt} value={opt} disabled={isBlocked}>
                                {getUnitTypeLabelForSelect(opt)}
                                {isBlocked && (
                                  <span className="text-xs text-muted-foreground ms-1">
                                    — {t('housing.units.reclassifyBlockedStorage' as any)}
                                  </span>
                                )}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
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

                {/* Room status action chips — surfaced directly */}
                {canManage && !isEditing && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">{t('housing.units.roomStatusActions' as any)}</p>
                    <div className="flex flex-wrap gap-2">
                      {unit.status !== 'available' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1.5"
                          onClick={() => setStatusChangeTarget({ status: 'available', warning: '' })}
                        >
                          <CircleCheck className="w-3 h-3 text-emerald-600" />
                          {t('housing.units.setAvailable')}
                        </Button>
                      )}
                      {unit.status !== 'maintenance' && !isOccupied && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1.5"
                          onClick={() => setStatusChangeTarget({
                            status: 'maintenance',
                            warning: t('housing.units.maintenanceWarning'),
                          })}
                        >
                          <Wrench className="w-3 h-3 text-muted-foreground" />
                          {t('housing.units.setMaintenance')}
                        </Button>
                      )}
                      {unit.status !== 'out_of_service' && !isOccupied && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1.5"
                          onClick={() => setStatusChangeTarget({
                            status: 'out_of_service',
                            warning: t('housing.units.outOfServiceWarning'),
                          })}
                        >
                          <Ban className="w-3 h-3 text-destructive" />
                          {t('housing.units.setOutOfService')}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </section>

              <Separator />

              {/* ═══════════════════════════════════════════════════════ */}
              {/* SECTION 2 — Current Occupant / Boarding Snapshot       */}
              {/* ═══════════════════════════════════════════════════════ */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('housing.units.sectionCurrentOccupant' as any)}
                  </h3>
                  {canManage && canAssign && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 h-7 text-xs"
                      onClick={() => setAssignDialogOpen(true)}
                    >
                      <Plus className="w-3 h-3" />
                      {t('housing.occupants.admitHorse')}
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
                        {t('housing.occupants.admitFirst')}
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {occupants.map((occupant) => {
                      const horseName = language === 'ar' && occupant.horse?.name_ar
                        ? occupant.horse.name_ar
                        : occupant.horse?.name || '—';
                      const admissionInfo = occupantAdmissions?.[occupant.horse_id];
                      const isOrphan = !admissionInfo;

                      return (
                        <div
                          key={occupant.id}
                          className={cn(
                            "p-3 rounded-lg border bg-card",
                            isOrphan && "border-amber-300/50"
                          )}
                        >
                          <div className="flex items-center justify-between">
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
                          </div>

                          {/* Admission status badge + client */}
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {admissionInfo ? (
                              <>
                                <Badge variant="outline" className="text-[10px] gap-1 text-emerald-700 border-emerald-300 bg-emerald-50">
                                  <Check className="w-2.5 h-2.5" />
                                  {t('housing.occupants.activeAdmission')}
                                </Badge>
                                {admissionInfo.clientName && (
                                  <span className="text-xs text-muted-foreground">
                                    · {language === 'ar' && admissionInfo.clientNameAr ? admissionInfo.clientNameAr : admissionInfo.clientName}
                                  </span>
                                )}
                              </>
                            ) : (
                              <Badge variant="outline" className="text-[10px] gap-1 text-amber-700 border-amber-300 bg-amber-50">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                {t('housing.occupants.noAdmission')}
                              </Badge>
                            )}
                          </div>

                          {/* Rate snapshot if available */}
                          {admissionInfo && (admissionInfo.monthlyRate || admissionInfo.dailyRate) && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              {admissionInfo.monthlyRate
                                ? `${admissionInfo.monthlyRate} ${admissionInfo.currency || 'SAR'} / mo`
                                : `${admissionInfo.dailyRate} ${admissionInfo.currency || 'SAR'} / day`
                              }
                            </div>
                          )}

                          {/* View Boarding Details CTA */}
                          {admissionInfo && (
                            <div className="mt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs gap-1.5 w-full"
                                onClick={() => setBoardingDetailAdmissionId(admissionInfo.id)}
                              >
                                <Eye className="w-3 h-3" />
                                {t('housing.units.viewBoardingDetails' as any)}
                              </Button>
                            </div>
                          )}

                          {/* Orphan repair actions — role-gated, visually distinct */}
                          {isOrphan && canManage && (
                            <div className="mt-2 pt-2 border-t border-amber-200 flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1"
                                onClick={() => {
                                  handleAdmitHorse(occupant.horse_id);
                                }}
                              >
                                <LogIn className="w-3 h-3" />
                                {t('housing.occupants.createAdmission')}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1 text-amber-700 border-amber-300 hover:bg-amber-50"
                                disabled={isRemovingOrphan}
                                onClick={() => setOrphanRemoveTarget({
                                  occupantId: occupant.id,
                                  horseId: occupant.horse_id,
                                  horseName,
                                })}
                              >
                                <AlertTriangle className="w-3 h-3" />
                                {t('housing.occupants.removeOrphan')}
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <Separator />

              {/* ═══════════════════════════════════════════════════════ */}
              {/* SECTION 3 — Room History                               */}
              {/* ═══════════════════════════════════════════════════════ */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {t('housing.units.sectionRoomHistory' as any)}
                </h3>

                {historyLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">{t('housing.units.noHistoryYet' as any)}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {history.map((entry) => {
                      const hName = language === 'ar' && entry.horse?.name_ar
                        ? entry.horse.name_ar
                        : entry.horse?.name || '—';
                      return (
                        <div key={entry.id} className="flex items-center gap-3 p-2 rounded-md border bg-card/50">
                          <Avatar className="w-7 h-7">
                            <AvatarImage src={entry.horse?.avatar_url || ''} />
                            <AvatarFallback className="text-[10px]">
                              {entry.horse?.name?.[0]?.toUpperCase() || 'H'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{hName}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatStandardDate(entry.since)} — {formatStandardDate(entry.until)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* In-place boarding detail drill-down */}
      <AdmissionDetailSheet
        admissionId={boardingDetailAdmissionId}
        open={!!boardingDetailAdmissionId}
        onOpenChange={(o) => { if (!o) setBoardingDetailAdmissionId(null); }}
      />

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

      {/* Reclassification Confirmation */}
      <AlertDialog open={showReclassifyConfirm} onOpenChange={(o) => { if (!o) { setShowReclassifyConfirm(false); setPendingReclassify(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('housing.units.reclassifyOccupiedTitle' as any)}</AlertDialogTitle>
            <AlertDialogDescription>
              {(t('housing.units.reclassifyOccupiedDesc' as any) as string)
                .replace('{unit}', unit.code)
                .replace('{count}', String(occupants.length))
                .replace('{type}', pendingReclassify ? getUnitTypeLabelForSelect(pendingReclassify.unitType) : '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReclassify}>
              {t('housing.units.confirmReclassify' as any)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Orphan Remove Confirmation */}
      <AlertDialog open={!!orphanRemoveTarget} onOpenChange={(open) => { if (!open) setOrphanRemoveTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('housing.occupants.removeOrphanTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('housing.occupants.removeOrphanDesc')
                .replace('{horse}', orphanRemoveTarget?.horseName || '')
                .replace('{unit}', unit?.code || '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleOrphanRemoveConfirm}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {isRemovingOrphan ? <Loader2 className="w-4 h-4 animate-spin" /> : t('housing.occupants.removeOrphan')}
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

      {/* Admission-aware horse picker */}
      <AssignHorseDialog
        unit={unit}
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        onAdmitHorse={handleAdmitHorse}
      />

      {/* AdmissionWizard for Scenario A — prefilled with unit context */}
      <AdmissionWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        preselectedHorseId={wizardHorseId}
        preselectedBranchId={unit.branch_id}
        preselectedAreaId={unit.area_id}
        preselectedUnitId={unit.id}
      />
    </>
  );
}
