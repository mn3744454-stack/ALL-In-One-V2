import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Printer, 
  Download, 
  Share2, 
  FlaskConical,
  Calendar,
  User,
  CheckCircle2,
  AlertTriangle,
  XCircle
} from "lucide-react";
import { format } from "date-fns";
import type { LabResult } from "@/hooks/laboratory/useLabResults";
import type { LabTemplate } from "@/hooks/laboratory/useLabTemplates";
import { useTenant } from "@/contexts/TenantContext";

type DesignTemplate = 'classic' | 'modern' | 'compact';

interface ResultPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: LabResult | null;
  fullTemplate?: LabTemplate | null;
}

export function ResultPreviewDialog({
  open,
  onOpenChange,
  result,
  fullTemplate,
}: ResultPreviewDialogProps) {
  const [designTemplate, setDesignTemplate] = useState<DesignTemplate>('modern');
  const { activeTenant } = useTenant();

  if (!result) return null;

  const horseName = result.sample?.horse?.name || 'Unknown Horse';
  const templateName = result.template?.name || 'Unknown Template';
  const sampleId = result.sample?.physical_sample_id || result.sample_id.slice(0, 8);
  const collectionDate = format(new Date(result.created_at), "MMM d, yyyy");

  const handlePrint = () => {
    window.print();
  };

  const getFlagIcon = (flag: string) => {
    switch (flag) {
      case 'normal': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'abnormal': return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'critical': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return null;
    }
  };

  const getFlagColor = (flag: string) => {
    switch (flag) {
      case 'normal': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'abnormal': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Parse result_data - use fullTemplate if provided, otherwise empty
  const resultData = result.result_data as Record<string, unknown> || {};
  const templateFields = fullTemplate?.fields || [];
  const normalRanges = fullTemplate?.normal_ranges || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5" />
              Result Preview
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Select value={designTemplate} onValueChange={(v) => setDesignTemplate(v as DesignTemplate)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Design" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="classic">Classic</SelectItem>
                  <SelectItem value="modern">Modern</SelectItem>
                  <SelectItem value="compact">Compact</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogHeader>

        {/* Preview Content */}
        <div className={`border rounded-lg p-6 bg-background print:border-none ${
          designTemplate === 'modern' ? 'space-y-6' :
          designTemplate === 'compact' ? 'space-y-3 text-sm' :
          'space-y-4'
        }`}>
          {/* Header */}
          <div className={`${designTemplate === 'modern' ? 'text-center border-b pb-4' : 'flex justify-between items-start'}`}>
            <div>
              <h2 className={`font-bold ${designTemplate === 'modern' ? 'text-2xl' : 'text-xl'}`}>
                {activeTenant?.tenant?.name || 'Laboratory'}
              </h2>
              {designTemplate !== 'compact' && (
                <p className="text-sm text-muted-foreground">
                  Laboratory Results Report
                </p>
              )}
            </div>
            {designTemplate === 'classic' && (
              <div className="text-right text-sm text-muted-foreground">
                <p>Report Date: {format(new Date(), "MMM d, yyyy")}</p>
                <p>ID: {result.id.slice(0, 8)}</p>
              </div>
            )}
          </div>

          {/* Patient/Sample Info */}
          <div className={`grid ${designTemplate === 'compact' ? 'grid-cols-4' : 'grid-cols-2'} gap-4 ${designTemplate === 'modern' ? 'bg-muted/50 rounded-lg p-4' : ''}`}>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Horse</p>
              <p className="font-semibold">{horseName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Sample ID</p>
              <p className="font-mono">{sampleId}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Collection Date</p>
              <p>{collectionDate}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Test Type</p>
              <p>{templateName}</p>
            </div>
          </div>

          <Separator />

          {/* Results Table */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              Test Results
              {result.flags && (
                <Badge className={getFlagColor(result.flags)}>
                  {getFlagIcon(result.flags)}
                  <span className="ml-1 capitalize">{result.flags}</span>
                </Badge>
              )}
            </h3>
            
            <div className={`border rounded-lg overflow-hidden ${designTemplate === 'modern' ? 'shadow-sm' : ''}`}>
              <table className="w-full">
                <thead className={designTemplate === 'modern' ? 'bg-primary/10' : 'bg-muted'}>
                  <tr>
                    <th className="text-left p-3 text-sm font-medium">Parameter</th>
                    <th className="text-center p-3 text-sm font-medium">Value</th>
                    <th className="text-center p-3 text-sm font-medium">Unit</th>
                    <th className="text-center p-3 text-sm font-medium">Reference Range</th>
                    <th className="text-center p-3 text-sm font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {templateFields.map((field) => {
                    const value = resultData[field.id];
                    const range = normalRanges[field.id];
                    const numValue = typeof value === 'number' ? value : parseFloat(value as string);
                    
                    let status: 'normal' | 'low' | 'high' = 'normal';
                    if (range && !isNaN(numValue)) {
                      if (range.min !== undefined && numValue < range.min) status = 'low';
                      else if (range.max !== undefined && numValue > range.max) status = 'high';
                    }

                    return (
                      <tr key={field.id} className="hover:bg-muted/50">
                        <td className="p-3">
                          <div>
                            <span className="font-medium">{field.name}</span>
                            {field.name_ar && (
                              <span className="text-xs text-muted-foreground block" dir="rtl">
                                {field.name_ar}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className={`p-3 text-center font-mono ${
                          status === 'low' ? 'text-blue-600' :
                          status === 'high' ? 'text-red-600' : ''
                        }`}>
                          {value !== undefined ? String(value) : '-'}
                        </td>
                        <td className="p-3 text-center text-muted-foreground">
                          {field.unit || '-'}
                        </td>
                        <td className="p-3 text-center text-sm text-muted-foreground">
                          {range ? `${range.min ?? '—'} - ${range.max ?? '—'}` : '-'}
                        </td>
                        <td className="p-3 text-center">
                          {status === 'normal' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                          ) : status === 'low' ? (
                            <span className="text-xs text-blue-600 font-medium">↓ Low</span>
                          ) : (
                            <span className="text-xs text-red-600 font-medium">↑ High</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Interpretation */}
          {result.interpretation && (
            <div className="bg-muted/30 rounded-lg p-4">
              <h4 className="font-medium mb-2">Interpretation</h4>
              <p className="text-sm text-muted-foreground">
                {typeof result.interpretation === 'string' 
                  ? result.interpretation 
                  : JSON.stringify(result.interpretation)}
              </p>
            </div>
          )}

          <Separator />

          {/* Footer */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              {result.creator?.full_name && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>Created by: {result.creator.full_name}</span>
                </div>
              )}
              {result.reviewer?.full_name && (
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Reviewed by: {result.reviewer.full_name}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{format(new Date(result.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex justify-center">
            <Badge 
              variant="outline" 
              className={`text-sm ${
                result.status === 'final' ? 'border-green-600 text-green-600' :
                result.status === 'reviewed' ? 'border-blue-600 text-blue-600' :
                'border-yellow-600 text-yellow-600'
              }`}
            >
              {result.status === 'final' ? 'FINAL REPORT' : 
               result.status === 'reviewed' ? 'REVIEWED' : 'DRAFT'}
            </Badge>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end print:hidden">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm" disabled>
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button variant="outline" size="sm" disabled>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
