import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Printer,
  Download,
  FlaskConical,
  Calendar,
  User,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Loader2,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import type { LabSample } from "@/hooks/laboratory/useLabSamples";
import type { LabResult } from "@/hooks/laboratory/useLabResults";
import { useLabResults } from "@/hooks/laboratory/useLabResults";
import { useLabTemplates } from "@/hooks/laboratory/useLabTemplates";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";

interface CombinedResultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sample: LabSample | null;
  onReviewResult?: (resultId: string) => Promise<unknown>;
  onFinalizeResult?: (resultId: string) => Promise<unknown>;
}

export function CombinedResultsDialog({
  open,
  onOpenChange,
  sample,
  onReviewResult,
  onFinalizeResult,
}: CombinedResultsDialogProps) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const { activeTenant } = useTenant();
  
  const { results, loading: resultsLoading } = useLabResults({ 
    sample_id: sample?.id 
  });
  const { templates } = useLabTemplates();

  if (!sample) return null;

  const horseName = sample.horse?.name || "Unknown Horse";
  const sampleId = sample.physical_sample_id || sample.id.slice(0, 8);
  
  // Map results by template_id for quick lookup
  const resultsByTemplate = new Map<string, LabResult>();
  results.forEach(r => {
    resultsByTemplate.set(r.template_id, r);
  });

  // Get ordered templates from sample
  const orderedTemplates = sample.templates
    ?.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map(st => {
      const fullTemplate = templates.find(t => t.id === st.template.id);
      return {
        ...st,
        fullTemplate,
        result: resultsByTemplate.get(st.template.id),
      };
    }) || [];

  const completedCount = orderedTemplates.filter(t => t.result).length;
  const totalCount = orderedTemplates.length;
  const allFinal = orderedTemplates.every(t => t.result?.status === 'final');

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'final':
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            معتمد
          </Badge>
        );
      case 'reviewed':
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            تمت المراجعة
          </Badge>
        );
      case 'draft':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
            <Clock className="h-3 w-3 mr-1" />
            مسودة
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground">
            <Clock className="h-3 w-3 mr-1" />
            لم تُسجّل
          </Badge>
        );
    }
  };

  const getFlagIcon = (flag?: string) => {
    switch (flag) {
      case 'normal': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'abnormal': return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'critical': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return null;
    }
  };

  const handlePrint = () => {
    if (!previewRef.current) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("يرجى السماح بالنوافذ المنبثقة للطباعة");
      return;
    }
    
    const content = previewRef.current.innerHTML;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <title>تقرير المختبر - ${horseName}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { 
            font-family: system-ui, -apple-system, sans-serif; 
            padding: 20mm;
            color: #1f2937;
            direction: rtl;
          }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 10px; text-align: right; border: 1px solid #e5e7eb; }
          th { background-color: #f3f4f6; font-weight: 600; }
          .text-center { text-align: center; }
          .font-bold { font-weight: 700; }
          .font-semibold { font-weight: 600; }
          .font-medium { font-weight: 500; }
          .font-mono { font-family: monospace; }
          .text-sm { font-size: 0.875rem; }
          .text-xs { font-size: 0.75rem; }
          .text-2xl { font-size: 1.5rem; }
          .text-muted { color: #6b7280; }
          .text-green-600 { color: #16a34a; }
          .text-red-600 { color: #dc2626; }
          .text-blue-600 { color: #2563eb; }
          .bg-muted { background-color: #f9fafb; padding: 16px; border-radius: 8px; margin: 16px 0; }
          .grid { display: grid; gap: 16px; }
          .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
          .grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
          .flex { display: flex; }
          .items-center { align-items: center; }
          .justify-between { justify-content: space-between; }
          .gap-2 { gap: 8px; }
          .gap-4 { gap: 16px; }
          .mb-4 { margin-bottom: 16px; }
          .mt-6 { margin-top: 24px; }
          .p-4 { padding: 16px; }
          .border { border: 1px solid #e5e7eb; }
          .rounded-lg { border-radius: 8px; }
          .space-y-6 > * + * { margin-top: 24px; }
          hr { border: none; border-top: 1px solid #e5e7eb; margin: 16px 0; }
          .badge { 
            display: inline-flex; 
            align-items: center; 
            padding: 4px 12px; 
            border-radius: 9999px; 
            font-size: 0.75rem;
            font-weight: 500;
          }
          svg { display: none; }
          .template-section { page-break-inside: avoid; margin-bottom: 24px; }
          @media print {
            body { padding: 15mm; }
          }
        </style>
      </head>
      <body>
        ${content}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleDownloadPDF = async () => {
    if (!previewRef.current) return;
    
    setIsGeneratingPDF(true);
    try {
      const clone = previewRef.current.cloneNode(true) as HTMLElement;
      clone.style.position = 'absolute';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      clone.style.width = '800px';
      clone.style.height = 'auto';
      clone.style.maxHeight = 'none';
      clone.style.overflow = 'visible';
      clone.style.backgroundColor = '#ffffff';
      clone.style.padding = '40px';
      document.body.appendChild(clone);
      
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 800,
        height: clone.scrollHeight,
      });
      
      document.body.removeChild(clone);
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);
      const contentHeight = (canvas.height * contentWidth) / canvas.width;
      
      let heightLeft = contentHeight;
      let position = margin;
      
      pdf.addImage(imgData, 'PNG', margin, position, contentWidth, contentHeight);
      heightLeft -= (pageHeight - margin * 2);
      
      while (heightLeft > 0) {
        position = heightLeft - contentHeight + margin;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', margin, position, contentWidth, contentHeight);
        heightLeft -= (pageHeight - margin * 2);
      }
      
      pdf.save(`lab-report-${horseName}-${sample.id.slice(0, 8)}.pdf`);
      toast.success("تم تحميل PDF بنجاح");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("فشل في إنشاء PDF");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            تقرير مجمّع للعينة
          </DialogTitle>
        </DialogHeader>

        {resultsLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <>
            {/* Preview Content */}
            <div ref={previewRef} className="border rounded-lg p-3 md:p-6 bg-background space-y-4 md:space-y-6 overflow-x-hidden" dir="rtl">
              {/* Header */}
              <div className="text-center border-b pb-4">
                <h2 className="font-bold text-xl md:text-2xl">
                  {activeTenant?.tenant?.name || 'المختبر'}
                </h2>
                <p className="text-xs md:text-sm text-muted-foreground">
                  تقرير نتائج المختبر المجمّع
                </p>
              </div>

              {/* Sample Info */}
              <div className="grid grid-cols-2 gap-2 md:gap-4 bg-muted/50 rounded-lg p-3 md:p-4">
                <div>
                  <p className="text-xs text-muted-foreground">اسم الحصان</p>
                  <p className="font-semibold text-sm md:text-base truncate">{horseName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">معرف العينة</p>
                  <p className="font-mono text-sm md:text-base">{sampleId}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">تاريخ الجمع</p>
                  <p className="text-sm md:text-base">{format(new Date(sample.collection_date), "d MMM yyyy")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">التحاليل</p>
                  <p className="text-sm md:text-base">{completedCount}/{totalCount} مكتمل</p>
                </div>
              </div>

              {/* Warning if incomplete */}
              {completedCount < totalCount && (
                <div className="flex items-center gap-2 p-2 md:p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-200">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span className="text-xs md:text-sm">
                    هذا التقرير غير مكتمل. بعض التحاليل لم تُسجّل بعد.
                  </span>
                </div>
              )}

              <Separator />

              {/* Results by Template */}
              {orderedTemplates.map((templateData, index) => {
                const { template, fullTemplate, result } = templateData;
                const templateFields = fullTemplate?.fields || [];
                const normalRanges = fullTemplate?.normal_ranges || {};
                const resultData = (result?.result_data as Record<string, unknown>) || {};

                return (
                  <div key={template.id} className="template-section">
                    {/* Template Header */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3 md:mb-4">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground hidden md:block" />
                        <h3 className="font-semibold text-sm md:text-base">
                          {index + 1}. {template.name_ar || template.name}
                        </h3>
                        {result?.flags && getFlagIcon(result.flags)}
                      </div>
                      <div className="flex items-center gap-1 md:gap-2">
                        {getStatusBadge(result?.status)}
                        {/* Action Buttons */}
                        {result?.status === 'draft' && onReviewResult && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => onReviewResult(result.id)}
                            className="print:hidden h-7 text-xs"
                          >
                            مراجعة
                          </Button>
                        )}
                        {result?.status === 'reviewed' && onFinalizeResult && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => onFinalizeResult(result.id)}
                            className="print:hidden h-7 text-xs"
                          >
                            اعتماد
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Results Table */}
                    {result ? (
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-muted">
                            <tr>
                              <th className="text-right p-2 md:p-3 text-xs md:text-sm font-medium">المعامل</th>
                              <th className="text-center p-2 md:p-3 text-xs md:text-sm font-medium">القيمة</th>
                              <th className="text-center p-2 md:p-3 text-xs md:text-sm font-medium">الوحدة</th>
                              <th className="text-center p-2 md:p-3 text-xs md:text-sm font-medium">المرجعي</th>
                              <th className="text-center p-2 md:p-3 text-xs md:text-sm font-medium">الحالة</th>
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
                                  <td className="p-2 md:p-3">
                                    <span className="font-medium text-xs md:text-sm">{field.name_ar || field.name}</span>
                                  </td>
                                  <td className={`p-2 md:p-3 text-center font-mono text-xs md:text-base ${
                                    status === 'low' ? 'text-blue-600' :
                                    status === 'high' ? 'text-red-600' : ''
                                  }`}>
                                    {value !== undefined ? String(value) : '-'}
                                  </td>
                                  <td className="p-2 md:p-3 text-center text-muted-foreground text-xs md:text-sm">
                                    {field.unit || '-'}
                                  </td>
                                  <td className="p-2 md:p-3 text-center text-xs text-muted-foreground">
                                    {range ? `${range.min ?? '—'} - ${range.max ?? '—'}` : '-'}
                                  </td>
                                  <td className="p-2 md:p-3 text-center">
                                    {status === 'normal' ? (
                                      <CheckCircle2 className="h-3 w-3 md:h-4 md:w-4 text-green-600 mx-auto" />
                                    ) : status === 'low' ? (
                                      <span className="text-xs text-blue-600 font-medium">↓</span>
                                    ) : (
                                      <span className="text-xs text-red-600 font-medium">↑</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        
                        {/* Creator/Reviewer Info */}
                        {(result.creator?.full_name || result.reviewer?.full_name) && (
                          <div className="bg-muted/30 px-3 md:px-4 py-2 text-xs text-muted-foreground flex flex-wrap items-center gap-2 md:gap-4">
                            {result.creator?.full_name && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                أنشأ: {result.creator.full_name}
                              </span>
                            )}
                            {result.reviewer?.full_name && (
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                راجع: {result.reviewer.full_name}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="border rounded-lg p-4 md:p-6 text-center text-muted-foreground bg-muted/20">
                        <Clock className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">لم تُسجّل النتائج بعد</p>
                      </div>
                    )}
                    
                    {index < orderedTemplates.length - 1 && (
                      <Separator className="mt-4 md:mt-6" />
                    )}
                  </div>
                );
              })}

              {/* Footer Status */}
              <div className="flex justify-center pt-4 border-t">
                <Badge 
                  variant="outline" 
                  className={`text-xs md:text-sm ${
                    allFinal ? 'border-green-600 text-green-600' :
                    completedCount === totalCount ? 'border-blue-600 text-blue-600' :
                    'border-yellow-600 text-yellow-600'
                  }`}
                >
                  {allFinal ? 'تقرير نهائي معتمد' : 
                   completedCount === totalCount ? 'في انتظار الاعتماد' : 
                   'تقرير جزئي'}
                </Badge>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end print:hidden">
              <Button variant="outline" size="sm" onClick={handlePrint} className="h-8 text-xs md:text-sm">
                <Printer className="h-4 w-4 mr-1 md:mr-2" />
                طباعة
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF}
                className="h-8 text-xs md:text-sm"
              >
                {isGeneratingPDF ? (
                  <Loader2 className="h-4 w-4 mr-1 md:mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-1 md:mr-2" />
                )}
                PDF
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
