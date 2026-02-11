import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TenantSwitcher } from "@/components/TenantSwitcher";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { PaymentIntentCard } from "@/components/payments/PaymentIntentCard";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { useTenant } from "@/contexts/TenantContext";
import { useTenantPaymentIntents, getReferenceTypeLabel } from "@/hooks/usePayments";
import { useState } from "react";
import {
  Menu,
  TrendingUp,
  Clock,
  ChevronLeft,
  DollarSign,
  BarChart3,
} from "lucide-react";
import { MobilePageHeader } from "@/components/navigation";
import { useI18n } from "@/i18n";

const DashboardRevenue = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { activeTenant, activeRole } = useTenant();
  const { data: paymentIntents, isLoading } = useTenantPaymentIntents();
  const { t } = useI18n();

  // Redirect if not owner/manager
  const canViewRevenue = activeRole === 'owner' || activeRole === 'manager';
  if (!activeTenant || !canViewRevenue) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <Card variant="elevated" className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <TrendingUp className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="font-display text-xl font-semibold text-navy mb-2">
              Access Restricted
            </h2>
            <p className="text-muted-foreground mb-4">
              You need to be an owner or manager of an organization to view revenue.
            </p>
            <Button onClick={() => navigate("/dashboard")}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Group payments by reference type
  const groupedPayments = paymentIntents?.reduce((acc, intent) => {
    const key = intent.reference_type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(intent);
    return acc;
  }, {} as Record<string, typeof paymentIntents>) || {};

  // Stats
  const totalPayments = paymentIntents?.length || 0;
  const paidPayments = paymentIntents?.filter(p => p.status === 'paid').length || 0;
  const pendingPayments = paymentIntents?.filter(p => p.status === 'pending' || p.status === 'draft').length || 0;

  return (
    <div className="min-h-screen w-full bg-cream flex overflow-x-hidden">
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <main className="flex-1 min-h-screen min-w-0">
        {/* Mobile Header */}
        <MobilePageHeader title={t("nav.revenue")} backTo="/dashboard" />

        <header className="sticky top-0 z-30 bg-cream/80 backdrop-blur-xl border-b border-border/50 hidden lg:block">
          <div className="flex items-center justify-between h-16 px-4 lg:px-8">
            <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
              <TenantSwitcher />
              <div className="hidden md:block">
                <RoleSwitcher />
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-3">
              <NotificationsPanel />
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-8">
          {/* Back Button & Title */}
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-navy">
                Revenue
              </h1>
              <p className="text-sm text-muted-foreground">
                Track payments and earnings for {activeTenant?.tenant.name}
              </p>
            </div>
          </div>

          {/* Coming Soon Banner */}
          <Card variant="elevated" className="mb-8 border-gold/30 bg-gradient-to-r from-gold/5 to-transparent">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-6 h-6 text-gold" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-lg font-semibold text-navy mb-1">
                    Revenue Dashboard Preview
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Payment processing is coming soon. This is a preview of your future revenue dashboard.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8">
            <StatCard
              icon={DollarSign}
              label="Total Transactions"
              value={totalPayments.toString()}
            />
            <StatCard
              icon={TrendingUp}
              label="Completed"
              value={paidPayments.toString()}
              variant="success"
            />
            <StatCard
              icon={Clock}
              label="Pending"
              value={pendingPayments.toString()}
              variant="warning"
            />
          </div>

          {/* Grouped Payment List */}
          {isLoading ? (
            <div className="py-12 text-center">
              <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading revenue data...</p>
            </div>
          ) : !paymentIntents || paymentIntents.length === 0 ? (
            <Card variant="elevated">
              <CardContent className="py-12 text-center">
                <TrendingUp className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-semibold text-navy mb-2">No Revenue Yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  When customers book your services, their payments will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedPayments).map(([type, intents]) => (
                <Card key={type} variant="elevated">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-navy text-lg flex items-center gap-2">
                      {getReferenceTypeLabel(type as any)}
                      <span className="text-sm font-normal text-muted-foreground">
                        ({intents?.length || 0})
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {intents?.map((intent) => (
                        <PaymentIntentCard key={intent.id} intent={intent} />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

// StatCard Component
const StatCard = ({
  icon: Icon,
  label,
  value,
  variant = "default",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  variant?: "default" | "success" | "warning";
}) => {
  const variants = {
    default: "bg-gold/10 text-gold",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
  };

  return (
    <Card variant="elevated">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${variants[variant]}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl sm:text-3xl font-bold text-navy">{value}</p>
            <p className="text-sm text-muted-foreground truncate">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardRevenue;
