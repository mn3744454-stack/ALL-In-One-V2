import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { UnitTypeBadge } from "./UnitTypeBadge";
import { OccupancyBadge } from "./OccupancyBadge";
import { AssignHorseDialog } from "./AssignHorseDialog";
import { useUnitOccupants } from "@/hooks/housing/useUnitOccupants";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Plus, LogOut, Home, Trees, BedDouble, Loader2 } from "lucide-react";
import type { HousingUnit } from "@/hooks/housing/useHousingUnits";

interface UnitDetailsSheetProps {
  unit: HousingUnit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UnitDetailsSheet({ unit, open, onOpenChange }: UnitDetailsSheetProps) {
  const { t, dir, language } = useI18n();
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  
  const { 
    occupants, 
    isLoading, 
    canManage, 
    vacateHorse, 
    isVacating 
  } = useUnitOccupants(unit?.id);

  if (!unit) return null;

  const displayName = language === 'ar' && unit.name_ar ? unit.name_ar : (unit.name || unit.code);
  const isFull = (unit.current_occupants || 0) >= unit.capacity;

  const iconMap: Record<string, React.ElementType> = {
    stall: Home,
    paddock: Trees,
    room: BedDouble,
  };
  const Icon = iconMap[unit.unit_type] || Home;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side={dir === 'rtl' ? 'left' : 'right'} className="w-full sm:max-w-md">
          <SheetHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Icon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <SheetTitle>{displayName}</SheetTitle>
                <SheetDescription>{unit.code}</SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Unit Info */}
            <div className="flex flex-wrap gap-2">
              <UnitTypeBadge type={unit.unit_type} />
              <OccupancyBadge 
                occupancy={unit.occupancy} 
                current={unit.current_occupants || 0} 
                capacity={unit.capacity} 
              />
              {unit.is_demo && (
                <Badge variant="outline">Demo</Badge>
              )}
            </div>

            {unit.area && (
              <div>
                <p className="text-sm text-muted-foreground">{t('housing.areas.title')}</p>
                <p className="font-medium">{unit.area.name}</p>
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
                {canManage && !isFull && (
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
                  {canManage && (
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
                    {occupants.map((occupant) => (
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
                            <p className="font-medium">
                              {language === 'ar' && occupant.horse?.name_ar 
                                ? occupant.horse.name_ar 
                                : occupant.horse?.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t('housing.occupants.since')} {format(new Date(occupant.since), 'PP')}
                            </p>
                          </div>
                        </div>
                        {canManage && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            disabled={isVacating}
                            onClick={() => vacateHorse({ 
                              occupantId: occupant.id, 
                              horseId: occupant.horse_id 
                            })}
                          >
                            <LogOut className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AssignHorseDialog
        unit={unit}
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
      />
    </>
  );
}
