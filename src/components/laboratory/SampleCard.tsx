import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { SampleStatusBadge } from "./SampleStatusBadge";
import type { LabSample } from "@/hooks/laboratory/useLabSamples";
import { format } from "date-fns";
import { useI18n } from "@/i18n";
import { 
  FlaskConical, 
  Calendar, 
  MoreVertical, 
  Play, 
  CheckCircle2, 
  XCircle,
  RotateCcw,
  FileText,
  AlertTriangle,
  Eye,
  Receipt,
  CreditCard
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmbeddedCheckout, type CheckoutLineItem } from "@/components/pos/EmbeddedCheckout";

interface SampleCardProps {
  sample: LabSample;
  canManage: boolean;
  canCreateInvoice?: boolean;
  completedResultsCount?: number;
  onAccession?: () => void;
  onStartProcessing?: () => void;
  onComplete?: () => void;
  onCancel?: () => void;
  onRetest?: () => void;
  onClick?: () => void;
  onViewAllResults?: () => void;
  onGenerateInvoice?: () => void;
}

export function SampleCard({
  sample,
  canManage,
  canCreateInvoice = false,
  completedResultsCount = 0,
  onAccession,
  onStartProcessing,
  onComplete,
  onCancel,
  onRetest,
  onClick,
  onViewAllResults,
  onGenerateInvoice,
}: SampleCardProps) {
  const { t } = useI18n();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // Build checkout line items from sample templates
  const buildCheckoutItems = (): CheckoutLineItem[] => {
    if (!sample.templates || sample.templates.length === 0) {
      return [{
        id: sample.id,
        description: `Lab Sample ${sample.physical_sample_id || sample.id.slice(0, 8)}`,
        quantity: 1,
        unit_price: 0,
        total_price: 0,
        entity_type: "lab_sample",
        entity_id: sample.id,
      }];
    }
    return sample.templates.map((st) => ({
      id: st.id,
      description: st.template?.name || "Lab Test",
      description_ar: st.template?.name_ar,
      quantity: 1,
      unit_price: 0, // Price should come from template or service
      total_price: 0,
      entity_type: "lab_sample",
      entity_id: sample.id,
    }));
  };
  const horseName = sample.horse?.name || t("laboratory.samples.unknownHorse");
  
  // Check if sample is billable (completed status)
  const isBillable = sample.status === 'completed';
  const horseInitials = horseName.slice(0, 2).toUpperCase();

  // Template progress calculation
  const templateCount = sample.templates?.length || 0;
  const resultsCount = completedResultsCount;
  const hasTemplates = templateCount > 0;
  const isPartial = hasTemplates && resultsCount > 0 && resultsCount < templateCount;
  const isComplete = hasTemplates && resultsCount >= templateCount;
  const progressPercent = hasTemplates ? (resultsCount / templateCount) * 100 : 0;

  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={sample.horse?.avatar_url || undefined} alt={horseName} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {horseInitials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-sm">{horseName}</h3>
              {sample.physical_sample_id && (
                <p className="text-xs text-muted-foreground font-mono">
                  {sample.physical_sample_id}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SampleStatusBadge status={sample.status} />
            {canManage && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {sample.status === 'draft' && onAccession && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAccession(); }}>
                      <FlaskConical className="h-4 w-4 me-2" />
                      {t("laboratory.sampleActions.accession")}
                    </DropdownMenuItem>
                  )}
                  {sample.status === 'accessioned' && onStartProcessing && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStartProcessing(); }}>
                      <Play className="h-4 w-4 me-2" />
                      {t("laboratory.sampleActions.startProcessing")}
                    </DropdownMenuItem>
                  )}
                  {sample.status === 'processing' && onComplete && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onComplete(); }}>
                      <CheckCircle2 className="h-4 w-4 me-2" />
                      {t("laboratory.sampleActions.complete")}
                    </DropdownMenuItem>
                  )}
                  {sample.status === 'completed' && sample.retest_count < 3 && onRetest && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRetest(); }}>
                      <RotateCcw className="h-4 w-4 me-2" />
                      {t("laboratory.sampleActions.createRetest")}
                    </DropdownMenuItem>
                  )}
                  {isBillable && canCreateInvoice && onGenerateInvoice && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={(e) => { e.stopPropagation(); onGenerateInvoice(); }}
                        className="text-primary"
                      >
                        <Receipt className="h-4 w-4 me-2" />
                        {t("laboratory.billing.generateInvoice")}
                      </DropdownMenuItem>
                    </>
                  )}
                  {!['completed', 'cancelled'].includes(sample.status) && onCancel && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={(e) => { e.stopPropagation(); onCancel(); }}
                        className="text-destructive"
                      >
                        <XCircle className="h-4 w-4 me-2" />
                        {t("laboratory.sampleActions.cancel")}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Templates Badges - RTL-aware alignment */}
        {sample.templates && sample.templates.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3 rtl:justify-end">
            {sample.templates.map((st) => (
              <Badge key={st.id} variant="outline" className="text-xs">
                <FileText className="h-3 w-3 me-1" />
                {st.template.name_ar || st.template.name}
              </Badge>
            ))}
          </div>
        )}

        {/* Results Progress */}
        {hasTemplates && (sample.status === 'processing' || sample.status === 'completed') && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted-foreground">{t("laboratory.samples.resultsProgress")}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {resultsCount}/{templateCount}
                </span>
                {isPartial && (
                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                    <AlertTriangle className="h-3 w-3 me-1" />
                    {t("laboratory.samples.partial")}
                  </Badge>
                )}
                {isComplete && (
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300 border-green-200 dark:border-green-800">
                    <CheckCircle2 className="h-3 w-3 me-1" />
                    {t("laboratory.samples.complete")}
                  </Badge>
                )}
              </div>
            </div>
            <Progress value={progressPercent} className="h-1.5" />
            
            {/* View All Results Button */}
            {resultsCount > 0 && onViewAllResults && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2 h-7 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewAllResults();
                }}
              >
                <Eye className="h-3 w-3 me-1" />
                {t("laboratory.samples.viewAllResults")}
              </Button>
            )}
          </div>
        )}
        
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{format(new Date(sample.collection_date), "MMM d, yyyy")}</span>
          </div>
          {sample.retest_count > 0 && (
            <div className="flex items-center gap-1">
              <RotateCcw className="h-3 w-3" />
              <span>{t("laboratory.samples.retestNumber").replace("{{count}}", String(sample.retest_count))}</span>
            </div>
          )}
        </div>
        {sample.notes && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
            {sample.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
