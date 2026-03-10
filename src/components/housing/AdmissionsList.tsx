import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useBoardingAdmissions, type AdmissionStatus, type BoardingAdmission } from "@/hooks/housing/useBoardingAdmissions";
import { useI18n } from "@/i18n";
import { Plus, Search, AlertTriangle, CheckCircle2, Clock, LogOut, Heart } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { AdmissionWizard } from "./AdmissionWizard";
import { AdmissionDetailSheet } from "./AdmissionDetailSheet";

function getStatusBadge(status: AdmissionStatus) {
  switch (status) {
    case 'active':
      return <Badge className="bg-success/10 text-success border-success/20"><CheckCircle2 className="h-3 w-3 me-1" />Active</Badge>;
    case 'checkout_pending':
      return <Badge variant="outline" className="text-amber-600 border-amber-300"><Clock className="h-3 w-3 me-1" />Pending Checkout</Badge>;
    case 'checked_out':
      return <Badge variant="secondary"><LogOut className="h-3 w-3 me-1" />Checked Out</Badge>;
    case 'cancelled':
      return <Badge variant="destructive">Cancelled</Badge>;
    case 'draft':
      return <Badge variant="outline">Draft</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getChecksWarningCount(checks: Record<string, any>): number {
  return Object.values(checks).filter((c: any) => c?.status === 'warning').length;
}

export function AdmissionsList() {
  const { t, dir } = useI18n();
  const [statusFilter, setStatusFilter] = useState<AdmissionStatus | 'all'>('active');
  const [search, setSearch] = useState('');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedAdmissionId, setSelectedAdmissionId] = useState<string | null>(null);

  const { admissions, isLoading } = useBoardingAdmissions({
    status: statusFilter,
    search: search || undefined,
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Boarding Admissions</h2>
        <Button onClick={() => setWizardOpen(true)} size="sm">
          <Plus className="h-4 w-4 me-1" />
          New Admission
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by horse or client..."
            className="ps-9"
          />
        </div>
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="checkout_pending">Pending</TabsTrigger>
            <TabsTrigger value="checked_out">Checked Out</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : admissions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No admissions found</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setWizardOpen(true)}>
              <Plus className="h-4 w-4 me-1" />
              Create First Admission
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {admissions.map((admission) => {
            const warningCount = getChecksWarningCount(admission.admission_checks || {});
            return (
              <Card
                key={admission.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedAdmissionId(admission.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={admission.horse?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {admission.horse?.name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">
                          {admission.horse?.name || 'Unknown Horse'}
                        </span>
                        {getStatusBadge(admission.status)}
                        {warningCount > 0 && (
                          <Badge variant="outline" className="text-amber-600 border-amber-300 gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {warningCount}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                        {admission.client?.name && (
                          <span>Client: {admission.client.name}</span>
                        )}
                        <span>Since {format(new Date(admission.admitted_at), 'MMM d, yyyy')}</span>
                        {admission.unit && (
                          <Badge variant="secondary" className="text-xs">
                            {admission.unit.code}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {admission.monthly_rate && (
                      <div className="text-end shrink-0">
                        <span className="text-sm font-medium">
                          {admission.monthly_rate} {admission.rate_currency}
                        </span>
                        <span className="text-xs text-muted-foreground block">/month</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Wizard */}
      <AdmissionWizard open={wizardOpen} onOpenChange={setWizardOpen} />

      {/* Detail Sheet */}
      <AdmissionDetailSheet
        admissionId={selectedAdmissionId}
        open={!!selectedAdmissionId}
        onOpenChange={(open) => { if (!open) setSelectedAdmissionId(null); }}
      />
    </div>
  );
}
