import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n";
import { FileText, DollarSign, ListChecks, TestTubes } from "lucide-react";
// Simple template type for dialog display
interface SimpleTemplate {
  id?: string;
  name?: string;
  name_ar?: string;
  fields?: unknown[];
  pricing?: { base_price?: number; currency?: string } | Record<string, unknown>;
  description?: string;
  description_ar?: string;
}

interface TemplateDetailsDialogProps {
  template: SimpleTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TemplateDetailsDialog({ 
  template, 
  open, 
  onOpenChange 
}: TemplateDetailsDialogProps) {
  const { t, dir } = useI18n();
  const isArabic = dir === "rtl";

  if (!template) return null;

  const name = isArabic ? (template.name_ar || template.name) : template.name;
  const description = isArabic 
    ? ((template as any).description_ar || (template as any).description) 
    : (template as any).description;
  
  // Parse fields from template
  const fields = template.fields || [];
  
  // Get pricing info
  const pricing = (template as any).pricing as { base_price?: number; currency?: string } | undefined;
  const basePrice = pricing?.base_price;
  const currency = pricing?.currency || "SAR";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TestTubes className="h-5 w-5 text-primary" />
            {name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Description */}
          {description && (
            <p className="text-sm text-muted-foreground">
              {description}
            </p>
          )}

          {/* Price */}
          {basePrice !== undefined && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                {t("laboratory.templates.price")}:
              </span>
              <span className="text-sm">
                {basePrice.toLocaleString()} {currency}
              </span>
            </div>
          )}

          {/* Fields/Tests List */}
          {fields.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ListChecks className="h-4 w-4" />
                {t("laboratory.templates.includedTests")} ({fields.length})
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1.5 ps-6">
                {fields.map((field: any, index: number) => {
                  const fieldName = isArabic 
                    ? (field.name_ar || field.name || field.label_ar || field.label)
                    : (field.name || field.label);
                  const unit = field.unit || "";
                  const refRange = field.reference_range || field.normal_range || "";
                  
                  return (
                    <div 
                      key={field.id || index} 
                      className="flex items-start justify-between text-sm py-1 border-b border-border/50 last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span>{fieldName}</span>
                        {unit && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            {unit}
                          </Badge>
                        )}
                      </div>
                      {refRange && (
                        <span className="text-xs text-muted-foreground">
                          {refRange}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* No fields message */}
          {fields.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-4">
              {t("laboratory.templates.noFieldsDefined")}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
