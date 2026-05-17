import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FlaskConical, Printer, ShieldAlert } from "lucide-react";
import { formatStandardDate } from "@/lib/displayHelpers";
import { LabResultReportViewer } from "@/components/laboratory/LabResultReportViewer";
import { translations, isRTL as isRTLLang, type Language } from "@/i18n";
import { printReport } from "@/lib/laboratory/printReport";

interface SharedReportResult {
  result_id: string;
  sort_order: number;
  status: string;
  flags: string | null;
  result_data: Record<string, unknown> | null;
  interpretation: unknown;
  created_at: string;
  template_id: string;
  template_name: string;
  template_name_ar: string | null;
  template_fields: unknown;
  template_groups: unknown;
  template_normal_ranges: unknown;
}

interface SharedReportData {
  share: {
    token: string;
    display_name_mode: "real" | "alias" | "sender_snapshot";
    preferred_locale: "ar" | "en";
    expires_at: string | null;
    created_at: string;
  };
  sample: {
    id: string;
    physical_sample_id: string | null;
    collection_date: string | null;
    received_at: string | null;
  };
  tenant_display_name: string;
  client_display_name: string | null;
  horse_display_name: string;
  results: SharedReportResult[];
}

const getNested = (obj: unknown, path: string): string => {
  const keys = path.split(".");
  let cur: unknown = obj;
  for (const k of keys) {
    if (cur && typeof cur === "object" && k in cur) {
      cur = (cur as Record<string, unknown>)[k];
    } else {
      return path;
    }
  }
  return typeof cur === "string" ? cur : path;
};

export default function SharedLabReport() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SharedReportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lang: Language = useMemo(() => {
    const url = searchParams.get("lang");
    if (url === "ar" || url === "en") return url;
    return (data?.share.preferred_locale as Language) || "ar";
  }, [searchParams, data?.share.preferred_locale]);
  const dir = isRTLLang(lang) ? "rtl" : "ltr";

  const t = (key: string) => {
    const dict = translations[lang] || translations.en;
    return getNested(dict, key);
  };

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  useEffect(() => {
    if (!token) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc(
          "get_shared_lab_report",
          { _share_token: token } as never
        );
        if (rpcErr) throw rpcErr;
        if (!rpcData) {
          setError(t("laboratory.sharedResult.linkError"));
        } else {
          setData(rpcData as unknown as SharedReportData);
        }
      } catch (err) {
        console.error("get_shared_lab_report failed", err);
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("revoked")) setError(t("laboratory.share.revoked"));
        else if (msg.includes("expired")) setError(t("laboratory.share.expired"));
        else setError(t("laboratory.sharedResult.loadFailed"));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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

  if (error || !data) {
    return (
      <div
        className="min-h-screen bg-background flex items-center justify-center p-4"
        dir={dir}
      >
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold mb-2">
            {t("laboratory.sharedResult.unableToView")}
          </h1>
          <p className="text-muted-foreground">
            {error || t("laboratory.sharedResult.linkInvalid")}
          </p>
        </div>
      </div>
    );
  }

  const reportLocale = lang === "ar" ? "ar" : "en";

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <FlaskConical className="h-5 w-5 text-primary shrink-0" />
            <span className="font-semibold truncate">
              {t("laboratory.sharedResult.labReport")}
            </span>
          </div>
          <Badge variant="outline" className="text-xs">
            {data.results.length}{" "}
            {t("laboratory.results.analyses")}
          </Badge>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
        {/* Sample-level header */}
        <div className="text-center border-b pb-4">
          <h1 className="text-2xl font-bold">{data.tenant_display_name}</h1>
          <p className="text-sm text-muted-foreground">
            {t("laboratory.sharedResult.labResultsReport")}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 bg-muted/50 rounded-lg p-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {t("laboratory.sharedResult.horse")}
            </p>
            <p className="font-semibold">{data.horse_display_name}</p>
          </div>
          {data.client_display_name && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {t("laboratory.sharedResult.client")}
              </p>
              <p className="font-medium">{data.client_display_name}</p>
            </div>
          )}
          {data.sample.collection_date && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {t("laboratory.preview.collectionDate")}
              </p>
              <p>{formatStandardDate(data.sample.collection_date)}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {t("laboratory.sharedResult.reportDate")}
            </p>
            <p>{formatStandardDate(data.share.created_at)}</p>
          </div>
        </div>

        {/* Stacked analyses */}
        {data.results.map((r, idx) => (
          <div key={r.result_id} className="space-y-3">
            {idx > 0 && <Separator />}
            <LabResultReportViewer
              templateName={r.template_name}
              templateNameAr={r.template_name_ar}
              horseName={data.horse_display_name}
              labName={data.tenant_display_name}
              physicalSampleId={data.sample.physical_sample_id}
              sampleId={data.sample.id}
              resultDate={r.created_at}
              collectionDate={data.sample.collection_date}
              status={r.status}
              flags={r.flags}
              interpretation={r.interpretation}
              resultData={r.result_data || {}}
              templateFields={r.template_fields}
              templateGroups={r.template_groups}
              templateNormalRanges={r.template_normal_ranges}
              variant="modern"
              forceLocale={reportLocale}
            />
          </div>
        ))}
      </main>
    </div>
  );
}
