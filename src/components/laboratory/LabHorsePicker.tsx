import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Plus, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { useLabHorses, type LabHorse, type CreateLabHorseData } from "@/hooks/laboratory/useLabHorses";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import type { SelectedHorse } from "./HorseSelectionStep";

interface LabHorsePickerProps {
  selectedHorses: SelectedHorse[];
  onHorsesChange: (horses: SelectedHorse[]) => void;
  disabled?: boolean;
}

export function LabHorsePicker({
  selectedHorses,
  onHorsesChange,
  disabled = false,
}: LabHorsePickerProps) {
  const { t, dir } = useI18n();
  const [search, setSearch] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedForm, setExpandedForm] = useState(false);
  
  const { labHorses, loading, createLabHorse, isCreating } = useLabHorses({ search });

  // Create form state
  const [formData, setFormData] = useState<CreateLabHorseData>({
    name: "",
    passport_number: "",
    microchip_number: "",
    breed_text: "",
    color_text: "",
    owner_name: "",
    owner_phone: "",
  });

  // Get selected lab horse IDs
  const selectedIds = useMemo(() => {
    return selectedHorses
      .filter(h => h.horse_type === 'lab_horse' && h.horse_id)
      .map(h => h.horse_id!);
  }, [selectedHorses]);
  const handleToggleHorse = (horse: LabHorse) => {
    const isSelected = selectedIds.includes(horse.id);
    
    if (isSelected) {
      // Remove
      onHorsesChange(selectedHorses.filter(h => h.horse_id !== horse.id));
    } else {
      // Add
      const newSelected: SelectedHorse = {
        horse_id: horse.id,
        horse_type: 'lab_horse',
        horse_name: horse.name,
        horse_data: {
          passport_number: horse.passport_number || undefined,
          microchip: horse.microchip_number || undefined,
          breed: horse.breed_text || undefined,
          color: horse.color_text || undefined,
        },
      };
      onHorsesChange([...selectedHorses, newSelected]);
    }
  };

  const handleRemoveHorse = (index: number) => {
    const updated = [...selectedHorses];
    updated.splice(index, 1);
    onHorsesChange(updated);
  };

  const handleCreateHorse = async () => {
    if (!formData.name.trim()) return;

    const created = await createLabHorse({
      name: formData.name.trim(),
      passport_number: formData.passport_number?.trim() || undefined,
      microchip_number: formData.microchip_number?.trim() || undefined,
      breed_text: formData.breed_text?.trim() || undefined,
      color_text: formData.color_text?.trim() || undefined,
      owner_name: formData.owner_name?.trim() || undefined,
      owner_phone: formData.owner_phone?.trim() || undefined,
    });

    if (created) {
      // Auto-select the newly created horse
      const newSelected: SelectedHorse = {
        horse_id: created.id,
        horse_type: 'lab_horse',
        horse_name: created.name,
        horse_data: {
          passport_number: created.passport_number || undefined,
          microchip: created.microchip_number || undefined,
          breed: created.breed_text || undefined,
          color: created.color_text || undefined,
        },
      };
      onHorsesChange([...selectedHorses, newSelected]);
      
      // Reset form
      setFormData({
        name: "",
        passport_number: "",
        microchip_number: "",
        breed_text: "",
        color_text: "",
        owner_name: "",
        owner_phone: "",
      });
      setShowCreateForm(false);
      setExpandedForm(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      passport_number: "",
      microchip_number: "",
      breed_text: "",
      color_text: "",
      owner_name: "",
      owner_phone: "",
    });
    setShowCreateForm(false);
    setExpandedForm(false);
  };

  const isFormValid = formData.name.trim().length > 0;

  if (loading && labHorses.length === 0) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-3">
      {/* Selected Horses Summary */}
      {selectedHorses.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 bg-muted/30 rounded-md">
          {selectedHorses.map((horse, idx) => (
            <Badge 
              key={horse.horse_id || idx} 
              variant="secondary" 
              className="flex items-center gap-1 px-3 py-1.5"
            >
              <span>{horse.horse_name}</span>
              {horse.horse_data?.passport_number && (
                <span className="text-xs text-muted-foreground">
                  ({horse.horse_data.passport_number})
                </span>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 ms-1 hover:bg-destructive/20"
                onClick={() => handleRemoveHorse(idx)}
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className={cn(
          "absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground",
          dir === 'rtl' ? 'right-3' : 'left-3'
        )} />
        <Input
          placeholder={t("laboratory.labHorses.searchPlaceholder") || "Search by name, microchip, passport, owner..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={cn(dir === 'rtl' ? 'pr-9' : 'pl-9')}
          disabled={disabled}
        />
      </div>

      {/* Create New Horse Button */}
      {!showCreateForm && (
        <Button
          variant="outline"
          onClick={() => setShowCreateForm(true)}
          disabled={disabled}
          className="w-full"
        >
          <Plus className="h-4 w-4 me-2" />
          {t("laboratory.labHorses.addNew") || "Register New Horse"}
        </Button>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <Card className="p-4 space-y-4 border-primary/20">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Name - Required */}
            <div className="space-y-2">
              <Label htmlFor="lab-horse-name">
                {t("laboratory.walkIn.horseName")} *
              </Label>
              <Input
                id="lab-horse-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t("laboratory.walkIn.horseNamePlaceholder")}
                autoFocus
                disabled={isCreating}
              />
            </div>

            {/* Passport Number */}
            <div className="space-y-2">
              <Label htmlFor="lab-horse-passport">
                {t("laboratory.walkIn.passportNumber")}
              </Label>
              <Input
                id="lab-horse-passport"
                value={formData.passport_number || ""}
                onChange={(e) => setFormData({ ...formData, passport_number: e.target.value })}
                placeholder={t("laboratory.walkIn.passportPlaceholder")}
                disabled={isCreating}
              />
            </div>
          </div>

          {/* Expand/Collapse for more fields */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpandedForm(!expandedForm)}
            className="w-full text-muted-foreground"
          >
            {expandedForm ? (
              <>
                <ChevronUp className="h-4 w-4 me-1" />
                {t("common.showLess") || "Show less"}
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 me-1" />
                {t("common.showMore") || "More details"}
              </>
            )}
          </Button>

          {/* Extended Fields */}
          {expandedForm && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
              <div className="space-y-2">
                <Label htmlFor="lab-horse-microchip">
                  {t("laboratory.walkIn.microchip")}
                </Label>
                <Input
                  id="lab-horse-microchip"
                  value={formData.microchip_number || ""}
                  onChange={(e) => setFormData({ ...formData, microchip_number: e.target.value })}
                  placeholder={t("laboratory.walkIn.microchipPlaceholder")}
                  disabled={isCreating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lab-horse-breed">
                  {t("laboratory.walkIn.breed")}
                </Label>
                <Input
                  id="lab-horse-breed"
                  value={formData.breed_text || ""}
                  onChange={(e) => setFormData({ ...formData, breed_text: e.target.value })}
                  placeholder={t("laboratory.walkIn.breedPlaceholder")}
                  disabled={isCreating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lab-horse-color">
                  {t("laboratory.walkIn.color")}
                </Label>
                <Input
                  id="lab-horse-color"
                  value={formData.color_text || ""}
                  onChange={(e) => setFormData({ ...formData, color_text: e.target.value })}
                  placeholder={t("laboratory.walkIn.colorPlaceholder")}
                  disabled={isCreating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lab-horse-owner-name">
                  {t("laboratory.labHorses.ownerName") || "Owner Name"}
                </Label>
                <Input
                  id="lab-horse-owner-name"
                  value={formData.owner_name || ""}
                  onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                  placeholder={t("laboratory.labHorses.ownerNamePlaceholder") || "Enter owner name"}
                  disabled={isCreating}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="lab-horse-owner-phone">
                  {t("laboratory.labHorses.ownerPhone") || "Owner Phone"}
                </Label>
                <Input
                  id="lab-horse-owner-phone"
                  value={formData.owner_phone || ""}
                  onChange={(e) => setFormData({ ...formData, owner_phone: e.target.value })}
                  placeholder={t("laboratory.labHorses.ownerPhonePlaceholder") || "Enter owner phone"}
                  disabled={isCreating}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={resetForm}
              disabled={isCreating}
            >
              <X className="h-4 w-4 me-1" />
              {t("common.cancel")}
            </Button>
            <Button
              size="sm"
              onClick={handleCreateHorse}
              disabled={!isFormValid || isCreating}
            >
              {isCreating ? (
                <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full me-1" />
              ) : (
                <Check className="h-4 w-4 me-1" />
              )}
              {t("laboratory.labHorses.registerAndSelect") || "Register & Select"}
            </Button>
          </div>
        </Card>
      )}

      {/* Horses List */}
      <div className="max-h-[40vh] sm:max-h-[280px] w-full min-w-0 overflow-y-auto rounded-md border">
        <div className="p-2 space-y-1 w-full">
          {labHorses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search 
                ? (t("laboratory.labHorses.noMatchingHorses") || "No horses match your search")
                : (t("laboratory.labHorses.noHorses") || "No horses registered yet")
              }
            </div>
          ) : (
            labHorses.map((horse) => {
              const isSelected = selectedIds.includes(horse.id);
              return (
                <div
                  key={horse.id}
                  className={cn(
                    "flex w-full min-w-0 items-center gap-3 p-2 rounded-md cursor-pointer transition-colors",
                    "hover:bg-muted/50",
                    isSelected && "bg-primary/10 border border-primary/20",
                    disabled && "opacity-50 cursor-not-allowed"
                  )}
                  onClick={() => !disabled && handleToggleHorse(horse)}
                >
                  <div className={cn(
                    "h-5 w-5 shrink-0 rounded border flex items-center justify-center",
                    isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"
                  )}>
                    {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {horse.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{horse.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {[
                        horse.passport_number,
                        horse.microchip_number,
                        horse.owner_name,
                      ].filter(Boolean).join(" · ") || t("laboratory.labHorses.noDetails")}
                    </div>
                  </div>
                  {horse.breed_text && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      {horse.breed_text}
                    </Badge>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Selected Count */}
      {selectedHorses.length > 0 && (
        <div className="flex items-center justify-end">
          <Badge variant="default" className="text-sm">
            {selectedHorses.length} {t("laboratory.horseSelection.horsesSelected")}
          </Badge>
        </div>
      )}
    </div>
  );
}
