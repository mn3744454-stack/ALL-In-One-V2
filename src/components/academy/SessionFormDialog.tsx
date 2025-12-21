import { useState, useEffect } from "react";
import { format } from "date-fns";
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
import { Loader2 } from "lucide-react";
import { useCreateSession, useUpdateSession, type AcademySession, type CreateSessionInput } from "@/hooks/useAcademySessions";

interface SessionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session?: AcademySession;
}

export const SessionFormDialog = ({
  open,
  onOpenChange,
  session,
}: SessionFormDialogProps) => {
  const isEditing = !!session;
  const createSession = useCreateSession();
  const updateSession = useUpdateSession();

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

  // Format date for datetime-local input
  const formatDateForInput = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return format(date, "yyyy-MM-dd'T'HH:mm");
  };

  // Reset form when dialog opens/closes or session changes
  useEffect(() => {
    if (open && session) {
      setFormData({
        title: session.title,
        description: session.description || "",
        location_text: session.location_text || "",
        start_at: formatDateForInput(session.start_at),
        end_at: formatDateForInput(session.end_at),
        capacity: session.capacity,
        price_display: session.price_display || "",
        is_public: session.is_public,
        is_active: session.is_active,
      });
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
    }
  }, [open, session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      ...formData,
      start_at: new Date(formData.start_at).toISOString(),
      end_at: new Date(formData.end_at).toISOString(),
    };

    if (isEditing && session) {
      await updateSession.mutateAsync({ id: session.id, ...payload });
    } else {
      await createSession.mutateAsync(payload);
    }

    onOpenChange(false);
  };

  const isPending = createSession.isPending || updateSession.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-navy">
            {isEditing ? "Edit Session" : "Create New Session"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the session details below"
              : "Fill in the details to create a new training session"}
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
              {isEditing ? "Save Changes" : "Create Session"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
