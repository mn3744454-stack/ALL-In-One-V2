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
import I18nRecoveryBoundary from "@/components/guards/I18nRecoveryBoundary";
import { ModuleGuard } from "@/components/guards/ModuleGuard";
import { WorkspaceRouteGuard } from "@/components/guards/WorkspaceRouteGuard";
import { CommunityRouteGuard } from "@/components/guards/CommunityRouteGuard";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import SelectRole from "./pages/SelectRole";
import CreateStableProfile from "./pages/CreateStableProfile";
import Dashboard from "./pages/Dashboard";
import DashboardMobileModule from "./pages/DashboardMobileModule";
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
import DashboardHRPayroll from "./pages/DashboardHRPayroll";
import DashboardMovement from "./pages/DashboardMovement";
import DashboardHousing from "./pages/DashboardHousing";
import DashboardOrganizationSettings from "./pages/DashboardOrganizationSettings";
import DashboardConnectionsSettings from "./pages/DashboardConnectionsSettings";
import DashboardSchedule from "./pages/DashboardSchedule";
import DashboardRecords from "./pages/DashboardRecords";
import DashboardFileManager from "./pages/DashboardFileManager";
import DashboardFinance from "./pages/DashboardFinance";
import DashboardPermissionsSettings from "./pages/DashboardPermissionsSettings";
import SharedLabResult from "./pages/SharedLabResult";
import SharedMedia from "./pages/SharedMedia";
import SharedHorseReport from "./pages/SharedHorseReport";
import InviteLandingPage from "./pages/InviteLandingPage";
import HorseProfile from "./pages/HorseProfile";
import CommunityFeed from "./pages/CommunityFeed";
import PublicProfile from "./pages/PublicProfile";
import Directory from "./pages/Directory";
import TenantPublicProfile from "./pages/TenantPublicProfile";
import NotFound from "./pages/NotFound";
import AcceptConnectionPage from "./pages/AcceptConnectionPage";
import DashboardNotificationSettings from "./pages/DashboardNotificationSettings";
import DashboardClients from "./pages/DashboardClients";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import DebugAuth from "./pages/DebugAuth";
// Doctor pages
import DashboardDoctorOverview from "./pages/DashboardDoctorOverview";
import DashboardDoctorPatients from "./pages/DashboardDoctorPatients";
import DashboardDoctorConsultations from "./pages/DashboardDoctorConsultations";
import DashboardDoctorConsultationDetail from "./pages/DashboardDoctorConsultationDetail";
import DashboardDoctorServices from "./pages/DashboardDoctorServices";
// Finance child pages
import { DashboardFinancePOS, DashboardFinanceCategories, FinanceCustomerBalances } from "./pages/finance";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

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
      {/* Public shared routes - no auth required */}
      <Route path="/shared/lab-result/:token" element={<SharedLabResult />} />
      <Route path="/shared/media/:token" element={<SharedMedia />} />
      <Route path="/share/horse/:token" element={<SharedHorseReport />} />
      {/* Public invitation landing page - handles both anon preaccept and auth finalize */}
      <Route path="/invite/:token" element={<InviteLandingPage />} />
      <Route
        path="/auth"
        element={
          <AuthRoute>
            <Auth />
          </AuthRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <AuthRoute>
            <ForgotPassword />
          </AuthRoute>
        }
      />
      <Route path="/reset-password" element={<ResetPassword />} />
      {/* Debug route for diagnosing auth/cache issues - DEV only */}
      {import.meta.env.DEV && (
        <Route path="/debug/auth" element={<DebugAuth />} />
      )}
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
            <CreateStableProfile tenantType="horse_owner" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/create-profile/horse-owner"
        element={
          <ProtectedRoute>
            <CreateStableProfile tenantType="horse_owner" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/create-profile/pharmacy"
        element={
          <ProtectedRoute>
            <CreateStableProfile tenantType="pharmacy" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/create-profile/transport"
        element={
          <ProtectedRoute>
            <CreateStableProfile tenantType="transport" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/create-profile/auction"
        element={
          <ProtectedRoute>
            <CreateStableProfile tenantType="auction" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/create-profile/trainer"
        element={
          <ProtectedRoute>
            <CreateStableProfile tenantType="trainer" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/create-profile/doctor"
        element={
          <ProtectedRoute>
            <CreateStableProfile tenantType="doctor" />
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
        path="/dashboard/mobile/:moduleKey"
        element={
          <ProtectedRoute>
            <DashboardMobileModule />
          </ProtectedRoute>
        }
      />
      {/* Org-only routes with WorkspaceRouteGuard */}
      <Route
        path="/dashboard/public-profile"
        element={
          <ProtectedRoute>
            <WorkspaceRouteGuard requiredMode="organization">
              <DashboardPublicProfile />
            </WorkspaceRouteGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/services"
        element={
          <ProtectedRoute>
            <WorkspaceRouteGuard requiredMode="organization">
              <DashboardServices />
            </WorkspaceRouteGuard>
          </ProtectedRoute>
        }
      />
      {/* Personal workspace routes */}
      <Route
        path="/dashboard/my-bookings"
        element={
          <ProtectedRoute>
            <DashboardMyBookings />
          </ProtectedRoute>
        }
      />
      {/* Org-only academy routes */}
      <Route
        path="/dashboard/academy/sessions"
        element={
          <ProtectedRoute>
            <WorkspaceRouteGuard requiredMode="organization" requiredPermission="academy.sessions.manage">
              <DashboardAcademySessions />
            </WorkspaceRouteGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/academy/bookings"
        element={
          <ProtectedRoute>
            <WorkspaceRouteGuard requiredMode="organization" requiredPermission="bookings.manage">
              <DashboardAcademyBookings />
            </WorkspaceRouteGuard>
          </ProtectedRoute>
        }
      />
      {/* Redirect old /dashboard/payments and /dashboard/revenue to finance */}
      <Route
        path="/dashboard/payments"
        element={<Navigate to="/dashboard/finance/payments" replace />}
      />
      <Route
        path="/dashboard/revenue"
        element={<Navigate to="/dashboard/finance/revenue" replace />}
      />
      {/* Org-only horses route */}
      <Route
        path="/dashboard/horses"
        element={
          <ProtectedRoute>
            <WorkspaceRouteGuard requiredMode="organization" requiredPermission="horses.view">
              <DashboardHorses />
            </WorkspaceRouteGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/horse-orders"
        element={
          <ProtectedRoute>
            <WorkspaceRouteGuard requiredMode="organization">
              <DashboardHorseOrders />
            </WorkspaceRouteGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/breeding"
        element={
          <ProtectedRoute>
            <WorkspaceRouteGuard requiredMode="organization">
              <ModuleGuard module="breeding">
                <DashboardBreeding />
              </ModuleGuard>
            </WorkspaceRouteGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/vet"
        element={
          <ProtectedRoute>
            <WorkspaceRouteGuard requiredMode="organization">
              <ModuleGuard module="vet">
                <DashboardVet />
              </ModuleGuard>
            </WorkspaceRouteGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/laboratory"
        element={
          <ProtectedRoute>
            <WorkspaceRouteGuard requiredMode="organization" requiredPermission="laboratory.samples.view">
              <ModuleGuard module="laboratory">
                <DashboardLaboratory />
              </ModuleGuard>
            </WorkspaceRouteGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/hr"
        element={
          <ProtectedRoute>
            <WorkspaceRouteGuard requiredMode="organization" requiredPermission="hr.view">
              <DashboardHR />
            </WorkspaceRouteGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/hr/settings"
        element={
          <ProtectedRoute>
            <WorkspaceRouteGuard requiredMode="organization" requiredPermission="hr.manage">
              <DashboardHRSettings />
            </WorkspaceRouteGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/hr/attendance"
        element={
          <ProtectedRoute>
            <WorkspaceRouteGuard requiredMode="organization" requiredPermission="hr.view">
              <DashboardHRAttendance />
            </WorkspaceRouteGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/hr/payroll"
        element={
          <ProtectedRoute>
            <WorkspaceRouteGuard requiredMode="organization" requiredPermission="hr.manage">
              <DashboardHRPayroll />
            </WorkspaceRouteGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/movement"
        element={
          <ProtectedRoute>
            <WorkspaceRouteGuard requiredMode="organization">
              <ModuleGuard module="movement">
                <DashboardMovement />
              </ModuleGuard>
            </WorkspaceRouteGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/housing"
        element={
          <ProtectedRoute>
            <WorkspaceRouteGuard requiredMode="organization" requiredPermission="housing.view">
              <ModuleGuard module="housing">
                <DashboardHousing />
              </ModuleGuard>
            </WorkspaceRouteGuard>
          </ProtectedRoute>
        }
      />
      {/* Doctor module routes - org only */}
      <Route path="/dashboard/doctor" element={<ProtectedRoute><WorkspaceRouteGuard requiredMode="organization"><DashboardDoctorOverview /></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/dashboard/doctor/patients" element={<ProtectedRoute><WorkspaceRouteGuard requiredMode="organization"><DashboardDoctorPatients /></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/dashboard/doctor/consultations" element={<ProtectedRoute><WorkspaceRouteGuard requiredMode="organization"><DashboardDoctorConsultations /></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/dashboard/doctor/consultations/new" element={<ProtectedRoute><WorkspaceRouteGuard requiredMode="organization"><DashboardDoctorConsultationDetail /></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/dashboard/doctor/consultations/:id" element={<ProtectedRoute><WorkspaceRouteGuard requiredMode="organization"><DashboardDoctorConsultationDetail /></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/dashboard/doctor/services" element={<ProtectedRoute><WorkspaceRouteGuard requiredMode="organization"><DashboardDoctorServices /></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route
        path="/dashboard/clients"
        element={
          <ProtectedRoute>
            <WorkspaceRouteGuard requiredMode="organization">
              <DashboardClients />
            </WorkspaceRouteGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/settings"
        element={
          <ProtectedRoute>
            <WorkspaceRouteGuard requiredMode="organization">
              <DashboardOrganizationSettings />
            </WorkspaceRouteGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/settings/permissions"
        element={
          <ProtectedRoute>
            <WorkspaceRouteGuard requiredMode="organization">
              <DashboardPermissionsSettings />
            </WorkspaceRouteGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/settings/connections"
        element={
          <ProtectedRoute>
            <WorkspaceRouteGuard requiredMode="organization">
              <DashboardConnectionsSettings />
            </WorkspaceRouteGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/settings/notifications"
        element={
          <ProtectedRoute>
            <DashboardNotificationSettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/schedule"
        element={
          <ProtectedRoute>
            <WorkspaceRouteGuard requiredMode="organization" requiredPermission="schedule.view">
              <DashboardSchedule />
            </WorkspaceRouteGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/records"
        element={
          <ProtectedRoute>
            <WorkspaceRouteGuard requiredMode="organization">
              <DashboardRecords />
            </WorkspaceRouteGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/files"
        element={
          <ProtectedRoute>
            <WorkspaceRouteGuard requiredMode="organization" requiredPermission="files.assets.manage">
              <DashboardFileManager />
            </WorkspaceRouteGuard>
          </ProtectedRoute>
        }
      />
      {/* Finance module routes - org only */}
      <Route
        path="/dashboard/finance"
        element={
          <ProtectedRoute>
            <WorkspaceRouteGuard requiredMode="organization">
              <DashboardFinance />
            </WorkspaceRouteGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/finance/invoices"
        element={
          <ProtectedRoute>
            <WorkspaceRouteGuard requiredMode="organization">
              <DashboardFinance initialTab="invoices" />
            </WorkspaceRouteGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/finance/expenses"
        element={
          <ProtectedRoute>
            <WorkspaceRouteGuard requiredMode="organization">
              <DashboardFinance initialTab="expenses" />
            </WorkspaceRouteGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/finance/ledger"
        element={
          <ProtectedRoute>
            <WorkspaceRouteGuard requiredMode="organization">
              <DashboardFinance initialTab="ledger" />
            </WorkspaceRouteGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/finance/payments"
        element={
          <ProtectedRoute>
            <WorkspaceRouteGuard requiredMode="organization" requiredPermission="payments.view">
              <DashboardPayments />
            </WorkspaceRouteGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/finance/revenue"
        element={
          <ProtectedRoute>
            <WorkspaceRouteGuard requiredMode="organization">
              <DashboardRevenue />
            </WorkspaceRouteGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/finance/pos"
        element={
          <ProtectedRoute>
            <WorkspaceRouteGuard requiredMode="organization">
              <DashboardFinancePOS />
            </WorkspaceRouteGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/finance/categories"
        element={
          <ProtectedRoute>
            <WorkspaceRouteGuard requiredMode="organization">
              <DashboardFinanceCategories />
            </WorkspaceRouteGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/finance/customer-balances"
        element={
          <ProtectedRoute>
            <WorkspaceRouteGuard requiredMode="organization">
              <FinanceCustomerBalances />
            </WorkspaceRouteGuard>
          </ProtectedRoute>
        }
      />
      {/* My Payments for regular users (different from finance payments) */}
      <Route
        path="/dashboard/my-payments"
        element={
          <ProtectedRoute>
            <DashboardPayments />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/horses/:id"
        element={
          <ProtectedRoute>
            <WorkspaceRouteGuard requiredMode="organization" requiredPermission="horses.view">
              <HorseProfile />
            </WorkspaceRouteGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/community"
        element={
          <ProtectedRoute>
            <CommunityRouteGuard>
              <CommunityFeed />
            </CommunityRouteGuard>
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
      {/* Connection accept/reject via token landing page */}
      <Route path="/connections/accept" element={<AcceptConnectionPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

// DEV-only wrapper for HMR recovery, no-op in production
const DevWrapper = import.meta.env.DEV ? I18nRecoveryBoundary : React.Fragment;

const App = () => (
  <DevWrapper>
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
  </DevWrapper>
);

export default App;
