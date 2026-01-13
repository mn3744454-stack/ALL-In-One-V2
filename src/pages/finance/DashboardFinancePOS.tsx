import { useState, useEffect, useMemo } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { useI18n } from "@/i18n";
import { useRTL } from "@/hooks/useRTL";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// POS Components
import {
  POSLayoutResponsive,
  POSSessionBar,
  POSCatalogGrid,
  POSCart,
  POSPaymentPanel,
  POSReceiptDialog,
  POSStickyBar,
  OpenSessionDialog,
  CloseSessionDialog,
} from "@/components/pos";
import type { POSStep } from "@/components/pos/POSLayoutResponsive";

// POS Hooks
import { usePOSSessions } from "@/hooks/pos/usePOSSessions";
import { usePOSCore, type PaymentMethod } from "@/hooks/pos/usePOSCore";

// UI
import { Card, CardContent } from "@/components/ui/card";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { MobilePageHeader } from "@/components/navigation";
import { ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";

interface ServiceWithPrice {
  id: string;
  name: string;
  name_ar?: string | null;
  unit_price: number | null;
  service_type?: string | null;
  is_active: boolean;
}

export default function DashboardFinancePOS() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { t, dir } = useI18n();
  const { isRTL } = useRTL();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeTenant, activeRole } = useTenant();
  const tenantId = activeTenant?.tenant?.id;

  // POS State
  const [currentStep, setCurrentStep] = useState<POSStep>("catalog");
  const [openSessionDialogOpen, setOpenSessionDialogOpen] = useState(false);
  const [closeSessionDialogOpen, setCloseSessionDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [lastInvoiceItems, setLastInvoiceItems] = useState<any[]>([]);

  // Hooks
  const {
    openSession,
    isLoading: isLoadingSession,
    openNewSession,
    isOpening,
    closeSession,
    isClosing,
  } = usePOSSessions(tenantId);

  const {
    cart,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    totals,
    discountAmount,
    setDiscountAmount,
    selectedClientId,
    selectedClientName,
    createSale,
    isCreatingSale,
    lastCreatedInvoice,
  } = usePOSCore();

  // Fetch services as catalog
  const { data: services = [], isLoading: isLoadingServices } = useQuery({
    queryKey: ["pos-catalog", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("tenant_services")
        .select("id, name, name_ar, unit_price, service_type, is_active")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data || []) as ServiceWithPrice[];
    },
    enabled: !!tenantId,
  });

  // Calculate expected cash for close dialog
  const [expectedCash, setExpectedCash] = useState(0);
  useEffect(() => {
    if (openSession) {
      // Simple calculation: opening_cash + cash sales
      const fetchExpected = async () => {
        const { data } = await supabase
          .from("invoices")
          .select("total_amount")
          .eq("pos_session_id", openSession.id)
          .eq("payment_method", "cash")
          .not("payment_received_at", "is", null);
        const cashTotal = (data || []).reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
        setExpectedCash(Number(openSession.opening_cash) + cashTotal);
      };
      fetchExpected();
    }
  }, [openSession, lastCreatedInvoice]);

  // Permission check
  const canAccess = activeRole === "owner" || activeRole === "manager";

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <ShoppingCart className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t("permissions.accessDenied")}</h2>
            <p className="text-muted-foreground">{t("permissions.accessDeniedDesc")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handlers
  const handleOpenSession = async (openingCash: number, notes?: string) => {
    if (!tenantId) return;
    await openNewSession({ tenant_id: tenantId, opening_cash: openingCash, notes });
    setOpenSessionDialogOpen(false);
    setCurrentStep("catalog");
  };

  const handleCloseSession = async (actualCash: number, notes?: string) => {
    if (!openSession) return;
    await closeSession({ session_id: openSession.id, actual_cash: actualCash, notes });
    setCloseSessionDialogOpen(false);
    clearCart();
  };

  const handleAddItem = (item: ServiceWithPrice) => {
    if (item.unit_price === null) return; // Don't add items without price
    addItem({
      id: item.id,
      name: item.name,
      name_ar: item.name_ar,
      unit_price: item.unit_price,
      service_id: item.id,
    });
    if (isMobile && currentStep === "catalog") {
      // Stay on catalog, sticky bar shows cart
    }
  };

  const handleCompleteSale = async () => {
    if (!tenantId || !openSession) return;
    
    // Snapshot cart BEFORE the sale clears it
    const cartSnapshot = cart.map(item => ({
      description: item.name,
      description_ar: item.name_ar,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
    }));
    
    try {
      await createSale({
        tenant_id: tenantId,
        pos_session_id: openSession.id,
        client_id: selectedClientId,
        client_name: selectedClientName || t("finance.pos.walkIn"),
        payment_method: paymentMethod,
        discount_amount: discountAmount,
      });
      // Use snapshot for receipt (cart is cleared in createSale)
      setLastInvoiceItems(cartSnapshot);
      setReceiptDialogOpen(true);
      setCurrentStep("receipt");
    } catch (error) {
      console.error("Sale failed:", error);
    }
  };

  const handleNewSale = () => {
    setReceiptDialogOpen(false);
    setCurrentStep("catalog");
    setPaymentMethod("cash");
  };

  const handleViewInvoice = () => {
    if (lastCreatedInvoice?.id) {
      navigate(`/dashboard/finance?selected=${lastCreatedInvoice.id}`);
    }
    setReceiptDialogOpen(false);
  };

  // Catalog items for grid
  const catalogItems = useMemo(() => 
    services.map(s => ({
      id: s.id,
      name: s.name,
      name_ar: s.name_ar,
      unit_price: s.unit_price,
      category: s.service_type,
      is_active: s.is_active,
    })), [services]);

  const hasOpenSession = !!openSession;
  const canPay = cart.length > 0 && hasOpenSession;

  return (
    <div className={cn("min-h-screen bg-background flex", dir === "rtl" && "flex-row-reverse")}>
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <MobilePageHeader title={t("finance.pos.title")} backTo="/dashboard/finance" />

        <POSLayoutResponsive
          currentStep={currentStep}
          onStepChange={setCurrentStep}
          hasOpenSession={hasOpenSession}
          sessionBar={
            <POSSessionBar
              session={openSession}
              onOpenSession={() => setOpenSessionDialogOpen(true)}
              onCloseSession={() => setCloseSessionDialogOpen(true)}
              isOpening={isOpening}
              isClosing={isClosing}
            />
          }
          catalog={
            <POSCatalogGrid
              items={catalogItems}
              onItemSelect={handleAddItem}
              isLoading={isLoadingServices}
            />
          }
          cart={
            <POSCart
              items={cart}
              totals={totals}
              onUpdateQuantity={updateQuantity}
              onRemoveItem={removeItem}
              onClearCart={clearCart}
              discountAmount={discountAmount}
              onDiscountChange={setDiscountAmount}
            />
          }
          payment={
            <POSPaymentPanel
              total={totals.total}
              selectedMethod={paymentMethod}
              onMethodChange={setPaymentMethod}
              onCompleteSale={handleCompleteSale}
              isProcessing={isCreatingSale}
              disabled={!canPay}
            />
          }
          receipt={
            <POSReceiptDialog
              open={receiptDialogOpen}
              onOpenChange={setReceiptDialogOpen}
              invoice={lastCreatedInvoice}
              items={lastInvoiceItems}
              onPrint={() => {}}
              onViewInvoice={handleViewInvoice}
              onNewSale={handleNewSale}
            />
          }
          stickyBar={
            isMobile ? (
              <POSStickyBar
                currentStep={currentStep}
                onStepChange={setCurrentStep}
                cartItemCount={totals.itemCount}
                total={totals.total}
                canPay={canPay}
                onPay={() => setCurrentStep("payment")}
              />
            ) : null
          }
        />
      </main>

      {/* Dialogs */}
      <OpenSessionDialog
        open={openSessionDialogOpen}
        onOpenChange={setOpenSessionDialogOpen}
        onConfirm={handleOpenSession}
        isLoading={isOpening}
      />

      <CloseSessionDialog
        open={closeSessionDialogOpen}
        onOpenChange={setCloseSessionDialogOpen}
        session={openSession}
        expectedCash={expectedCash}
        onConfirm={handleCloseSession}
        isLoading={isClosing}
      />
    </div>
  );
}
