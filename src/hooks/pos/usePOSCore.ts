import { useState, useCallback, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { postLedgerForInvoice } from "@/lib/finance/postLedgerForInvoice";

export interface POSCartItem {
  id: string;
  name: string;
  name_ar?: string | null;
  unit_price: number;
  quantity: number;
  total_price: number;
  service_id?: string;
  entity_type?: string;
  entity_id?: string;
}

export type PaymentMethod = "cash" | "card" | "transfer" | "debt";

interface CreatePOSSaleInput {
  tenant_id: string;
  branch_id?: string | null;
  pos_session_id: string;
  client_id?: string | null;
  client_name?: string;
  payment_method: PaymentMethod;
  discount_amount?: number;
  notes?: string;
}

export function usePOSCore() {
  const [cart, setCart] = useState<POSCartItem[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedClientName, setSelectedClientName] = useState<string>("");
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Cart operations
  const addItem = useCallback((item: Omit<POSCartItem, "quantity" | "total_price"> & { quantity?: number }) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id
            ? { ...i, quantity: i.quantity + (item.quantity || 1), total_price: i.unit_price * (i.quantity + (item.quantity || 1)) }
            : i
        );
      }
      const qty = item.quantity || 1;
      return [...prev, { ...item, quantity: qty, total_price: item.unit_price * qty }];
    });
  }, []);

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((i) => i.id !== itemId));
    } else {
      setCart((prev) =>
        prev.map((i) =>
          i.id === itemId
            ? { ...i, quantity, total_price: i.unit_price * quantity }
            : i
        )
      );
    }
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setCart((prev) => prev.filter((i) => i.id !== itemId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setSelectedClientId(null);
    setSelectedClientName("");
    setDiscountAmount(0);
  }, []);

  // Totals calculation
  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.total_price, 0);
    const taxAmount = 0; // VAT to be implemented later
    const total = subtotal - discountAmount + taxAmount;
    return {
      subtotal,
      discountAmount,
      taxAmount,
      total: Math.max(0, total),
      itemCount: cart.reduce((sum, item) => sum + item.quantity, 0),
    };
  }, [cart, discountAmount]);

  // Create POS Sale (Invoice-first approach)
  const createSaleMutation = useMutation({
    mutationFn: async (input: CreatePOSSaleInput) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user?.id) throw new Error("Not authenticated");

      // Get sale index for this session
      const { count, error: countError } = await supabase
        .from("invoices")
        .select("*", { count: "exact", head: true })
        .eq("pos_session_id", input.pos_session_id);

      if (countError) throw countError;

      const saleIndex = ((count || 0) + 1).toString().padStart(4, "0");
      const traceability = `[POS:${input.pos_session_id.slice(0, 8)}:${saleIndex}]`;

      // Generate invoice number
      const invoiceNumber = `POS-${Date.now().toString(36).toUpperCase()}`;

      // Create invoice
      const { data: invoice, error: invError } = await supabase
        .from("invoices")
        .insert({
          tenant_id: input.tenant_id,
          invoice_number: invoiceNumber,
          client_id: input.client_id || null,
          client_name: input.client_name || "Walk-in Customer",
          subtotal: totals.subtotal,
          tax_amount: totals.taxAmount,
          discount_amount: input.discount_amount || 0,
          total_amount: totals.total,
          status: "issued",
          issue_date: new Date().toISOString().split("T")[0],
          due_date: new Date().toISOString().split("T")[0],
          notes: `${traceability}${input.notes ? " " + input.notes : ""}`,
          pos_session_id: input.pos_session_id,
          branch_id: input.branch_id || null,
          payment_method: input.payment_method,
          payment_received_at: input.payment_method !== "debt" ? new Date().toISOString() : null,
          created_by: user.user.id,
        })
        .select()
        .single();

      if (invError) throw invError;

      // Create invoice items
      const invoiceItems = cart.map((item) => ({
        invoice_id: invoice.id,
        description: `${item.name}${item.name_ar ? ` / ${item.name_ar}` : ""}`,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        entity_type: item.entity_type || "pos_sale",
        entity_id: item.entity_id || input.pos_session_id,
      }));

      const { error: itemsError } = await supabase
        .from("invoice_items")
        .insert(invoiceItems);

      if (itemsError) throw itemsError;

      // Post to ledger if client exists
      if (input.client_id) {
        await postLedgerForInvoice(invoice.id, input.tenant_id);
      }

      return invoice;
    },
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["pos-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["ledger-entries"] });
      queryClient.invalidateQueries({ queryKey: ["customer-balances"] });
      clearCart();
      toast({ title: "Sale completed successfully" });
      return invoice;
    },
    onError: (error: Error) => {
      console.error("Error creating sale:", error);
      toast({ title: "Failed to complete sale", description: error.message, variant: "destructive" });
    },
  });

  return {
    // Cart state
    cart,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    
    // Client selection
    selectedClientId,
    selectedClientName,
    setSelectedClientId,
    setSelectedClientName,
    selectClient: (id: string | null, name: string) => {
      setSelectedClientId(id);
      setSelectedClientName(name);
    },
    
    // Discount
    discountAmount,
    setDiscountAmount,
    
    // Totals
    totals,
    
    // Sale creation
    createSale: createSaleMutation.mutateAsync,
    isCreatingSale: createSaleMutation.isPending,
    lastCreatedInvoice: createSaleMutation.data,
  };
}
