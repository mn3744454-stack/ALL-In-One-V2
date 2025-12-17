import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Logo from "@/components/Logo";
import {
  Building2,
  Home,
  Calendar,
  FileText,
  Users,
  Settings,
  Bell,
  Search,
  Plus,
  TrendingUp,
  Heart,
  Activity,
  ChevronRight,
  Menu,
  X,
  LogOut
} from "lucide-react";

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

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
            <NavItem icon={Heart} label="My Horses" badge={12} />
            <NavItem icon={Calendar} label="Schedule" />
            <NavItem icon={FileText} label="Records" />
            <NavItem icon={Users} label="Staff" />
            <NavItem icon={Building2} label="Facilities" />
            
            <div className="pt-4 mt-4 border-t border-navy-light">
              <NavItem icon={Settings} label="Settings" />
            </div>
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-navy-light">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gold flex items-center justify-center text-navy font-bold">
                AF
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-cream truncate">Al-Faisal Stables</p>
                <p className="text-xs text-cream/60">Stable Owner</p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-cream/70 hover:text-cream hover:bg-navy-light"
              onClick={() => navigate("/")}
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
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search horses, records..."
                  className="w-64 h-10 pl-10 pr-4 rounded-xl bg-muted border-0 text-sm focus:ring-2 focus:ring-gold/30"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="relative p-2 rounded-xl hover:bg-muted transition-colors">
                <Bell className="w-5 h-5 text-muted-foreground" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
              </button>
              <Button variant="gold" size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Add Horse
              </Button>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-4 lg:p-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="font-display text-2xl md:text-3xl font-bold text-navy mb-2">
              Welcome back, Al-Faisal Stables
            </h1>
            <p className="text-muted-foreground">
              Here's what's happening with your stable today.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={Heart}
              label="Total Horses"
              value="12"
              change="+2 this month"
              positive
            />
            <StatCard
              icon={Activity}
              label="Health Checkups"
              value="3"
              change="Scheduled this week"
            />
            <StatCard
              icon={Users}
              label="Staff Members"
              value="8"
              change="Active"
            />
            <StatCard
              icon={TrendingUp}
              label="Monthly Revenue"
              value="45,200"
              currency="SAR"
              change="+12% vs last month"
              positive
            />
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Horses */}
            <div className="lg:col-span-2">
              <Card variant="elevated">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-navy">Your Horses</CardTitle>
                  <Link to="#" className="text-sm text-gold hover:text-gold-dark font-medium flex items-center gap-1">
                    View All <ChevronRight className="w-4 h-4" />
                  </Link>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <HorseItem name="Shaheen" breed="Arabian" age="6 years" status="Healthy" />
                    <HorseItem name="Rimal" breed="Arabian" age="4 years" status="Checkup Due" warning />
                    <HorseItem name="Buraq" breed="Thoroughbred" age="8 years" status="Healthy" />
                    <HorseItem name="Falak" breed="Arabian" age="3 years" status="Healthy" />
                  </div>
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
                  <div className="space-y-4">
                    <EventItem
                      title="Vet Visit - Rimal"
                      time="Today, 2:00 PM"
                      type="health"
                    />
                    <EventItem
                      title="Farrier - All horses"
                      time="Tomorrow, 9:00 AM"
                      type="maintenance"
                    />
                    <EventItem
                      title="Training - Shaheen"
                      time="Dec 20, 10:00 AM"
                      type="training"
                    />
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
    {badge && (
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
  age, 
  status,
  warning = false
}: { 
  name: string; 
  breed: string; 
  age: string; 
  status: string;
  warning?: boolean;
}) => (
  <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer">
    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold to-gold-light flex items-center justify-center text-navy font-bold">
      {name[0]}
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-semibold text-navy">{name}</p>
      <p className="text-sm text-muted-foreground">{breed} • {age}</p>
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

const EventItem = ({ 
  title, 
  time, 
  type 
}: { 
  title: string; 
  time: string; 
  type: "health" | "maintenance" | "training" 
}) => {
  const colors = {
    health: "bg-emerald-500",
    maintenance: "bg-blue-500",
    training: "bg-purple-500",
  };

  return (
    <div className="flex items-start gap-3">
      <div className={`w-2 h-2 rounded-full mt-2 ${colors[type]}`} />
      <div>
        <p className="text-sm font-medium text-navy">{title}</p>
        <p className="text-xs text-muted-foreground">{time}</p>
      </div>
    </div>
  );
};

export default Dashboard;
