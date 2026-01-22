import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { fetchHorseShareView, HorseShareViewData } from "@/hooks/useHorseShares";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Heart,
  Printer,
  Download,
  Calendar,
  Building2,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  Stethoscope,
  FlaskConical,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// Language detection
const SUPPORTED_LANGS = ["en", "ar"] as const;
type Language = (typeof SUPPORTED_LANGS)[number];
const DEFAULT_LANGUAGE: Language = "en";

const translations: Record<Language, Record<string, string>> = {
  en: {
    title: "Shared Horse Report",
    horseInfo: "Horse Information",
    name: "Name",
    gender: "Gender",
    birthDate: "Birth Date",
    status: "Status",
    organization: "Organization",
    vetTreatments: "Veterinary Treatments",
    labResults: "Laboratory Results",
    files: "Attachments",
    dateRange: "Date Range",
    noData: "No data available",
    errorNotFound: "Share link not found",
    errorRevoked: "This share link has been revoked",
    errorExpired: "This share link has expired",
    errorEmailLock: "This link requires you to be logged in with a specific email",
    errorEmailMismatch: "Your email does not match the required recipient",
    errorGeneric: "Failed to load shared data",
    print: "Print",
    download: "Download PDF",
    source: "Source",
    category: "Category",
    priority: "Priority",
    notes: "Notes",
    template: "Test Type",
    flags: "Flags",
    result: "Result",
    filename: "File Name",
    type: "Type",
    normal: "Normal",
    abnormal: "Abnormal",
    critical: "Critical",
    pending: "Pending",
    male: "Male",
    female: "Female",
    stallion: "Stallion",
    mare: "Mare",
    gelding: "Gelding",
  },
  ar: {
    title: "تقرير الحصان المشترك",
    horseInfo: "معلومات الحصان",
    name: "الاسم",
    gender: "الجنس",
    birthDate: "تاريخ الميلاد",
    status: "الحالة",
    organization: "المنشأة",
    vetTreatments: "العلاجات البيطرية",
    labResults: "نتائج المختبر",
    files: "المرفقات",
    dateRange: "نطاق التاريخ",
    noData: "لا توجد بيانات",
    errorNotFound: "رابط المشاركة غير موجود",
    errorRevoked: "تم إلغاء رابط المشاركة هذا",
    errorExpired: "انتهت صلاحية رابط المشاركة هذا",
    errorEmailLock: "يتطلب هذا الرابط تسجيل الدخول ببريد إلكتروني محدد",
    errorEmailMismatch: "بريدك الإلكتروني لا يطابق المستلم المطلوب",
    errorGeneric: "فشل في تحميل البيانات المشتركة",
    print: "طباعة",
    download: "تحميل PDF",
    source: "المصدر",
    category: "الفئة",
    priority: "الأولوية",
    notes: "ملاحظات",
    template: "نوع الفحص",
    flags: "العلامات",
    result: "النتيجة",
    filename: "اسم الملف",
    type: "النوع",
    normal: "طبيعي",
    abnormal: "غير طبيعي",
    critical: "حرج",
    pending: "قيد الانتظار",
    male: "ذكر",
    female: "أنثى",
    stallion: "فحل",
    mare: "فرس",
    gelding: "حصان مخصي",
  },
};

function detectLanguage(searchParams: URLSearchParams): Language {
  const langParam = searchParams.get("lang");
  if (langParam && SUPPORTED_LANGS.includes(langParam as Language)) {
    return langParam as Language;
  }
  const browserLang = navigator.language.split("-")[0];
  if (SUPPORTED_LANGS.includes(browserLang as Language)) {
    return browserLang as Language;
  }
  return DEFAULT_LANGUAGE;
}

export default function SharedHorseReport() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<HorseShareViewData | null>(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const lang = useMemo(() => detectLanguage(searchParams), [searchParams]);
  const dir = lang === "ar" ? "rtl" : "ltr";

  const t = (key: string): string => translations[lang][key] || key;

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    const result = await fetchHorseShareView(token);
    setData(result);
    setLoading(false);
  };

  const handlePrint = () => {
    if (!reportRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups");
      return;
    }

    const content = reportRef.current.innerHTML;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="${lang}" dir="${dir}">
      <head>
        <title>${t("title")} - ${data?.data?.horse.name}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { 
            font-family: system-ui, -apple-system, sans-serif; 
            padding: 20mm;
            color: #1f2937;
            direction: ${dir};
          }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 10px; text-align: ${dir === "rtl" ? "right" : "left"}; border: 1px solid #e5e7eb; }
          th { background-color: #f3f4f6; font-weight: 600; }
          .header { margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #e5e7eb; }
          .section { margin-bottom: 24px; }
          .section-title { font-size: 1.125rem; font-weight: 600; margin-bottom: 12px; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; }
          svg { display: none; }
          @media print { body { padding: 15mm; } }
        </style>
      </head>
      <body>${content}</body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current || !data?.data) return;

    setGeneratingPDF(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 10;

      pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - 20;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - 20;
      }

      pdf.save(`horse-report-${data.data.horse.name}.pdf`);
      toast.success("PDF downloaded");
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setGeneratingPDF(false);
    }
  };

  const getGenderLabel = (gender: string): string => {
    const genderMap: Record<string, string> = {
      male: t("male"),
      female: t("female"),
      stallion: t("stallion"),
      mare: t("mare"),
      gelding: t("gelding"),
    };
    return genderMap[gender.toLowerCase()] || gender;
  };

  const getFlagBadge = (flag: string | null) => {
    if (!flag) return null;
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      normal: "default",
      abnormal: "secondary",
      critical: "destructive",
    };
    return (
      <Badge variant={variants[flag.toLowerCase()] || "secondary"}>
        {t(flag.toLowerCase()) || flag}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 sm:p-8" dir={dir}>
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-60 w-full" />
        </div>
      </div>
    );
  }

  if (!data || !data.success) {
    const errorMessages: Record<string, string> = {
      not_found: t("errorNotFound"),
      revoked: t("errorRevoked"),
      expired: t("errorExpired"),
      email_lock_requires_login: t("errorEmailLock"),
      email_mismatch: t("errorEmailMismatch"),
    };

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" dir={dir}>
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <XCircle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-lg font-semibold">
              {errorMessages[data?.error || ""] || t("errorGeneric")}
            </h2>
            {data?.error === "email_lock_requires_login" && (
              <Button onClick={() => (window.location.href = "/auth")}>
                {lang === "ar" ? "تسجيل الدخول" : "Sign In"}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const { horse, vet_treatments, lab_results, files } = data.data!;
  const { share } = data;

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      {/* Header Actions */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-semibold text-lg">{t("title")}</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 me-2" />
              {t("print")}
            </Button>
            <Button size="sm" onClick={handleDownloadPDF} disabled={generatingPDF}>
              <Download className="h-4 w-4 me-2" />
              {generatingPDF ? "..." : t("download")}
            </Button>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-6" ref={reportRef}>
        {/* Horse Info */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-gold" />
              {t("horseInfo")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                {horse.avatar_url ? (
                  <img
                    src={horse.avatar_url}
                    alt={horse.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Heart className="h-8 w-8 text-gold/50" />
                )}
              </div>
              <div className="space-y-2 flex-1">
                <div>
                  <h2 className="text-xl font-bold">{horse.name}</h2>
                  {horse.name_ar && (
                    <p className="text-muted-foreground" dir="rtl">
                      {horse.name_ar}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t("gender")}:</span>{" "}
                    {getGenderLabel(horse.gender)}
                  </div>
                  {horse.birth_date && (
                    <div>
                      <span className="text-muted-foreground">{t("birthDate")}:</span>{" "}
                      {format(new Date(horse.birth_date), "PP")}
                    </div>
                  )}
                  {horse.tenant_name && (
                    <div className="flex items-center gap-1">
                      <Building2 className="h-3 w-3 text-muted-foreground" />
                      <span>{horse.tenant_name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Date Range Filter Info */}
            {(share?.date_from || share?.date_to) && (
              <div className="mt-4 pt-4 border-t flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{t("dateRange")}:</span>
                <span>
                  {share.date_from ? format(new Date(share.date_from), "PP") : "—"} –{" "}
                  {share.date_to ? format(new Date(share.date_to), "PP") : "—"}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vet Treatments */}
        {share?.scope.includeVet && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-gold" />
                {t("vetTreatments")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {vet_treatments.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">{t("noData")}</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("name")}</TableHead>
                        <TableHead>{t("category")}</TableHead>
                        <TableHead>{t("status")}</TableHead>
                        <TableHead>{t("source")}</TableHead>
                        <TableHead>{t("birthDate")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vet_treatments.map((treatment) => (
                        <TableRow key={treatment.id}>
                          <TableCell className="font-medium">{treatment.title}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{treatment.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                treatment.status === "completed"
                                  ? "default"
                                  : treatment.status === "cancelled"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {treatment.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {treatment.source_tenant || "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(
                              new Date(treatment.requested_at || treatment.created_at),
                              "PP"
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Lab Results */}
        {share?.scope.includeLab && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-gold" />
                {t("labResults")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lab_results.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">{t("noData")}</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("template")}</TableHead>
                        <TableHead>{t("status")}</TableHead>
                        <TableHead>{t("flags")}</TableHead>
                        <TableHead>{t("source")}</TableHead>
                        <TableHead>{t("birthDate")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lab_results.map((result) => (
                        <TableRow key={result.id}>
                          <TableCell className="font-medium">
                            {result.template_name || "—"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={result.status === "final" ? "default" : "secondary"}
                            >
                              {result.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{getFlagBadge(result.flags)}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {result.source_tenant || "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(result.created_at), "PP")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Files */}
        {share?.scope.includeFiles && files.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-gold" />
                {t("files")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 p-3 rounded-lg border"
                  >
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {file.mime_type} • {format(new Date(file.created_at), "PP")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pt-4 border-t">
          {lang === "ar"
            ? `تم إنشاء هذا التقرير تلقائياً • ${format(new Date(), "PPP")}`
            : `Report generated automatically • ${format(new Date(), "PPP")}`}
        </div>
      </div>
    </div>
  );
}
