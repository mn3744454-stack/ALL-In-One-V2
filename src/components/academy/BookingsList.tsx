import { useState } from "react";
import { Loader2, Calendar, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTenantBookings, useUpdateBookingStatus, type BookingWithUser } from "@/hooks/useAcademyBookings";
import { BookingCard } from "./BookingCard";

type StatusFilter = "all" | "pending" | "confirmed" | "rejected" | "cancelled";

export const BookingsList = () => {
  const { data: bookings = [], isLoading } = useTenantBookings();
  const updateStatus = useUpdateBookingStatus();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filteredBookings = statusFilter === "all"
    ? bookings
    : bookings.filter((b) => b.status === statusFilter);

  const handleConfirm = async (bookingId: string) => {
    await updateStatus.mutateAsync({ bookingId, status: "confirmed" });
  };

  const handleReject = async (bookingId: string) => {
    await updateStatus.mutateAsync({ bookingId, status: "rejected" });
  };

  const handleCancel = async (bookingId: string) => {
    await updateStatus.mutateAsync({ bookingId, status: "cancelled" });
  };

  if (isLoading) {
    return (
      <div className="py-12 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-gold mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-navy">Bookings</h2>
          <p className="text-sm text-muted-foreground">
            Manage booking requests for your sessions
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as StatusFilter)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Bookings</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-border rounded-xl">
          <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-semibold text-navy mb-2">No Bookings</h3>
          <p className="text-sm text-muted-foreground">
            {statusFilter === "all"
              ? "No booking requests yet"
              : `No ${statusFilter} bookings`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredBookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onConfirm={() => handleConfirm(booking.id)}
              onReject={() => handleReject(booking.id)}
              onCancel={() => handleCancel(booking.id)}
              isUpdating={updateStatus.isPending}
            />
          ))}
        </div>
      )}

      {/* Summary */}
      {bookings.length > 0 && (
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground pt-4 border-t border-border">
          <span>
            <strong className="text-navy">{bookings.filter(b => b.status === "pending").length}</strong> pending
          </span>
          <span>
            <strong className="text-navy">{bookings.filter(b => b.status === "confirmed").length}</strong> confirmed
          </span>
          <span>
            <strong className="text-navy">{bookings.filter(b => b.status === "rejected").length}</strong> rejected
          </span>
          <span>
            <strong className="text-navy">{bookings.filter(b => b.status === "cancelled").length}</strong> cancelled
          </span>
        </div>
      )}
    </div>
  );
};
