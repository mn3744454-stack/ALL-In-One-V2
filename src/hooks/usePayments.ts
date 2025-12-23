import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";

export interface PaymentIntent {
  id: string;
  payer_user_id: string;
  payee_account_id: string;
  tenant_id: string | null;
  intent_type: "platform_fee" | "service_payment" | "commission";
  reference_type: "academy_booking" | "service" | "order" | "auction" | "subscription";
  reference_id: string;
  amount_display: string | null;
  currency: string;
  status: "draft" | "pending" | "paid" | "cancelled";
  created_at: string;
  updated_at: string;
}

export interface PaymentAccount {
  id: string;
  owner_type: "platform" | "tenant";
  tenant_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PaymentSplit {
  id: string;
  payment_intent_id: string;
  receiver_account_id: string;
  amount_display: string | null;
  role: "platform" | "tenant";
  created_at: string;
}

// Fetch user's payment intents (as payer)
export function useUserPaymentIntents() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["payment-intents", "user", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("payment_intents")
        .select("*")
        .eq("payer_user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PaymentIntent[];
    },
    enabled: !!user?.id,
  });
}

// Fetch tenant's payment intents (as payee)
export function useTenantPaymentIntents() {
  const { activeTenant } = useTenant();

  return useQuery({
    queryKey: ["payment-intents", "tenant", activeTenant?.tenant.id],
    queryFn: async () => {
      if (!activeTenant?.tenant.id) return [];

      const { data, error } = await supabase
        .from("payment_intents")
        .select("*")
        .eq("tenant_id", activeTenant.tenant.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PaymentIntent[];
    },
    enabled: !!activeTenant?.tenant.id,
  });
}

// Fetch tenant's payment account
export function useTenantPaymentAccount() {
  const { activeTenant } = useTenant();

  return useQuery({
    queryKey: ["payment-account", "tenant", activeTenant?.tenant.id],
    queryFn: async () => {
      if (!activeTenant?.tenant.id) return null;

      const { data, error } = await supabase
        .from("payment_accounts")
        .select("*")
        .eq("tenant_id", activeTenant.tenant.id)
        .maybeSingle();

      if (error) throw error;
      return data as PaymentAccount | null;
    },
    enabled: !!activeTenant?.tenant.id,
  });
}

// Fetch payment splits for an intent
export function usePaymentSplits(intentId: string | null) {
  return useQuery({
    queryKey: ["payment-splits", intentId],
    queryFn: async () => {
      if (!intentId) return [];

      const { data, error } = await supabase
        .from("payment_splits")
        .select("*")
        .eq("payment_intent_id", intentId);

      if (error) throw error;
      return data as PaymentSplit[];
    },
    enabled: !!intentId,
  });
}

// Get reference type label
export function getReferenceTypeLabel(type: PaymentIntent["reference_type"]): string {
  const labels: Record<PaymentIntent["reference_type"], string> = {
    academy_booking: "Academy Booking",
    service: "Service",
    order: "Order",
    auction: "Auction",
    subscription: "Subscription",
  };
  return labels[type] || type;
}

// Get intent type label
export function getIntentTypeLabel(type: PaymentIntent["intent_type"]): string {
  const labels: Record<PaymentIntent["intent_type"], string> = {
    platform_fee: "Platform Fee",
    service_payment: "Service Payment",
    commission: "Commission",
  };
  return labels[type] || type;
}

// Get status label and color
export function getStatusInfo(status: PaymentIntent["status"]): { label: string; color: string } {
  const info: Record<PaymentIntent["status"], { label: string; color: string }> = {
    draft: { label: "Draft", color: "bg-muted text-muted-foreground" },
    pending: { label: "Pending", color: "bg-warning/10 text-warning" },
    paid: { label: "Paid", color: "bg-success/10 text-success" },
    cancelled: { label: "Cancelled", color: "bg-destructive/10 text-destructive" },
  };
  return info[status] || { label: status, color: "bg-muted text-muted-foreground" };
}
