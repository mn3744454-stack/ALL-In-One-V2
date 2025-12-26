import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export interface HorseOrder {
  id: string;
  tenant_id: string;
  horse_id: string;
  order_type_id: string;
  category: string | null;
  service_mode: "internal" | "external";
  status: "draft" | "pending" | "scheduled" | "in_progress" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  requested_at: string;
  scheduled_for: string | null;
  completed_at: string | null;
  notes: string | null;
  internal_resource_ref: Record<string, unknown> | null;
  external_provider_name: string | null;
  external_provider_meta: Record<string, unknown> | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  currency: string;
  is_income: boolean;
  tax_category: string | null;
  account_code: string | null;
  financial_category: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  horse?: {
    id: string;
    name: string;
    name_ar: string | null;
    avatar_url: string | null;
  };
  order_type?: {
    id: string;
    name: string;
    name_ar: string | null;
    category: string | null;
  };
  creator?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface CreateOrderData {
  horse_id: string;
  order_type_id: string;
  service_mode: "internal" | "external";
  status?: "draft" | "pending";
  priority?: "low" | "medium" | "high" | "urgent";
  scheduled_for?: string | null;
  notes?: string | null;
  internal_resource_ref?: Json | null;
  external_provider_name?: string | null;
  external_provider_meta?: Json | null;
  estimated_cost?: number | null;
  is_income?: boolean;
}

export interface OrderFilters {
  status?: string | null;
  priority?: string | null;
  order_type_id?: string | null;
  horse_id?: string | null;
  category?: string | null;
  search?: string;
}

export function useHorseOrders(filters?: OrderFilters) {
  const [orders, setOrders] = useState<HorseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeTenant, activeRole } = useTenant();
  const { user } = useAuth();

  const canManage = activeRole === "owner" || activeRole === "manager";

  const fetchOrders = useCallback(async () => {
    if (!activeTenant?.tenant.id) {
      setOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from("horse_orders")
        .select(`
          *,
          horse:horses!horse_id(id, name, name_ar, avatar_url),
          order_type:horse_order_types!order_type_id(id, name, name_ar, category),
          creator:profiles!created_by(id, full_name, avatar_url)
        `)
        .eq("tenant_id", activeTenant.tenant.id)
        .order("created_at", { ascending: false });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.priority) {
        query = query.eq("priority", filters.priority);
      }
      if (filters?.order_type_id) {
        query = query.eq("order_type_id", filters.order_type_id);
      }
      if (filters?.horse_id) {
        query = query.eq("horse_id", filters.horse_id);
      }
      if (filters?.category) {
        query = query.eq("category", filters.category);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Type assertion for the joined data
      setOrders((data as unknown as HorseOrder[]) || []);
    } catch (error: unknown) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [activeTenant?.tenant.id, filters?.status, filters?.priority, filters?.order_type_id, filters?.horse_id, filters?.category]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const createOrder = async (orderData: CreateOrderData) => {
    if (!activeTenant?.tenant.id || !user?.id) {
      toast.error("No active organization");
      return null;
    }

    if (!canManage) {
      toast.error("You don't have permission to create orders");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("horse_orders")
        .insert({
          tenant_id: activeTenant.tenant.id,
          created_by: user.id,
          ...orderData,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Order created successfully");
      fetchOrders();
      return data;
    } catch (error: unknown) {
      console.error("Error creating order:", error);
      const message = error instanceof Error ? error.message : "Failed to create order";
      toast.error(message);
      return null;
    }
  };

  const updateOrder = async (id: string, updates: Partial<CreateOrderData>) => {
    if (!canManage) {
      toast.error("You don't have permission to update orders");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("horse_orders")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      toast.success("Order updated successfully");
      fetchOrders();
      return data;
    } catch (error: unknown) {
      console.error("Error updating order:", error);
      const message = error instanceof Error ? error.message : "Failed to update order";
      toast.error(message);
      return null;
    }
  };

  const updateStatus = async (id: string, newStatus: HorseOrder["status"], additionalData?: Partial<CreateOrderData>) => {
    if (!canManage) {
      toast.error("You don't have permission to update order status");
      return null;
    }

    try {
      const updateData: Record<string, unknown> = { status: newStatus, ...additionalData };
      
      if (newStatus === "completed") {
        updateData.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("horse_orders")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      toast.success(`Order status updated to ${newStatus}`);
      fetchOrders();
      return data;
    } catch (error: unknown) {
      console.error("Error updating order status:", error);
      const message = error instanceof Error ? error.message : "Failed to update order status";
      toast.error(message);
      return null;
    }
  };

  const deleteOrder = async (id: string) => {
    if (!canManage) {
      toast.error("You don't have permission to delete orders");
      return false;
    }

    try {
      const { error } = await supabase
        .from("horse_orders")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Order deleted successfully");
      fetchOrders();
      return true;
    } catch (error: unknown) {
      console.error("Error deleting order:", error);
      const message = error instanceof Error ? error.message : "Failed to delete order";
      toast.error(message);
      return false;
    }
  };

  return {
    orders,
    loading,
    canManage,
    createOrder,
    updateOrder,
    updateStatus,
    deleteOrder,
    refresh: fetchOrders,
  };
}
