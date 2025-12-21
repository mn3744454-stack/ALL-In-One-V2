import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface AcademyBooking {
  id: string;
  tenant_id: string;
  session_id: string;
  user_id: string;
  status: "pending" | "confirmed" | "rejected" | "cancelled";
  notes: string | null;
  created_at: string;
}

export interface BookingWithSession extends AcademyBooking {
  session: {
    id: string;
    title: string;
    start_at: string;
    end_at: string;
    location_text: string | null;
    price_display: string | null;
  };
  tenant: {
    id: string;
    name: string;
    slug: string | null;
  };
}

export interface BookingWithUser extends AcademyBooking {
  profile: {
    id: string;
    full_name: string | null;
    email: string;
  };
  session: {
    id: string;
    title: string;
    start_at: string;
    end_at: string;
    capacity: number;
  };
}

export interface CreateBookingInput {
  session_id: string;
  tenant_id: string;
  notes?: string;
}

// Fetch current user's bookings
export const useMyBookings = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-bookings", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("academy_bookings")
        .select(`
          *,
          session:academy_sessions(id, title, start_at, end_at, location_text, price_display),
          tenant:tenants(id, name, slug)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as BookingWithSession[];
    },
    enabled: !!user?.id,
  });
};

// Fetch all bookings for the active tenant (for management)
export const useTenantBookings = () => {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant.id;

  return useQuery({
    queryKey: ["tenant-bookings", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      // Fetch bookings with session info
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("academy_bookings")
        .select(`
          *,
          session:academy_sessions(id, title, start_at, end_at, capacity)
        `)
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (bookingsError) throw bookingsError;
      if (!bookingsData || bookingsData.length === 0) return [];

      // Get unique user IDs and fetch profiles separately
      const userIds = [...new Set(bookingsData.map(b => b.user_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Create a map for quick lookup
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      // Combine the data
      return bookingsData.map(booking => ({
        ...booking,
        profile: profilesMap.get(booking.user_id) || { id: booking.user_id, full_name: null, email: "Unknown" },
      })) as BookingWithUser[];
    },
    enabled: !!tenantId,
  });
};

// Fetch bookings for a specific session
export const useSessionBookings = (sessionId: string | undefined) => {
  return useQuery({
    queryKey: ["session-bookings", sessionId],
    queryFn: async () => {
      if (!sessionId) return [];

      const { data, error } = await supabase
        .from("academy_bookings")
        .select("*")
        .eq("session_id", sessionId)
        .in("status", ["pending", "confirmed"]);

      if (error) throw error;
      return data as AcademyBooking[];
    },
    enabled: !!sessionId,
  });
};

// Get confirmed booking count for a session
export const useSessionConfirmedCount = (sessionId: string | undefined) => {
  return useQuery({
    queryKey: ["session-confirmed-count", sessionId],
    queryFn: async () => {
      if (!sessionId) return 0;

      const { count, error } = await supabase
        .from("academy_bookings")
        .select("*", { count: "exact", head: true })
        .eq("session_id", sessionId)
        .eq("status", "confirmed");

      if (error) throw error;
      return count || 0;
    },
    enabled: !!sessionId,
  });
};

// Create a new booking
export const useCreateBooking = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateBookingInput) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("academy_bookings")
        .insert({
          session_id: input.session_id,
          tenant_id: input.tenant_id,
          user_id: user.id,
          notes: input.notes || null,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["session-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["session-confirmed-count"] });
      toast.success("Booking request submitted successfully");
    },
    onError: (error) => {
      console.error("Error creating booking:", error);
      toast.error("Failed to submit booking request");
    },
  });
};

// Cancel user's own booking
export const useCancelBooking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingId: string) => {
      const { data, error } = await supabase
        .from("academy_bookings")
        .update({ status: "cancelled" })
        .eq("id", bookingId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["session-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["session-confirmed-count"] });
      toast.success("Booking cancelled successfully");
    },
    onError: (error) => {
      console.error("Error cancelling booking:", error);
      toast.error("Failed to cancel booking");
    },
  });
};

// Update booking status (for tenant owner/manager)
export const useUpdateBookingStatus = () => {
  const queryClient = useQueryClient();
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant.id;

  return useMutation({
    mutationFn: async ({ 
      bookingId, 
      status 
    }: { 
      bookingId: string; 
      status: "confirmed" | "rejected" | "cancelled";
    }) => {
      const { data, error } = await supabase
        .from("academy_bookings")
        .update({ status })
        .eq("id", bookingId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tenant-bookings", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["session-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["session-confirmed-count"] });
      
      const statusMessages = {
        confirmed: "Booking confirmed",
        rejected: "Booking rejected",
        cancelled: "Booking cancelled",
      };
      toast.success(statusMessages[data.status as keyof typeof statusMessages]);
    },
    onError: (error) => {
      console.error("Error updating booking status:", error);
      toast.error("Failed to update booking status");
    },
  });
};
