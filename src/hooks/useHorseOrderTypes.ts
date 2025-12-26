import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";

export interface HorseOrderType {
  id: string;
  tenant_id: string;
  name: string;
  name_ar: string | null;
  category: string | null;
  is_active: boolean;
  pin_as_tab: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateOrderTypeData {
  name: string;
  name_ar?: string | null;
  category?: string | null;
  is_active?: boolean;
  pin_as_tab?: boolean;
  sort_order?: number;
}

export function useHorseOrderTypes() {
  const [orderTypes, setOrderTypes] = useState<HorseOrderType[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeTenant, activeRole } = useTenant();

  const canManage = activeRole === "owner" || activeRole === "manager";

  const fetchOrderTypes = useCallback(async () => {
    if (!activeTenant?.tenant.id) {
      setOrderTypes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("horse_order_types")
        .select("*")
        .eq("tenant_id", activeTenant.tenant.id)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      setOrderTypes(data || []);
    } catch (error) {
      console.error("Error fetching order types:", error);
      toast.error("Failed to load order types");
    } finally {
      setLoading(false);
    }
  }, [activeTenant?.tenant.id]);

  useEffect(() => {
    fetchOrderTypes();
  }, [fetchOrderTypes]);

  const createOrderType = async (typeData: CreateOrderTypeData) => {
    if (!activeTenant?.tenant.id) {
      toast.error("No active organization");
      return null;
    }

    if (!canManage) {
      toast.error("You don't have permission to create order types");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("horse_order_types")
        .insert({
          tenant_id: activeTenant.tenant.id,
          ...typeData,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Order type created successfully");
      fetchOrderTypes();
      return data;
    } catch (error: unknown) {
      console.error("Error creating order type:", error);
      const message = error instanceof Error ? error.message : "Failed to create order type";
      toast.error(message);
      return null;
    }
  };

  const updateOrderType = async (id: string, updates: Partial<CreateOrderTypeData>) => {
    if (!canManage) {
      toast.error("You don't have permission to update order types");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("horse_order_types")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      toast.success("Order type updated successfully");
      fetchOrderTypes();
      return data;
    } catch (error: unknown) {
      console.error("Error updating order type:", error);
      const message = error instanceof Error ? error.message : "Failed to update order type";
      toast.error(message);
      return null;
    }
  };

  const deleteOrderType = async (id: string) => {
    if (!canManage) {
      toast.error("You don't have permission to delete order types");
      return false;
    }

    try {
      const { error } = await supabase
        .from("horse_order_types")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Order type deleted successfully");
      fetchOrderTypes();
      return true;
    } catch (error: unknown) {
      console.error("Error deleting order type:", error);
      const message = error instanceof Error ? error.message : "Failed to delete order type";
      toast.error(message);
      return false;
    }
  };

  // Get pinned tabs (max 6, sorted by sort_order)
  const pinnedTabs = orderTypes
    .filter((t) => t.is_active && t.pin_as_tab)
    .slice(0, 6);

  // Get remaining active types for "More" dropdown
  const moreTypes = orderTypes.filter(
    (t) => t.is_active && (!t.pin_as_tab || !pinnedTabs.includes(t))
  );

  // Get active types for selection
  const activeTypes = orderTypes.filter((t) => t.is_active);

  // Get unique categories
  const categories = [...new Set(orderTypes.map((t) => t.category).filter(Boolean))] as string[];

  return {
    orderTypes,
    pinnedTabs,
    moreTypes,
    activeTypes,
    categories,
    loading,
    canManage,
    createOrderType,
    updateOrderType,
    deleteOrderType,
    refresh: fetchOrderTypes,
  };
}
