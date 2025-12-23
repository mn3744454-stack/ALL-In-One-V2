import { useState, useEffect } from "react";
import { format, addWeeks, addMonths } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Repeat, Info } from "lucide-react";
import { useCreateSession, useUpdateSession, type AcademySession, type CreateSessionInput } from "@/hooks/useAcademySessions";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { SessionFormMode } from "./SessionsList";

interface SessionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session?: AcademySession;
  mode?: SessionFormMode;
}

type RepeatType = "none" | "weekly" | "monthly";

export const SessionFormDialog = ({
  open,
  onOpenChange,
  session,
  mode = "create",
}: SessionFormDialogProps) => {
  const isEditing = mode === "edit";
  const isDuplicating = mode === "duplicate";
  const createSession = useCreateSession();
  const updateSession = useUpdateSession();
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant.id;
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<CreateSessionInput>({
    title: "",
    description: "",
    location_text: "",
    start_at: "",
    end_at: "",
    capacity: 1,
    price_display: "",
    is_public: true,
    is_active: true,
  });

  // Recurring options
  const [repeatType, setRepeatType] = useState<RepeatType>("none");
  const [repeatCount, setRepeatCount] = useState(4);
  const [isCreatingRecurring, setIsCreatingRecurring] = useState(false);

  // Format date for datetime-local input
  const formatDateForInput = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return format(date, "yyyy-MM-dd'T'HH:mm");
  };

  // Reset form when dialog opens/closes or session changes
  useEffect(() => {
    if (open && session && (isEditing || isDuplicating)) {
      setFormData({
        title: isDuplicating ? `${session.title} (Copy)` : session.title,
        description: session.description || "",
        location_text: session.location_text || "",
        // Clear dates when duplicating
        start_at: isEditing ? formatDateForInput(session.start_at) : "",
        end_at: isEditing ? formatDateForInput(session.end_at) : "",
        capacity: session.capacity,
        price_display: session.price_display || "",
        is_public: session.is_public,
        is_active: session.is_active,
      });
      setRepeatType("none");
      setRepeatCount(4);
    } else if (open) {
      setFormData({
        title: "",
        description: "",
        location_text: "",
        start_at: "",
        end_at: "",
        capacity: 1,
        price_display: "",
        is_public: true,
        is_active: true,
      });
      setRepeatType("none");
      setRepeatCount(4);
    }
  }, [open, session, isEditing, isDuplicating]);

  const createRecurringSessions = async () => {
    if (!tenantId) throw new Error("No active tenant");
    
    const startDate = new Date(formData.start_at);
    const endDate = new Date(formData.end_at);
    const sessions = [];

    for (let i = 0; i < repeatCount; i++) {
      const sessionStart = repeatType === "weekly" 
        ? addWeeks(startDate, i) 
        : addMonths(startDate, i);
      const sessionEnd = repeatType === "weekly" 
        ? addWeeks(endDate, i) 
        : addMonths(endDate, i);

      sessions.push({
        tenant_id: tenantId,
        title: formData.title,
        description: formData.description || null,
        location_text: formData.location_text || null,
        start_at: sessionStart.toISOString(),
        end_at: sessionEnd.toISOString(),
        capacity: formData.capacity,
        price_display: formData.price_display || null,
        is_public: formData.is_public ?? true,
        is_active: formData.is_active ?? true,
      });
    }

    const { data, error } = await supabase
      .from("academy_sessions")
      .insert(sessions)
      .select();

    if (error) throw error;
    return data;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isEditing && session) {
        const payload = {
          ...formData,
          start_at: new Date(formData.start_at).toISOString(),
          end_at: new Date(formData.end_at).toISOString(),
        };
        await updateSession.mutateAsync({ id: session.id, ...payload });
      } else if (repeatType !== "none") {
        setIsCreatingRecurring(true);
        const created = await createRecurringSessions();
        queryClient.invalidateQueries({ queryKey: ["academy-sessions", tenantId] });
        toast.success(`${created.length} sessions created successfully`);
      } else {
        const payload = {
          ...formData,
          start_at: new Date(formData.start_at).toISOString(),
          end_at: new Date(formData.end_at).toISOString(),
        };
        await createSession.mutateAsync(payload);
      }

      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Failed to save session");
    } finally {
      setIsCreatingRecurring(false);
    }
  };

  const isPending = createSession.isPending || updateSession.isPending || isCreatingRecurring;

  const getDialogTitle = () => {
    if (isEditing) return "Edit Session";
    if (isDuplicating) return "Duplicate Session";
    return "Create New Session";
  };

  const getDialogDescription = () => {
    if (isEditing) return "Update the session details below";
    if (isDuplicating) return "Create a new session based on the existing one. Select new dates.";
    return "Fill in the details to create a new training session";
  };

  const getSubmitButtonText = () => {
    if (isEditing) return "Save Changes";
    if (repeatType !== "none") return `Create ${repeatCount} Sessions`;
    return "Create Session";
  };

  const maxRepeatCount = repeatType === "weekly" ? 12 : 6;
  const repeatLabel = repeatType === "weekly" ? "weeks" : "months";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-navy">
            {getDialogTitle()}
          </DialogTitle>
          <DialogDescription>
            {getDialogDescription()}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Beginner Riding Lesson"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the session..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Date/Time Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_at">Start Date & Time *</Label>
              <Input
                id="start_at"
                type="datetime-local"
                value={formData.start_at}
                onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_at">End Date & Time *</Label>
              <Input
                id="end_at"
                type="datetime-local"
                value={formData.end_at}
                onChange={(e) => setFormData({ ...formData, end_at: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Recurring Options - Only show when creating new sessions */}
          {!isEditing && (
            <div className="border border-border rounded-lg p-4 space-y-4 bg-muted/30">
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-gold" />
                <Label className="font-medium">Recurring Options</Label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="repeatType">Repeat</Label>
                  <Select value={repeatType} onValueChange={(v) => setRepeatType(v as RepeatType)}>
                    <SelectTrigger id="repeatType">
                      <SelectValue placeholder="No repeat" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No repeat</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {repeatType !== "none" && (
                  <div className="space-y-2">
                    <Label htmlFor="repeatCount">Number of {repeatLabel}</Label>
                    <Select 
                      value={repeatCount.toString()} 
                      onValueChange={(v) => setRepeatCount(parseInt(v))}
                    >
                      <SelectTrigger id="repeatCount">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: maxRepeatCount - 1 }, (_, i) => i + 2).map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            {num} {repeatLabel}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {repeatType !== "none" && (
                <div className="flex items-start gap-2 text-sm text-muted-foreground bg-background p-3 rounded-md">
                  <Info className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    This will create {repeatCount} sessions: the first one on the selected date, 
                    then one every {repeatType === "weekly" ? "week" : "month"} for {repeatCount - 1} more {repeatLabel}.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Capacity & Price Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity *</Label>
              <Input
                id="capacity"
                type="number"
                min={1}
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price_display">Price (display only)</Label>
              <Input
                id="price_display"
                placeholder="e.g., 200 SAR"
                value={formData.price_display}
                onChange={(e) => setFormData({ ...formData, price_display: e.target.value })}
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location_text">Location</Label>
            <Input
              id="location_text"
              placeholder="e.g., Main Arena"
              value={formData.location_text}
              onChange={(e) => setFormData({ ...formData, location_text: e.target.value })}
            />
          </div>

          {/* Toggles */}
          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <div className="flex items-center justify-between sm:justify-start gap-3">
              <Label htmlFor="is_public" className="cursor-pointer">
                Public
              </Label>
              <Switch
                id="is_public"
                checked={formData.is_public}
                onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
              />
            </div>
            <div className="flex items-center justify-between sm:justify-start gap-3">
              <Label htmlFor="is_active" className="cursor-pointer">
                Active
              </Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="gold"
              disabled={isPending}
              className="w-full sm:w-auto"
            >
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {getSubmitButtonText()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
