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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Printer, 
  Download, 
  Share2, 
  FlaskConical,
  Calendar,
  User,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  MessageCircle,
  Send,
  Link2
} from "lucide-react";
import { format } from "date-fns";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import type { LabResult } from "@/hooks/laboratory/useLabResults";
import type { LabTemplate } from "@/hooks/laboratory/useLabTemplates";
import { ResultSharePanel } from "./ResultSharePanel";
import { PublishToStableAction } from "./PublishToStableAction";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";

type DesignTemplate = 'classic' | 'modern' | 'compact';

interface ResultPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: LabResult | null;
  fullTemplate?: LabTemplate | null;
  onReview?: (resultId: string) => Promise<void>;
  onFinalize?: (resultId: string) => Promise<void>;
  onPublishToStable?: (resultId: string) => Promise<boolean>;
}

export function ResultPreviewDialog({
  open,
  onOpenChange,
  result,
  fullTemplate,
  onReview,
  onFinalize,
  onPublishToStable,
}: ResultPreviewDialogProps) {
  const [designTemplate, setDesignTemplate] = useState<DesignTemplate>('modern');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const { activeTenant } = useTenant();
  const [published, setPublished] = useState(result?.published_to_stable ?? false);

  // Reset published state when result changes
  const resultId = result?.id;
  const resultPublished = result?.published_to_stable;
  if (resultId && published !== (resultPublished ?? false) && !isPublishing) {
    setPublished(resultPublished ?? false);
  }

  if (!result) return null;

  const horseName = result.sample?.horse?.name || 'Unknown Horse';
  const templateName = result.template?.name || 'Unknown Template';
  const sampleId = result.sample?.physical_sample_id || result.sample_id.slice(0, 8);
  const collectionDate = format(new Date(result.created_at), "MMM d, yyyy");

  const handlePrint = () => {
    if (!previewRef.current) return;
    
    // Create a new window for printing with full content
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Please allow popups for printing");
      return;
    }
    
    const content = previewRef.current.innerHTML;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Lab Report - ${horseName}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { 
            font-family: system-ui, -apple-system, sans-serif; 
            padding: 20mm;
            color: #1f2937;
          }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 10px; text-align: left; border: 1px solid #e5e7eb; }
          th { background-color: #f3f4f6; font-weight: 600; }
          .text-center { text-align: center; }
          .font-bold { font-weight: 700; }
          .font-semibold { font-weight: 600; }
          .font-medium { font-weight: 500; }
          .font-mono { font-family: monospace; }
          .text-sm { font-size: 0.875rem; }
          .text-xs { font-size: 0.75rem; }
          .text-2xl { font-size: 1.5rem; }
          .text-xl { font-size: 1.25rem; }
          .uppercase { text-transform: uppercase; }
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
          .justify-center { justify-content: center; }
          .gap-1 { gap: 4px; }
          .gap-2 { gap: 8px; }
          .gap-4 { gap: 16px; }
          .mb-2 { margin-bottom: 8px; }
          .mb-3 { margin-bottom: 12px; }
          .p-3 { padding: 12px; }
          .p-4 { padding: 16px; }
          .border { border: 1px solid #e5e7eb; }
          .rounded-lg { border-radius: 8px; }
          .space-y-4 > * + * { margin-top: 16px; }
          .space-y-6 > * + * { margin-top: 24px; }
          hr { border: none; border-top: 1px solid #e5e7eb; margin: 16px 0; }
          .badge { 
            display: inline-flex; 
            align-items: center; 
            padding: 4px 12px; 
            border-radius: 9999px; 
            font-size: 0.75rem;
            font-weight: 500;
            border: 1px solid;
          }
          .badge-green { border-color: #16a34a; color: #16a34a; }
          .badge-blue { border-color: #2563eb; color: #2563eb; }
          .badge-yellow { border-color: #ca8a04; color: #ca8a04; }
          svg { display: none; }
          @media print {
            body { padding: 15mm; }
          }
        </style>
      </head>
      <body>
        <div class="space-y-6">
          ${content}
        </div>
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
      // Clone the content to capture full height
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
      
      const pageWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);
      const contentHeight = (canvas.height * contentWidth) / canvas.width;
      
      // Add image - if content is longer than one page, add multiple pages
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
      
      pdf.save(`lab-result-${horseName}-${result.id.slice(0, 8)}.pdf`);
      
      toast.success("تم تحميل PDF بنجاح");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("فشل في إنشاء PDF");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleShare = (platform: 'whatsapp' | 'telegram' | 'copy') => {
    const reportUrl = window.location.href;
    const message = `Lab Report for ${horseName} - ${templateName}`;
    
    switch (platform) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(message + '\n' + reportUrl)}`, '_blank');
        break;
      case 'telegram':
        window.open(`https://t.me/share/url?url=${encodeURIComponent(reportUrl)}&text=${encodeURIComponent(message)}`, '_blank');
        break;
      case 'copy':
        navigator.clipboard.writeText(reportUrl);
        toast.success("تم نسخ الرابط");
        break;
    }
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
        <div 
          ref={previewRef}
          className={`print-content border rounded-lg p-6 bg-background print:border-none ${
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
        <div className="flex flex-wrap gap-2 justify-between print:hidden">
          {/* Status Change Buttons */}
          <div className="flex gap-2">
            {result.status === 'draft' && onReview && (
              <Button 
                size="sm" 
                variant="outline"
                className="border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                onClick={() => onReview(result.id)}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                مراجعة
              </Button>
            )}
            {result.status === 'reviewed' && onFinalize && (
              <Button 
                size="sm" 
                variant="outline"
                className="border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                onClick={() => onFinalize(result.id)}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                اعتماد
              </Button>
            )}
          </div>
          
          {/* Print/PDF/Share + Publish (all together in footer) */}
          <div className="flex gap-2 flex-wrap">
            {/* Publish to Stable - next to PDF/Print */}
            {onPublishToStable && (
              <PublishToStableAction
                resultId={result.id}
                status={result.status}
                published_to_stable={published}
                sample_lab_request_id={result.sample?.lab_request_id}
                onPublish={async (id) => {
                  setIsPublishing(true);
                  const ok = await onPublishToStable(id);
                  if (ok) setPublished(true);
                  setIsPublishing(false);
                  return ok;
                }}
              />
            )}
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
            >
              {isGeneratingPDF ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              PDF
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background">
                <DropdownMenuItem onClick={() => handleShare('whatsapp')}>
                  <MessageCircle className="h-4 w-4 mr-2 text-green-600" />
                  WhatsApp
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleShare('telegram')}>
                  <Send className="h-4 w-4 mr-2 text-blue-500" />
                  Telegram
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleShare('copy')}>
                  <Link2 className="h-4 w-4 mr-2" />
                  Copy Link
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Share Management Panel */}
        <Separator className="print:hidden" />
        <div className="print:hidden">
          <ResultSharePanel resultId={result.id} resultStatus={result.status} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
