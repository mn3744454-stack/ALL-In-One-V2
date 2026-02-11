import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TenantSwitcher } from "@/components/TenantSwitcher";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { PaymentIntentCard } from "@/components/payments/PaymentIntentCard";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { useTenant } from "@/contexts/TenantContext";
import { useUserPaymentIntents } from "@/hooks/usePayments";
import { useState } from "react";
import {
  Menu,
  CreditCard,
  TrendingUp,
  Clock,
  ChevronLeft,
  X,
} from "lucide-react";
import { MobilePageHeader } from "@/components/navigation";
import { useI18n } from "@/i18n";

const DashboardPayments = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { activeTenant } = useTenant();
  const { data: paymentIntents, isLoading } = useUserPaymentIntents();
  const { t } = useI18n();

  // Group payments by status
  const draftPayments = paymentIntents?.filter(p => p.status === 'draft') || [];
  const pendingPayments = paymentIntents?.filter(p => p.status === 'pending') || [];
  const paidPayments = paymentIntents?.filter(p => p.status === 'paid') || [];
  const cancelledPayments = paymentIntents?.filter(p => p.status === 'cancelled') || [];

  return (
    <div className="min-h-screen w-full bg-cream flex overflow-x-hidden">
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <main className="flex-1 min-h-screen min-w-0">
        {/* Mobile Header */}
        <MobilePageHeader title={t("nav.payments")} backTo="/dashboard" />

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
                Payments
              </h1>
              <p className="text-sm text-muted-foreground">
                View your payment history and pending transactions
              </p>
            </div>
          </div>

          {/* Coming Soon Banner */}
          <Card variant="elevated" className="mb-8 border-gold/30 bg-gradient-to-r from-gold/5 to-transparent">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center shrink-0">
                  <Clock className="w-6 h-6 text-gold" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-lg font-semibold text-navy mb-1">
                    Online Payments Coming Soon
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    We're working on secure payment options. For now, you can view your payment history and pending transactions here.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
            <StatCard
              icon={CreditCard}
              label="Total"
              value={paymentIntents?.length.toString() || "0"}
            />
            <StatCard
              icon={Clock}
              label="Pending"
              value={(draftPayments.length + pendingPayments.length).toString()}
              variant="warning"
            />
            <StatCard
              icon={TrendingUp}
              label="Paid"
              value={paidPayments.length.toString()}
              variant="success"
            />
            <StatCard
              icon={X}
              label="Cancelled"
              value={cancelledPayments.length.toString()}
              variant="muted"
            />
          </div>

          {/* Payment List */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="text-navy">Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-12 text-center">
                  <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading payments...</p>
                </div>
              ) : !paymentIntents || paymentIntents.length === 0 ? (
                <div className="py-12 text-center">
                  <CreditCard className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="font-semibold text-navy mb-2">No Payments Yet</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    When you book services or make purchases, your payment history will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {paymentIntents.map((intent) => (
                    <PaymentIntentCard key={intent.id} intent={intent} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
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
  variant?: "default" | "success" | "warning" | "muted";
}) => {
  const variants = {
    default: "bg-gold/10 text-gold",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    muted: "bg-muted text-muted-foreground",
  };

  return (
    <Card variant="elevated">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${variants[variant]}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold text-navy">{value}</p>
            <p className="text-xs text-muted-foreground truncate">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardPayments;
