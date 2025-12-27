import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { TenantSwitcher } from "@/components/TenantSwitcher";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { InvitationsPanel } from "@/components/InvitationsPanel";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { useTenant } from "@/contexts/TenantContext";
import { useHorses } from "@/hooks/useHorses";
import { HorsesList } from "@/components/horses";
import { Heart, Menu, Search } from "lucide-react";

const DashboardHorses = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { activeTenant } = useTenant();
  const { horses, loading: horsesLoading, refresh } = useHorses();

  return (
    <div className="h-dvh w-full bg-cream flex overflow-hidden">
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 min-w-0">
        {/* Top Bar */}
        <header className="shrink-0 z-30 bg-cream/80 backdrop-blur-xl border-b border-border/50">
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
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search horses..."
                  className="w-64 h-10 pl-10 pr-4 rounded-xl bg-muted border-0 text-sm focus:ring-2 focus:ring-gold/30"
                />
              </div>
              
              <InvitationsPanel />
            </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-4 lg:p-8">
            {!activeTenant ? (
              <div className="text-center py-12">
                <Heart className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <h2 className="font-display text-xl font-semibold text-navy mb-2">
                  No Organization Selected
                </h2>
                <p className="text-muted-foreground mb-4">
                  Please create or join an organization to manage horses.
                </p>
                <Link to="/select-role">
                  <Button variant="gold">Create Organization</Button>
                </Link>
              </div>
            ) : (
              <HorsesList
                horses={horses}
                loading={horsesLoading}
                onRefresh={refresh}
                onHorseClick={(horse) => navigate(`/dashboard/horses/${horse.id}`)}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardHorses;
