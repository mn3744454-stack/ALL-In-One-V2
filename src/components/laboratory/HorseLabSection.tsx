import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  FlaskConical, 
  ChevronRight, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  Calendar,
  ArrowRight,
  Eye,
  Clock,
  Send,
  Loader2,
  FileText,
  Tag,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

interface LabResult {
  id: string;
  status: string;
  flags: string | null;
  created_at: string;
  result_data: Record<string, unknown> | null;
  template_id: string | null;
  template: { id: string; name: string; fields: unknown[] } | null;
  sample: { physical_sample_id: string | null; tenant_id: string } | null;
  source_tenant: { id: string; name: string } | null;
}

interface HorseLabRequest {
  id: string;
  status: string;
  priority: string;
  test_description: string;
  external_lab_name: string | null;
  requested_at: string;
  lab_request_services?: {
    service_id: string;
    service: { name: string; name_ar: string | null; code: string | null } | null;
  }[];
}

interface HorseLabSectionProps {
  horseId: string;
  horseName: string;
}

export function HorseLabSection({ horseId, horseName }: HorseLabSectionProps) {
  const navigate = useNavigate();
  const { t, dir } = useI18n();
  const { activeTenant } = useTenant();
  const [results, setResults] = useState<LabResult[]>([]);
  const [labRequests, setLabRequests] = useState<HorseLabRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState<LabResult | null>(null);

  useEffect(() => {
    if (activeTenant?.tenant.id && horseId) {
      fetchResults();
      fetchLabRequests();
    }
  }, [activeTenant?.tenant.id, horseId]);

  const fetchLabRequests = async () => {
    setRequestsLoading(true);
    try {
      const { data, error } = await supabase
        .from("lab_requests")
        .select(`
          id, status, priority, test_description, external_lab_name, requested_at,
          lab_request_services(
            service_id,
            service:lab_services(name, name_ar, code)
          )
        `)
        .eq("horse_id", horseId)
        .eq("tenant_id", activeTenant!.tenant.id)
        .order("requested_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setLabRequests((data || []) as HorseLabRequest[]);
    } catch (error) {
      console.error("Error fetching horse lab requests:", error);
    } finally {
      setRequestsLoading(false);
    }
  };

  const fetchResults = async () => {
    setLoading(true);
    try {
      // Get sample IDs for this horse within the active tenant (MVP-scoped)
      const { data: samples, error: samplesError } = await supabase
        .from("lab_samples")
        .select("id")
        .eq("horse_id", horseId)
        .eq("tenant_id", activeTenant!.tenant.id);

      if (samplesError) throw samplesError;

      if (!samples || samples.length === 0) {
        setResults([]);
        return;
      }

      const sampleIds = samples.map(s => s.id);

      // Get results for those samples with full template data and source tenant
      const { data, error } = await supabase
        .from("lab_results")
        .select(`
          id,
          status,
          flags,
          created_at,
          result_data,
          template_id,
          template:lab_templates(id, name, fields),
          sample:lab_samples(physical_sample_id, tenant_id),
          source_tenant:tenants!lab_results_tenant_id_fkey(id, name)
        `)
        .in("sample_id", sampleIds)
        .eq("tenant_id", activeTenant!.tenant.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setResults((data || []) as LabResult[]);
    } catch (error) {
      console.error("Error fetching horse lab results:", error);
    } finally {
      setLoading(false);
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

  const getFlagColor = (flag: string | null) => {
    switch (flag) {
      case 'normal': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'abnormal': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'final':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">{t('laboratory.results.status.final')}</Badge>;
      case 'reviewed':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">{t('laboratory.results.status.reviewed')}</Badge>;
      default:
        return <Badge variant="secondary">{t('laboratory.results.status.draft')}</Badge>;
    }
  };

  const handleViewAll = () => {
    // Navigate with horse filter
    navigate(`/dashboard/laboratory?tab=results&horse=${horseId}`);
  };

  const handleResultClick = (result: LabResult) => {
    setSelectedResult(result);
  };

  // Result Preview Dialog
  const ResultPreviewDialog = () => {
    if (!selectedResult) return null;

    const templateFields = (selectedResult.template?.fields || []) as Array<{
      key: string;
      label: string;
      type: string;
      unit?: string;
      reference_range?: { min?: number; max?: number };
    }>;

    const resultData = (selectedResult.result_data || {}) as Record<string, unknown>;

    return (
      <Dialog open={!!selectedResult} onOpenChange={() => setSelectedResult(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getFlagIcon(selectedResult.flags)}
              {selectedResult.template?.name || t('laboratory.results.unknownTest')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Meta info */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {format(new Date(selectedResult.created_at), "PPP")}
              </div>
              {getStatusBadge(selectedResult.status)}
            </div>

            {/* Result fields */}
            {templateFields.length > 0 ? (
              <div className="space-y-3">
                {templateFields.map((field) => {
                  const value = resultData[field.key];
                  const numValue = typeof value === 'number' ? value : null;
                  const refRange = field.reference_range;
                  
                  let valueColor = '';
                  if (numValue !== null && refRange) {
                    if (refRange.min !== undefined && numValue < refRange.min) {
                      valueColor = 'text-orange-600';
                    } else if (refRange.max !== undefined && numValue > refRange.max) {
                      valueColor = 'text-red-600';
                    } else {
                      valueColor = 'text-green-600';
                    }
                  }

                  return (
                    <div key={field.key} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{field.label}</p>
                        {refRange && (
                          <p className="text-xs text-muted-foreground">
                            {t('laboratory.results.refRange')}: {refRange.min ?? '-'} - {refRange.max ?? '-'} {field.unit || ''}
                          </p>
                        )}
                      </div>
                      <div className={`font-mono text-lg ${valueColor}`}>
                        {value !== undefined && value !== null ? String(value) : '-'} 
                        {field.unit && <span className="text-xs text-muted-foreground ms-1">{field.unit}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                {t('laboratory.results.noFields')}
              </p>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setSelectedResult(null)}>
                {t('common.close')}
              </Button>
              <Button onClick={() => navigate(`/dashboard/laboratory?tab=results&resultId=${selectedResult.id}`)}>
                {t('laboratory.results.viewDetails')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // Result row component (clickable)
  const ResultRow = ({ result, compact = false }: { result: LabResult; compact?: boolean }) => {
    const sourceName = result.source_tenant?.name || t('common.unknownOrganization');
    
    return (
      <div 
        key={result.id}
        className={`flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer ${compact ? 'bg-muted/30' : ''}`}
        onClick={() => handleResultClick(result)}
      >
        <div className="flex items-center gap-3 min-w-0">
          {getFlagIcon(result.flags)}
          <div className="min-w-0">
            <p className={`font-medium truncate ${compact ? 'text-sm' : ''}`}>
              {result.template?.name || t('laboratory.results.unknownTest')}
            </p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3 shrink-0" />
                {format(new Date(result.created_at), "MMM d, yyyy")}
              </span>
              <span className="text-primary/80 truncate">
                {t('common.source')}: {sourceName}
              </span>
              {result.sample?.physical_sample_id && !compact && (
                <span className="font-mono">#{result.sample.physical_sample_id}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {result.flags && (
            <Badge className={getFlagColor(result.flags)} variant="secondary">
              {result.flags}
            </Badge>
          )}
          {!compact && getStatusBadge(result.status)}
          <Eye className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    );
  };

  // Desktop view
  const DesktopView = () => (
    <Card className="hidden md:block">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-primary" />
          {t('laboratory.results.title')}
        </CardTitle>
        <Button variant="outline" size="sm" onClick={handleViewAll}>
          {t('common.viewAll')}
          <ChevronRight className="h-4 w-4 ms-1 rtl:rotate-180" />
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FlaskConical className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>{t('laboratory.results.noResults')}</p>
            <Button 
              variant="link" 
              className="mt-2"
              onClick={handleViewAll}
            >
              {t('laboratory.samples.create')} <ArrowRight className="h-4 w-4 ms-1 rtl:rotate-180" />
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((result) => (
              <ResultRow key={result.id} result={result} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Mobile view - Collapsible Accordion
  const MobileView = () => (
    <Accordion type="single" collapsible className="md:hidden">
      <AccordionItem value="lab-results" className="border rounded-lg">
        <AccordionTrigger className="px-4 hover:no-underline">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-primary" />
            <span className="font-medium">{t('laboratory.results.title')}</span>
            {results.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {results.length}
              </Badge>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <p className="text-sm">{t('laboratory.results.noResults')}</p>
              <Button 
                variant="link" 
                size="sm"
                className="mt-1"
                onClick={handleViewAll}
              >
                {t('laboratory.samples.create')}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((result) => (
                <ResultRow key={result.id} result={result} compact />
              ))}
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-2"
                onClick={handleViewAll}
              >
                {t('common.viewAll')}
                <ChevronRight className="h-4 w-4 ms-1 rtl:rotate-180" />
              </Button>
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );

  const requestStatusConfig: Record<string, { icon: React.ElementType; color: string }> = {
    pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    sent: { icon: Send, color: 'bg-blue-100 text-blue-800 border-blue-200' },
    processing: { icon: Loader2, color: 'bg-purple-100 text-purple-800 border-purple-200' },
    ready: { icon: CheckCircle2, color: 'bg-green-100 text-green-800 border-green-200' },
    received: { icon: FileText, color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    cancelled: { icon: Clock, color: 'bg-muted text-muted-foreground border-border' },
  };

  const LabRequestsSection = () => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          {t('horses.labRequests.title') || 'Lab Requests'}
        </CardTitle>
        <Button variant="outline" size="sm" onClick={() => navigate(`/dashboard/laboratory?tab=requests`)}>
          {t('common.viewAll')}
          <ChevronRight className="h-4 w-4 ms-1 rtl:rotate-180" />
        </Button>
      </CardHeader>
      <CardContent>
        {requestsLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : labRequests.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm">{t('horses.labRequests.noRequests') || 'No lab requests for this horse'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {labRequests.map(req => {
              const config = requestStatusConfig[req.status] || requestStatusConfig.pending;
              const StatusIcon = config.icon;
              const services = req.lab_request_services || [];
              return (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/dashboard/laboratory?tab=requests`)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <StatusIcon className={cn("h-4 w-4 shrink-0", req.status === 'processing' && "animate-spin")} />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{req.test_description}</p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 shrink-0" />
                          {format(new Date(req.requested_at), "MMM d, yyyy")}
                        </span>
                        {req.external_lab_name && (
                          <span className="flex items-center gap-1">
                            <ExternalLink className="h-3 w-3 shrink-0" />
                            {req.external_lab_name}
                          </span>
                        )}
                      </div>
                      {services.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {services.slice(0, 3).map(s => (
                            <Badge key={s.service_id} variant="secondary" className="text-[10px] gap-0.5 px-1.5 py-0">
                              <Tag className="h-2.5 w-2.5" />
                              {dir === 'rtl' && s.service?.name_ar ? s.service.name_ar : s.service?.name || ''}
                            </Badge>
                          ))}
                          {services.length > 3 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              +{services.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className={cn("gap-1 shrink-0", config.color)}>
                    <StatusIcon className={cn("h-3 w-3", req.status === 'processing' && "animate-spin")} />
                    {t(`laboratory.requests.status.${req.status}`) || req.status}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <LabRequestsSection />
      <DesktopView />
      <MobileView />
      <ResultPreviewDialog />
    </div>
  );
}
