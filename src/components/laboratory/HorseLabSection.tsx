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
  FlaskConical, 
  ChevronRight, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  Calendar,
  ArrowRight
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

interface LabResult {
  id: string;
  status: string;
  flags: string | null;
  created_at: string;
  template: { name: string } | null;
  sample: { physical_sample_id: string | null } | null;
}

interface HorseLabSectionProps {
  horseId: string;
  horseName: string;
}

export function HorseLabSection({ horseId, horseName }: HorseLabSectionProps) {
  const navigate = useNavigate();
  const { activeTenant } = useTenant();
  const [results, setResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeTenant?.tenant.id && horseId) {
      fetchResults();
    }
  }, [activeTenant?.tenant.id, horseId]);

  const fetchResults = async () => {
    setLoading(true);
    try {
      // First get sample IDs for this horse
      const { data: samples, error: samplesError } = await supabase
        .from("lab_samples")
        .select("id")
        .eq("tenant_id", activeTenant!.tenant.id)
        .eq("horse_id", horseId);

      if (samplesError) throw samplesError;

      if (!samples || samples.length === 0) {
        setResults([]);
        return;
      }

      const sampleIds = samples.map(s => s.id);

      // Then get results for those samples
      const { data, error } = await supabase
        .from("lab_results")
        .select(`
          id,
          status,
          flags,
          created_at,
          template:lab_templates(name),
          sample:lab_samples(physical_sample_id)
        `)
        .eq("tenant_id", activeTenant!.tenant.id)
        .in("sample_id", sampleIds)
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
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Final</Badge>;
      case 'reviewed':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Reviewed</Badge>;
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  const handleViewAll = () => {
    navigate("/dashboard/laboratory");
  };

  // Desktop view
  const DesktopView = () => (
    <Card className="hidden md:block">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-primary" />
          Laboratory Results
        </CardTitle>
        <Button variant="outline" size="sm" onClick={handleViewAll}>
          View All
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
            <p>No laboratory results yet</p>
            <Button 
              variant="link" 
              className="mt-2"
              onClick={handleViewAll}
            >
              Create a sample <ArrowRight className="h-4 w-4 ms-1 rtl:rotate-180" />
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((result) => (
              <div 
                key={result.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {getFlagIcon(result.flags)}
                  <div>
                    <p className="font-medium">{result.template?.name || 'Unknown Test'}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(result.created_at), "MMM d, yyyy")}
                      {result.sample?.physical_sample_id && (
                        <span className="font-mono">#{result.sample.physical_sample_id}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {result.flags && (
                    <Badge className={getFlagColor(result.flags)} variant="secondary">
                      {result.flags}
                    </Badge>
                  )}
                  {getStatusBadge(result.status)}
                </div>
              </div>
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
            <span className="font-medium">Laboratory Results</span>
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
              <p className="text-sm">No laboratory results yet</p>
              <Button 
                variant="link" 
                size="sm"
                className="mt-1"
                onClick={handleViewAll}
              >
                Create a sample
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((result) => (
                <div 
                  key={result.id}
                  className="p-3 border rounded-lg bg-muted/30"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getFlagIcon(result.flags)}
                      <span className="font-medium text-sm">
                        {result.template?.name || 'Unknown Test'}
                      </span>
                    </div>
                    {getStatusBadge(result.status)}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(result.created_at), "MMM d, yyyy")}
                    </div>
                    {result.flags && (
                      <Badge className={getFlagColor(result.flags)} variant="secondary">
                        {result.flags}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-2"
                onClick={handleViewAll}
              >
                View All Results
                <ChevronRight className="h-4 w-4 ms-1 rtl:rotate-180" />
              </Button>
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );

  return (
    <>
      <DesktopView />
      <MobileView />
    </>
  );
}
