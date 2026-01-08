import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { TenantProvider } from "@/contexts/TenantContext";
import { I18nProvider } from "@/i18n";
import { ModuleGuard } from "@/components/guards/ModuleGuard";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import SelectRole from "./pages/SelectRole";
import CreateStableProfile from "./pages/CreateStableProfile";
import Dashboard from "./pages/Dashboard";
import DashboardPublicProfile from "./pages/DashboardPublicProfile";
import DashboardServices from "./pages/DashboardServices";
import DashboardMyBookings from "./pages/DashboardMyBookings";
import DashboardAcademySessions from "./pages/DashboardAcademySessions";
import DashboardAcademyBookings from "./pages/DashboardAcademyBookings";
import DashboardPayments from "./pages/DashboardPayments";
import DashboardRevenue from "./pages/DashboardRevenue";
import DashboardHorses from "./pages/DashboardHorses";
import DashboardHorseOrders from "./pages/DashboardHorseOrders";
import DashboardBreeding from "./pages/DashboardBreeding";
import DashboardVet from "./pages/DashboardVet";
import DashboardLaboratory from "./pages/DashboardLaboratory";
import DashboardHR from "./pages/DashboardHR";
import DashboardHRSettings from "./pages/DashboardHRSettings";
import DashboardHRAttendance from "./pages/DashboardHRAttendance";
import DashboardMovement from "./pages/DashboardMovement";
import DashboardHousing from "./pages/DashboardHousing";
import DashboardOrganizationSettings from "./pages/DashboardOrganizationSettings";
import SharedLabResult from "./pages/SharedLabResult";
import HorseProfile from "./pages/HorseProfile";
import CommunityFeed from "./pages/CommunityFeed";
import PublicProfile from "./pages/PublicProfile";
import Directory from "./pages/Directory";
import TenantPublicProfile from "./pages/TenantPublicProfile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/directory" element={<Directory />} />
      <Route path="/t/:slug" element={<TenantPublicProfile />} />
      {/* Public shared lab result - no auth required */}
      <Route path="/shared/lab-result/:token" element={<SharedLabResult />} />
      <Route
        path="/auth"
        element={
          <AuthRoute>
            <Auth />
          </AuthRoute>
        }
      />
      <Route
        path="/select-role"
        element={
          <ProtectedRoute>
            <SelectRole />
          </ProtectedRoute>
        }
      />
      <Route
        path="/create-profile/stable"
        element={
          <ProtectedRoute>
            <CreateStableProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/create-profile/clinic"
        element={
          <ProtectedRoute>
            <CreateStableProfile tenantType="clinic" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/create-profile/lab"
        element={
          <ProtectedRoute>
            <CreateStableProfile tenantType="lab" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/create-profile/academy"
        element={
          <ProtectedRoute>
            <CreateStableProfile tenantType="academy" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/create-profile/owner"
        element={
          <ProtectedRoute>
            <CreateStableProfile tenantType="stable" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/public-profile"
        element={
          <ProtectedRoute>
            <DashboardPublicProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/services"
        element={
          <ProtectedRoute>
            <DashboardServices />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/my-bookings"
        element={
          <ProtectedRoute>
            <DashboardMyBookings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/academy/sessions"
        element={
          <ProtectedRoute>
            <DashboardAcademySessions />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/academy/bookings"
        element={
          <ProtectedRoute>
            <DashboardAcademyBookings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/payments"
        element={
          <ProtectedRoute>
            <DashboardPayments />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/revenue"
        element={
          <ProtectedRoute>
            <DashboardRevenue />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/horses"
        element={
          <ProtectedRoute>
            <DashboardHorses />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/horse-orders"
        element={
          <ProtectedRoute>
            <DashboardHorseOrders />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/breeding"
        element={
          <ProtectedRoute>
            <ModuleGuard module="breeding">
              <DashboardBreeding />
            </ModuleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/vet"
        element={
          <ProtectedRoute>
            <ModuleGuard module="vet">
              <DashboardVet />
            </ModuleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/laboratory"
        element={
          <ProtectedRoute>
            <ModuleGuard module="laboratory">
              <DashboardLaboratory />
            </ModuleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/hr"
        element={
          <ProtectedRoute>
            <DashboardHR />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/hr/settings"
        element={
          <ProtectedRoute>
            <DashboardHRSettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/hr/attendance"
        element={
          <ProtectedRoute>
            <DashboardHRAttendance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/movement"
        element={
          <ProtectedRoute>
            <ModuleGuard module="movement">
              <DashboardMovement />
            </ModuleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/housing"
        element={
          <ProtectedRoute>
            <ModuleGuard module="housing">
              <DashboardHousing />
            </ModuleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/settings"
        element={
          <ProtectedRoute>
            <DashboardOrganizationSettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/horses/:id"
        element={
          <ProtectedRoute>
            <HorseProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/community"
        element={
          <ProtectedRoute>
            <CommunityFeed />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile/:id"
        element={
          <ProtectedRoute>
            <PublicProfile />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <I18nProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <TenantProvider>
                <AppRoutes />
              </TenantProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </I18nProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
