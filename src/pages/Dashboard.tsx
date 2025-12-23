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
  LogOut,
  MessageSquare,
  Globe,
  X,
  Package,
  GraduationCap,
  Ticket,
  ExternalLink,
  AlertCircle,
  CreditCard,
} from "lucide-react";

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();
  const { activeTenant, activeRole, tenants, loading: tenantsLoading } = useTenant();
  const { horses, loading: horsesLoading } = useHorses();

  // Check if public profile needs setup (owner with no slug)
  const needsPublicProfileSetup = activeRole === 'owner' && activeTenant && !activeTenant.tenant.slug;
  const hasPublicProfile = activeTenant?.tenant.slug && activeTenant?.tenant.is_public;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  // Check if user has no tenants - show welcome section in dashboard instead
  const hasNoTenants = !tenantsLoading && tenants.length === 0;

  return (
    <div className="min-h-screen w-full bg-cream flex overflow-x-hidden">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-navy transform transition-transform duration-300 lg:translate-x-0 lg:static ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo + Close Button for Mobile */}
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

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <NavItem icon={Home} label="Dashboard" active onNavigate={() => setSidebarOpen(false)} />
            <NavItem icon={MessageSquare} label="Community" href="/community" onNavigate={() => setSidebarOpen(false)} />
            <NavItem icon={Ticket} label="My Bookings" href="/dashboard/my-bookings" onNavigate={() => setSidebarOpen(false)} />
            <NavItem icon={CreditCard} label="Payments" href="/dashboard/payments" onNavigate={() => setSidebarOpen(false)} />
            <NavItem icon={Heart} label="My Horses" badge={horses.length} onNavigate={() => setSidebarOpen(false)} />
            <NavItem icon={Calendar} label="Schedule" onNavigate={() => setSidebarOpen(false)} />
            <NavItem icon={FileText} label="Records" onNavigate={() => setSidebarOpen(false)} />
            <NavItem icon={Users} label="Team" onNavigate={() => setSidebarOpen(false)} />
            <NavItem icon={Building2} label="Facilities" onNavigate={() => setSidebarOpen(false)} />
            
            {/* Services & Revenue - for owners and managers */}
            {['owner', 'manager'].includes(activeRole || '') && activeTenant && (
              <>
                <NavItem icon={Package} label="Services" href="/dashboard/services" onNavigate={() => setSidebarOpen(false)} />
                <NavItem icon={TrendingUp} label="Revenue" href="/dashboard/revenue" onNavigate={() => setSidebarOpen(false)} />
              </>
            )}
            
            {/* Academy sessions & bookings - for academy owners/managers */}
            {['owner', 'manager'].includes(activeRole || '') && activeTenant?.tenant.type === 'academy' && (
              <>
                <NavItem icon={GraduationCap} label="Sessions" href="/dashboard/academy/sessions" onNavigate={() => setSidebarOpen(false)} />
                <NavItem icon={Ticket} label="Manage Bookings" href="/dashboard/academy/bookings" onNavigate={() => setSidebarOpen(false)} />
              </>
            )}
            
            {/* Public Profile - only for owners */}
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

          {/* User Section */}
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
        {/* Top Bar */}
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
              
              {/* Tenant Switcher - shows org name instead of logo on mobile */}
              <TenantSwitcher />
              
              <div className="hidden md:block">
                <RoleSwitcher />
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-3">
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

              {/* Add Horse - Only show if user has a tenant */}
              {activeTenant && <AddHorseDialog />}
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

          {/* Public Profile Setup Reminder - for owners who haven't set up their public profile */}
          {needsPublicProfileSetup && (
            <Card variant="elevated" className="mb-8 border-orange-500/30 bg-gradient-to-r from-orange-500/5 to-transparent">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-7 h-7 text-orange-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-lg font-semibold text-navy mb-1">
                      Complete Your Public Profile
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      Set up your public profile to appear in the directory and let customers find and book your services.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/dashboard/public-profile")}
                    className="gap-2 border-orange-500/50 text-orange-600 hover:bg-orange-500/10"
                  >
                    <Globe className="w-4 h-4" />
                    Set Up Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* View Public Profile Button - for owners with completed public profile */}
          {hasPublicProfile && (
            <Card variant="elevated" className="mb-8 border-success/30 bg-gradient-to-r from-success/5 to-transparent">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-success/10 flex items-center justify-center shrink-0">
                    <Globe className="w-7 h-7 text-success" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-lg font-semibold text-navy mb-1">
                      Your Public Profile is Live!
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      Customers can now find you in the directory and book your services.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    <Button
                      variant="outline"
                      onClick={() => navigate("/dashboard/public-profile")}
                      className="gap-2"
                    >
                      <Settings className="w-4 h-4" />
                      Edit Profile
                    </Button>
                    <Button
                      variant="gold"
                      onClick={() => window.open(`/tenant/${activeTenant.tenant.slug}`, '_blank')}
                      className="gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Public Page
                    </Button>
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
            {/* Horses List - Only show if user has a tenant */}
            {activeTenant ? (
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
            ) : (
              /* Available Services - Show for users without tenant */
              <div className="lg:col-span-2">
                <Card variant="elevated">
                  <CardHeader>
                    <CardTitle className="text-navy">Available Services</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-6">
                      Explore our services and start your 14-day free trial
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <ServiceCard
                        icon={Building2}
                        title="Stable Management"
                        description="Manage your stable, horses, and team"
                      />
                      <ServiceCard
                        icon={Heart}
                        title="Horse Owner"
                        description="Track your horses' health and records"
                      />
                      <ServiceCard
                        icon={Activity}
                        title="Veterinary Clinic"
                        description="Manage appointments and medical records"
                      />
                      <ServiceCard
                        icon={Users}
                        title="Training Academy"
                        description="Schedule training sessions and track progress"
                      />
                    </div>
                    <Button
                      variant="gold"
                      className="w-full mt-6"
                      onClick={() => navigate("/select-role")}
                    >
                      Start Free Trial (14 days)
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

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
  badge,
  href,
  onNavigate,
  highlight = false
}: { 
  icon: any; 
  label: string; 
  active?: boolean;
  badge?: number;
  href?: string;
  onNavigate?: () => void;
  highlight?: boolean;
}) => {
  const className = `w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${
    active
      ? "bg-gold text-navy"
      : highlight
        ? "text-orange-400 hover:text-orange-300 hover:bg-navy-light border border-orange-500/30"
        : "text-cream/70 hover:text-cream hover:bg-navy-light"
  }`;

  const content = (
    <>
      <Icon className="w-5 h-5 shrink-0" />
      <span className="flex-1 text-left truncate">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className={`px-2 py-0.5 rounded-full text-xs shrink-0 ${active ? "bg-navy/20" : "bg-cream/10"}`}>
          {badge}
        </span>
      )}
    </>
  );

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

const ServiceCard = ({ 
  icon: Icon, 
  title, 
  description 
}: { 
  icon: any; 
  title: string; 
  description: string;
}) => (
  <div className="p-4 rounded-xl border border-border hover:border-gold/50 hover:bg-gold/5 transition-all cursor-pointer">
    <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center mb-3">
      <Icon className="w-5 h-5 text-gold" />
    </div>
    <h4 className="font-semibold text-navy mb-1">{title}</h4>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>
);

export default Dashboard;
