import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Printer, 
  Download, 
  FlaskConical, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  Loader2,
  ShieldAlert
} from "lucide-react";
import { formatStandardDate, formatStandardDateTime } from "@/lib/displayHelpers";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "sonner";
import { detectLanguage, isRTL, translations, DEFAULT_LANGUAGE } from "@/i18n";
import type { Language } from "@/i18n";
import { printReport } from "@/lib/laboratory/printReport";

// Interface matching ACTUAL RPC output (10 fields)
interface SharedResultData {
  result_id: string;
  status: string;
  result_data: Record<string, unknown>;
  interpretation: unknown;
  flags: string | null;
  created_at: string;
  horse_display_name: string;
  template_name: string;
  tenant_display_name: string;
  client_display_name: string | null;
}

// Get nested translation value
const getNestedValue = (obj: unknown, path: string): string => {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return path;
    }
  }

  return typeof current === 'string' ? current : path;
};

// Safe value formatter - handles all types without heavy JSON
const formatValue = (val: unknown): string => {
  if (val === null || val === undefined) return '-';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'number') return val.toLocaleString();
  if (Array.isArray(val)) {
    if (val.length === 0) return '-';
    if (val.length <= 3) return val.map(v => formatValue(v)).join(', ');
    return `${val.slice(0, 3).map(v => formatValue(v)).join(', ')}... (+${val.length - 3})`;
  }
  if (typeof val === 'object') {
    const keys = Object.keys(val as object);
    if (keys.length === 0) return '-';
    return `{${keys.length} fields}`;
  }
  // String - truncate if too long
  const str = String(val);
  if (str.length > 50) return str.slice(0, 47) + '...';
  return str;
};

// Format key for display - handle UUIDs and snake_case
const prettyKey = (key: string): string => {
  // UUID pattern - show first 8 chars
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)) {
    return key.slice(0, 8) + '...';
  }
  // snake_case to Title Case
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
};

export default function SharedLabResult() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<SharedResultData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // Detect language from URL > localStorage > navigator > default
  const lang = useMemo(() => detectLanguage(searchParams), [searchParams]);
  const dir = isRTL(lang) ? 'rtl' : 'ltr';

  // Local translator function using detected language
  const t = (key: string): string => {
    const dict = translations[lang as Language] || translations[DEFAULT_LANGUAGE];
    return getNestedValue(dict, key);
  };

  // Set document language and direction on mount
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  useEffect(() => {
    if (token) {
      fetchSharedResult();
    }
  }, [token]);

  const fetchSharedResult = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: rpcError } = await supabase.rpc("get_shared_lab_result", {
        _share_token: token,
      });

      if (rpcError) throw rpcError;

      if (!data || (Array.isArray(data) && data.length === 0)) {
        setError(t("laboratory.sharedResult.linkError"));
        setResult(null);
      } else {
        // RPC returns a single row or array with one element
        const resultData = Array.isArray(data) ? data[0] : data;
        setResult(resultData as SharedResultData);
      }
    } catch (err) {
      console.error("Error fetching shared result:", err);
      setError(t("laboratory.sharedResult.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  // Render interpretation safely (can be string/object/null)
  const renderInterpretation = (interpretation: unknown): React.ReactNode => {
    if (!interpretation) return <p className="text-muted-foreground">{t("laboratory.sharedResult.noInterpretation")}</p>;
    if (typeof interpretation === 'string') return <p>{interpretation}</p>;
    if (typeof interpretation === 'object' && interpretation !== null) {
      const entries = Object.entries(interpretation);
      if (entries.length === 0) return <p className="text-muted-foreground">{t("laboratory.sharedResult.noInterpretation")}</p>;
      return (
        <div className="space-y-2">
          {entries.map(([key, value]) => (
            <div key={key}>
              <span className="font-medium">{prettyKey(key)}:</span>{' '}
              <span>{formatValue(value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return <p>{String(interpretation)}</p>;
  };

  const handlePrint = () => {
    if (!result) return;
    printReport(previewRef.current, {
      title: `${t("laboratory.sharedResult.labReport")} - ${result.horse_display_name}`,
    });
  };

  const handleDownloadPDF = async () => {
    if (!previewRef.current || !result) return;
    
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
      clone.style.direction = dir;
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
      
      pdf.save(`lab-result-${result.horse_display_name}-${result.result_id.slice(0, 8)}.pdf`);
      toast.success(t("laboratory.sharedResult.pdfSuccess"));
    } catch (err) {
      console.error("Error generating PDF:", err);
      toast.error(t("laboratory.sharedResult.pdfFailed"));
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const getFlagColor = (flag: string | null) => {
    switch (flag) {
      case 'normal': return 'bg-green-100 text-green-800';
      case 'abnormal': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getFlagIcon = (flag: string | null) => {
    switch (flag) {
      case 'normal': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'abnormal': return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'critical': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return null;
    }
  };

  const getFlagLabel = (flag: string | null) => {
    switch (flag) {
      case 'normal': return t("laboratory.flags.normal");
      case 'abnormal': return t("laboratory.flags.abnormal");
      case 'critical': return t("laboratory.flags.critical");
      default: return flag;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8" dir={dir}>
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" dir={dir}>
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold mb-2">{t("laboratory.sharedResult.unableToView")}</h1>
          <p className="text-muted-foreground">
            {error || t("laboratory.sharedResult.linkInvalid")}
          </p>
        </div>
      </div>
    );
  }

  // Get result entries safely from result_data
  const resultEntries = Object.entries(result.result_data || {});

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      {/* Header Actions - Sticky on mobile */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <FlaskConical className="h-5 w-5 text-primary shrink-0" />
            <span className="font-semibold truncate">{t("laboratory.sharedResult.labReport")}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 md:me-2" />
              <span className="hidden md:inline">{t("laboratory.sharedResult.print")}</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
            >
              {isGeneratingPDF ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Download className="h-4 w-4 md:me-2" />
                  <span className="hidden md:inline">{t("laboratory.sharedResult.pdf")}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Report Content */}
      <main className="max-w-3xl mx-auto p-4 md:p-8">
        <div ref={previewRef} className="bg-background space-y-6">
          {/* Report Header */}
          <div className="text-center border-b pb-4">
            <h1 className="text-2xl font-bold">{result.tenant_display_name}</h1>
            <p className="text-sm text-muted-foreground">{t("laboratory.sharedResult.labResultsReport")}</p>
          </div>

          {/* Patient/Sample Info */}
          <div className="grid grid-cols-2 gap-4 bg-muted/50 rounded-lg p-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("laboratory.sharedResult.horse")}</p>
              <p className="font-semibold">{result.horse_display_name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("laboratory.sharedResult.testType")}</p>
              <p className="font-medium">{result.template_name}</p>
            </div>
            {result.client_display_name && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("laboratory.sharedResult.client")}</p>
                <p className="font-medium">{result.client_display_name}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("laboratory.sharedResult.reportDate")}</p>
              <p>{formatStandardDate(result.created_at)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("laboratory.sharedResult.status")}</p>
              <Badge variant="secondary" className="capitalize">{result.status}</Badge>
            </div>
          </div>

          <Separator />

          {/* Results Table */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              {t("laboratory.sharedResult.testResults")}
              {result.flags && (
                <Badge className={getFlagColor(result.flags)}>
                  {getFlagIcon(result.flags)}
                  <span className="ms-1 capitalize">{getFlagLabel(result.flags)}</span>
                </Badge>
              )}
            </h3>
            
            <div className="border rounded-lg overflow-hidden shadow-sm">
              <table className="w-full">
                <thead className="bg-primary/10">
                  <tr>
                    <th className="text-start p-3 text-sm font-medium">{t("laboratory.sharedResult.parameter")}</th>
                    <th className="text-center p-3 text-sm font-medium">{t("laboratory.sharedResult.value")}</th>
                    <th className="text-center p-3 text-sm font-medium hidden md:table-cell">{t("laboratory.sharedResult.unit")}</th>
                    <th className="text-center p-3 text-sm font-medium hidden lg:table-cell">{t("laboratory.sharedResult.reference")}</th>
                    <th className="text-center p-3 text-sm font-medium">{t("laboratory.sharedResult.status")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {resultEntries.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted-foreground">
                        {t("laboratory.sharedResult.noResultData")}
                      </td>
                    </tr>
                  ) : (
                    resultEntries.map(([key, value]) => (
                      <tr key={key} className="hover:bg-muted/50">
                        <td className="p-3">
                          <span className="font-medium">{prettyKey(key)}</span>
                        </td>
                        <td className="p-3 text-center font-mono">
                          {formatValue(value)}
                        </td>
                        <td className="p-3 text-center text-muted-foreground hidden md:table-cell">
                          -
                        </td>
                        <td className="p-3 text-center text-sm text-muted-foreground hidden lg:table-cell">
                          -
                        </td>
                        <td className="p-3 text-center">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Interpretation */}
          <div className="bg-muted/30 rounded-lg p-4">
            <h4 className="font-medium mb-2">{t("laboratory.sharedResult.interpretation")}</h4>
            <div className="text-sm text-muted-foreground">
              {renderInterpretation(result.interpretation)}
            </div>
          </div>

          <Separator />

          {/* Footer */}
          <div className="text-sm text-muted-foreground text-center space-y-1">
            <div className="flex items-center justify-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{formatStandardDateTime(result.created_at)}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
