import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Invoice {
  id: string;
  tenant_id: string;
  invoice_number: string;
  client_id?: string;
  client_name?: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  issue_date: string;
  due_date?: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  entity_type?: string;
  entity_id?: string;
  created_at: string;
}

export interface CreateInvoiceInput {
  tenant_id: string;
  invoice_number: string;
  client_id?: string;
  client_name?: string;
  status?: string;
  issue_date?: string;
  due_date?: string;
  subtotal?: number;
  tax_amount?: number;
  discount_amount?: number;
  total_amount?: number;
  currency?: string;
  notes?: string;
}

export interface CreateInvoiceItemInput {
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  entity_type?: string;
  entity_id?: string;
}

export function useInvoices(tenantId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices", tenantId],
    queryFn: async (): Promise<Invoice[]> => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from("invoices" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (error) {
        if (error.code === "42P01") {
          console.warn("invoices table does not exist yet");
          return [];
        }
        console.error("Error fetching invoices:", error);
        return [];
      }

      return (data || []) as unknown as Invoice[];
    },
    enabled: !!tenantId,
  });

  const createInvoice = useMutation({
    mutationFn: async (input: CreateInvoiceInput) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("invoices" as any)
        .insert({
          ...input,
          created_by: user?.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as Invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices", tenantId] });
      toast({ title: "Invoice created successfully" });
    },
    onError: (error) => {
      console.error("Error creating invoice:", error);
      toast({ title: "Failed to create invoice", variant: "destructive" });
    },
  });

  const updateInvoice = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Invoice> & { id: string }) => {
      const { data, error } = await supabase
        .from("invoices" as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as Invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices", tenantId] });
      toast({ title: "Invoice updated successfully" });
    },
    onError: (error) => {
      console.error("Error updating invoice:", error);
      toast({ title: "Failed to update invoice", variant: "destructive" });
    },
  });

  const deleteInvoice = useMutation({
    mutationFn: async (invoiceId: string) => {
      const { error } = await supabase
        .from("invoices" as any)
        .delete()
        .eq("id", invoiceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices", tenantId] });
      toast({ title: "Invoice deleted successfully" });
    },
    onError: (error) => {
      console.error("Error deleting invoice:", error);
      toast({ title: "Failed to delete invoice", variant: "destructive" });
    },
  });

  return {
    invoices,
    isLoading,
    createInvoice: createInvoice.mutateAsync,
    updateInvoice: updateInvoice.mutateAsync,
    deleteInvoice: deleteInvoice.mutateAsync,
    isCreating: createInvoice.isPending,
    isUpdating: updateInvoice.isPending,
    isDeleting: deleteInvoice.isPending,
  };
}

export function useInvoiceItems(invoiceId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["invoice-items", invoiceId],
    queryFn: async (): Promise<InvoiceItem[]> => {
      if (!invoiceId) return [];

      const { data, error } = await supabase
        .from("invoice_items" as any)
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("created_at", { ascending: true });

      if (error) {
        if (error.code === "42P01") {
          console.warn("invoice_items table does not exist yet");
          return [];
        }
        console.error("Error fetching invoice items:", error);
        return [];
      }

      return (data || []) as unknown as InvoiceItem[];
    },
    enabled: !!invoiceId,
  });

  const createItem = useMutation({
    mutationFn: async (input: CreateInvoiceItemInput) => {
      const { data, error } = await supabase
        .from("invoice_items" as any)
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as InvoiceItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-items", invoiceId] });
    },
    onError: (error) => {
      console.error("Error creating invoice item:", error);
      toast({ title: "Failed to add item", variant: "destructive" });
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from("invoice_items" as any)
        .delete()
        .eq("id", itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-items", invoiceId] });
    },
    onError: (error) => {
      console.error("Error deleting invoice item:", error);
      toast({ title: "Failed to remove item", variant: "destructive" });
    },
  });

  return {
    items,
    isLoading,
    createItem: createItem.mutateAsync,
    deleteItem: deleteItem.mutateAsync,
  };
}
