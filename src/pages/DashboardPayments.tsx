import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Logo from "@/components/Logo";
import { TenantSwitcher } from "@/components/TenantSwitcher";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { InvitationsPanel } from "@/components/InvitationsPanel";
import { PaymentIntentCard } from "@/components/payments/PaymentIntentCard";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { useUserPaymentIntents } from "@/hooks/usePayments";
import { useState } from "react";
import {
  Home,
  Calendar,
  FileText,
  Users,
  Settings,
  Menu,
  LogOut,
  MessageSquare,
  Globe,
  X,
  Package,
  GraduationCap,
  Ticket,
  Heart,
  Building2,
  CreditCard,
  TrendingUp,
  Clock,
  ChevronLeft,
} from "lucide-react";

const DashboardPayments = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();
  const { activeTenant, activeRole } = useTenant();
  const { data: paymentIntents, isLoading } = useUserPaymentIntents();

  const needsPublicProfileSetup = activeRole === 'owner' && activeTenant && !activeTenant.tenant.slug;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  // Group payments by status
  const draftPayments = paymentIntents?.filter(p => p.status === 'draft') || [];
  const pendingPayments = paymentIntents?.filter(p => p.status === 'pending') || [];
  const paidPayments = paymentIntents?.filter(p => p.status === 'paid') || [];
  const cancelledPayments = paymentIntents?.filter(p => p.status === 'cancelled') || [];

  return (
    <div className="min-h-screen w-full bg-cream flex overflow-x-hidden">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-navy transform transition-transform duration-300 lg:translate-x-0 lg:static ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-navy-light flex items-center justify-between">
            <Logo variant="light" />
            <button
              className="p-2 rounded-xl hover:bg-navy-light lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close menu"
            >
              <X className="w-5 h-5 text-cream" />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <NavItem icon={Home} label="Dashboard" href="/dashboard" onNavigate={() => setSidebarOpen(false)} />
            <NavItem icon={MessageSquare} label="Community" href="/community" onNavigate={() => setSidebarOpen(false)} />
            <NavItem icon={Ticket} label="My Bookings" href="/dashboard/my-bookings" onNavigate={() => setSidebarOpen(false)} />
            <NavItem icon={CreditCard} label="Payments" active onNavigate={() => setSidebarOpen(false)} />
            <NavItem icon={Heart} label="My Horses" onNavigate={() => setSidebarOpen(false)} />
            <NavItem icon={Calendar} label="Schedule" onNavigate={() => setSidebarOpen(false)} />
            <NavItem icon={FileText} label="Records" onNavigate={() => setSidebarOpen(false)} />
            <NavItem icon={Users} label="Team" onNavigate={() => setSidebarOpen(false)} />
            <NavItem icon={Building2} label="Facilities" onNavigate={() => setSidebarOpen(false)} />
            
            {(activeRole === 'owner' || activeRole === 'manager') && activeTenant && (
              <>
                <NavItem icon={Package} label="Services" href="/dashboard/services" onNavigate={() => setSidebarOpen(false)} />
                <NavItem icon={TrendingUp} label="Revenue" href="/dashboard/revenue" onNavigate={() => setSidebarOpen(false)} />
              </>
            )}
            
            {(activeRole === 'owner' || activeRole === 'manager') && activeTenant?.tenant.type === 'academy' && (
              <>
                <NavItem icon={GraduationCap} label="Sessions" href="/dashboard/academy/sessions" onNavigate={() => setSidebarOpen(false)} />
                <NavItem icon={Ticket} label="Manage Bookings" href="/dashboard/academy/bookings" onNavigate={() => setSidebarOpen(false)} />
              </>
            )}
            
            {activeRole === 'owner' && activeTenant && (
              <NavItem 
                icon={Globe} 
                label="Public Profile" 
                href="/dashboard/public-profile" 
                onNavigate={() => setSidebarOpen(false)}
                highlight={needsPublicProfileSetup}
              />
            )}
            
            <div className="pt-4 mt-4 border-t border-navy-light">
              <NavItem icon={Settings} label="Settings" onNavigate={() => setSidebarOpen(false)} />
            </div>
          </nav>

          <div className="p-4 border-t border-navy-light">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gold flex items-center justify-center text-navy font-bold shrink-0">
                {profile?.full_name?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-cream truncate">
                  {activeTenant?.tenant.name || "No Organization"}
                </p>
                <p className="text-xs text-cream/60 capitalize">{activeRole || "Member"}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-cream/70 hover:text-cream hover:bg-navy-light"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-navy/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 min-h-screen min-w-0">
        <header className="sticky top-0 z-30 bg-cream/80 backdrop-blur-xl border-b border-border/50">
          <div className="flex items-center justify-between h-16 px-4 lg:px-8">
            <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
              <button
                className="p-2 rounded-xl hover:bg-muted lg:hidden shrink-0"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <TenantSwitcher />
              <div className="hidden md:block">
                <RoleSwitcher />
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-3">
              <InvitationsPanel />
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

// NavItem Component
const NavItem = ({
  icon: Icon,
  label,
  badge,
  active,
  href,
  highlight,
  onNavigate,
}: {
  icon: React.ElementType;
  label: string;
  badge?: number;
  active?: boolean;
  href?: string;
  highlight?: boolean;
  onNavigate?: () => void;
}) => {
  const content = (
    <>
      <Icon className="w-5 h-5" />
      <span className="flex-1">{label}</span>
      {badge !== undefined && (
        <span className="px-2 py-0.5 text-xs rounded-full bg-gold/20 text-gold">
          {badge}
        </span>
      )}
      {highlight && (
        <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
      )}
    </>
  );

  const className = `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
    active
      ? "bg-gold text-navy font-medium"
      : "text-cream/70 hover:text-cream hover:bg-navy-light"
  }`;

  if (href) {
    return (
      <Link to={href} className={className} onClick={onNavigate}>
        {content}
      </Link>
    );
  }

  return (
    <button className={className} onClick={onNavigate}>
      {content}
    </button>
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
