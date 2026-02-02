import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, AlertTriangle, Check } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useLabTemplates } from "@/hooks/laboratory/useLabTemplates";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import type { SelectedHorse } from "./HorseSelectionStep";

interface TemplateSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedHorses: SelectedHorse[];
  initialTemplateIds: string[];
  initialPerHorseTemplates: Record<number, string[]>;
  initialCustomizePerHorse: boolean;
  onConfirm: (
    templateIds: string[],
    perHorseTemplates: Record<number, string[]>,
    customizePerHorse: boolean
  ) => void;
}

export function TemplateSelectionDialog({
  open,
  onOpenChange,
  selectedHorses,
  initialTemplateIds,
  initialPerHorseTemplates,
  initialCustomizePerHorse,
  onConfirm,
}: TemplateSelectionDialogProps) {
  const { t } = useI18n();
  const { activeTemplates, loading: templatesLoading } = useLabTemplates();
  
  const [templateIds, setTemplateIds] = useState<string[]>(initialTemplateIds);
  const [perHorseTemplates, setPerHorseTemplates] = useState<Record<number, string[]>>(initialPerHorseTemplates);
  const [customizePerHorse, setCustomizePerHorse] = useState(initialCustomizePerHorse);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setTemplateIds(initialTemplateIds);
      setPerHorseTemplates(initialPerHorseTemplates);
      setCustomizePerHorse(initialCustomizePerHorse);
    }
  }, [open, initialTemplateIds, initialPerHorseTemplates, initialCustomizePerHorse]);

  const toggleTemplate = (templateId: string) => {
    setTemplateIds(prev => 
      prev.includes(templateId)
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const togglePerHorseTemplate = (horseIndex: number, templateId: string) => {
    setPerHorseTemplates(prev => {
      const current = prev[horseIndex] || [];
      const updated = current.includes(templateId)
        ? current.filter(id => id !== templateId)
        : [...current, templateId];
      return { ...prev, [horseIndex]: updated };
    });
  };

  const handleCustomizeToggle = (checked: boolean) => {
    if (checked && templateIds.length > 0) {
      // Initialize per-horse templates with current global selection
      const perHorse: Record<number, string[]> = {};
      selectedHorses.forEach((_, idx) => {
        perHorse[idx] = [...templateIds];
      });
      setPerHorseTemplates(perHorse);
    }
    setCustomizePerHorse(checked);
  };

  const handleConfirm = () => {
    onConfirm(templateIds, perHorseTemplates, customizePerHorse);
    onOpenChange(false);
  };

  const totalSelected = customizePerHorse
    ? Object.values(perHorseTemplates).reduce((sum, ids) => sum + ids.length, 0)
    : templateIds.length;

  // Render template checkbox list
  const renderTemplateList = (
    selectedIds: string[],
    onToggle: (templateId: string) => void
  ) => (
    <ScrollArea className="h-[280px] rounded-md border p-2">
      <div className="space-y-1">
        {activeTemplates.map((template) => {
          const pricing = template.pricing as Record<string, unknown> | null;
          const basePrice = pricing && typeof pricing.base_price === "number" 
            ? pricing.base_price 
            : null;
          const currency = (pricing?.currency as string) || "SAR";
          
          return (
            <div
              key={template.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors min-h-12",
                "hover:bg-accent",
                selectedIds.includes(template.id) && "bg-primary/10 border border-primary/20"
              )}
              onClick={() => onToggle(template.id)}
            >
              <Checkbox
                checked={selectedIds.includes(template.id)}
                onCheckedChange={() => onToggle(template.id)}
                className="min-h-5 min-w-5"
              />
              <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">
                  {template.name_ar || template.name}
                </div>
                {template.name_ar && template.name && (
                  <div className="text-xs text-muted-foreground">{template.name}</div>
                )}
              </div>
              <div className="shrink-0">
                {basePrice !== null ? (
                  <Badge variant="secondary" className="text-xs">
                    {basePrice} {currency}
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="h-3 w-3 me-1" />
                    {t("finance.pos.priceMissing")}
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{t("laboratory.templates.selectTemplates")}</span>
            {totalSelected > 0 && (
              <Badge variant="secondary">
                {totalSelected} {t("laboratory.createSample.selected")}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
          {/* Per-horse customization toggle (only for multiple horses) */}
          {selectedHorses.length > 1 && (
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
              <Switch
                checked={customizePerHorse}
                onCheckedChange={handleCustomizeToggle}
              />
              <Label className="cursor-pointer">
                {t("laboratory.createSample.customizeTemplatesPerHorse")}
              </Label>
            </div>
          )}
          
          {templatesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : activeTemplates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("laboratory.createSample.noTemplates")}
            </div>
          ) : customizePerHorse ? (
            // Per-horse template selection (Accordion)
            <Accordion type="single" collapsible className="w-full">
              {selectedHorses.map((horse, idx) => {
                const horseTemplates = perHorseTemplates[idx] || [];
                return (
                  <AccordionItem key={`${horse.horse_id || idx}-${idx}`} value={`horse-${idx}`}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="font-medium">{horse.horse_name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {horseTemplates.length} {t("laboratory.createSample.templates")}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      {renderTemplateList(
                        horseTemplates,
                        (templateId) => togglePerHorseTemplate(idx, templateId)
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          ) : (
            // Global template selection
            renderTemplateList(templateIds, toggleTemplate)
          )}
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4 gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleConfirm}>
            <Check className="h-4 w-4 me-2" />
            {t("laboratory.templates.confirmSelection")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
