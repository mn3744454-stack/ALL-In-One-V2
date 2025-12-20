import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Logo from "@/components/Logo";
import { TenantSwitcher } from "@/components/TenantSwitcher";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { InvitationsPanel } from "@/components/InvitationsPanel";
import { AddHorseDialog } from "@/components/AddHorseDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { useHorses } from "@/hooks/useHorses";
import {
  Building2,
  Home,
  Calendar,
  FileText,
  Users,
  Settings,
  Search,
  TrendingUp,
  Heart,
  Activity,
  ChevronRight,
  Menu,
  LogOut
} from "lucide-react";

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();
  const { activeTenant, activeRole, tenants, loading: tenantsLoading } = useTenant();
  const { horses, loading: horsesLoading } = useHorses();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  // Check if user has no tenants - show welcome section in dashboard instead
  const hasNoTenants = !tenantsLoading && tenants.length === 0;

  return (
    <div className="min-h-screen bg-cream flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-navy transform transition-transform duration-300 lg:translate-x-0 lg:static ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-navy-light">
            <Logo variant="light" />
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            <NavItem icon={Home} label="Dashboard" active />
            <NavItem icon={Heart} label="My Horses" badge={horses.length} />
            <NavItem icon={Calendar} label="Schedule" />
            <NavItem icon={FileText} label="Records" />
            <NavItem icon={Users} label="Team" />
            <NavItem icon={Building2} label="Facilities" />
            
            <div className="pt-4 mt-4 border-t border-navy-light">
              <NavItem icon={Settings} label="Settings" />
            </div>
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-navy-light">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gold flex items-center justify-center text-navy font-bold">
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
      <main className="flex-1 min-h-screen">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-cream/80 backdrop-blur-xl border-b border-border/50">
          <div className="flex items-center justify-between h-16 px-4 lg:px-8">
            <div className="flex items-center gap-4">
              <button
                className="p-2 rounded-xl hover:bg-muted lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </button>
              
              {/* Tenant Switcher */}
              <TenantSwitcher />
              
              <div className="hidden md:block">
                <RoleSwitcher />
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search horses, records..."
                  className="w-64 h-10 pl-10 pr-4 rounded-xl bg-muted border-0 text-sm focus:ring-2 focus:ring-gold/30"
                />
              </div>
              
              {/* Invitations */}
              <InvitationsPanel />

              {/* Add Horse */}
              <AddHorseDialog />
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-4 lg:p-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="font-display text-2xl md:text-3xl font-bold text-navy mb-2">
              Welcome{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}!
            </h1>
            <p className="text-muted-foreground">
              {activeTenant
                ? `Here's what's happening at ${activeTenant.tenant.name} today.`
                : "Discover our services and explore what Khail has to offer."}
            </p>
          </div>

          {/* Getting Started Card - Only show when no tenants */}
          {hasNoTenants && (
            <Card variant="elevated" className="mb-8 border-gold/20 bg-gradient-to-r from-gold/5 to-transparent">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gold/10 flex items-center justify-center shrink-0">
                    <Building2 className="w-7 h-7 text-gold" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-lg font-semibold text-navy mb-1">
                      Get Started with Khail
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      Create your organization to manage horses, track health records, and collaborate with your team. Or explore our services first!
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    <Button
                      variant="gold"
                      onClick={() => navigate("/select-role")}
                      className="gap-2"
                    >
                      <Building2 className="w-4 h-4" />
                      Create Organization
                    </Button>
                    <InvitationsPanel />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={Heart}
              label="Total Horses"
              value={horses.length.toString()}
              change={horses.length > 0 ? "Active records" : "Add your first horse"}
            />
            <StatCard
              icon={Activity}
              label="Health Checkups"
              value="0"
              change="Scheduled this week"
            />
            <StatCard
              icon={Users}
              label="Team Members"
              value="1"
              change="Active"
            />
            <StatCard
              icon={TrendingUp}
              label="This Month"
              value="—"
              change="Stats coming soon"
            />
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Horses List */}
            <div className="lg:col-span-2">
              <Card variant="elevated">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-navy">Your Horses</CardTitle>
                  <Link to="#" className="text-sm text-gold hover:text-gold-dark font-medium flex items-center gap-1">
                    View All <ChevronRight className="w-4 h-4" />
                  </Link>
                </CardHeader>
                <CardContent>
                  {horsesLoading ? (
                    <div className="py-8 text-center text-muted-foreground">
                      Loading horses...
                    </div>
                  ) : horses.length === 0 ? (
                    <div className="py-8 text-center">
                      <Heart className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-muted-foreground mb-4">No horses yet</p>
                      <AddHorseDialog
                        trigger={
                          <Button variant="outline" size="sm">
                            Add Your First Horse
                          </Button>
                        }
                      />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {horses.slice(0, 5).map((horse) => (
                        <HorseItem
                          key={horse.id}
                          name={horse.name}
                          breed={horse.breed || "Unknown breed"}
                          gender={horse.gender}
                          status="Healthy"
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Upcoming Events */}
            <div>
              <Card variant="elevated">
                <CardHeader>
                  <CardTitle className="text-navy">Upcoming</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="py-8 text-center text-muted-foreground">
                    <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p>No upcoming events</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const NavItem = ({ 
  icon: Icon, 
  label, 
  active = false,
  badge
}: { 
  icon: any; 
  label: string; 
  active?: boolean;
  badge?: number;
}) => (
  <button
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
      active
        ? "bg-gold text-navy"
        : "text-cream/70 hover:text-cream hover:bg-navy-light"
    }`}
  >
    <Icon className="w-5 h-5" />
    <span className="flex-1 text-left">{label}</span>
    {badge !== undefined && badge > 0 && (
      <span className={`px-2 py-0.5 rounded-full text-xs ${active ? "bg-navy/20" : "bg-cream/10"}`}>
        {badge}
      </span>
    )}
  </button>
);

const StatCard = ({ 
  icon: Icon, 
  label, 
  value, 
  change, 
  positive,
  currency
}: { 
  icon: any; 
  label: string; 
  value: string; 
  change: string;
  positive?: boolean;
  currency?: string;
}) => (
  <Card variant="elevated">
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{label}</p>
          <p className="text-2xl font-display font-bold text-navy">
            {currency && <span className="text-base text-muted-foreground mr-1">{currency}</span>}
            {value}
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-gold" />
        </div>
      </div>
      <p className={`text-xs mt-2 ${positive ? "text-success" : "text-muted-foreground"}`}>
        {change}
      </p>
    </CardContent>
  </Card>
);

const HorseItem = ({ 
  name, 
  breed, 
  gender, 
  status,
  warning = false
}: { 
  name: string; 
  breed: string; 
  gender: string; 
  status: string;
  warning?: boolean;
}) => (
  <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer">
    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold to-gold-light flex items-center justify-center text-navy font-bold">
      {name[0]}
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-semibold text-navy">{name}</p>
      <p className="text-sm text-muted-foreground capitalize">{breed} • {gender}</p>
    </div>
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
      warning 
        ? "bg-warning/10 text-warning" 
        : "bg-success/10 text-success"
    }`}>
      {status}
    </span>
  </div>
);

export default Dashboard;
