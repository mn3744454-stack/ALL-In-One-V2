import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useHorses } from "@/hooks/useHorses";
import { useBreedingAttempts, CreateBreedingAttemptData } from "@/hooks/breeding/useBreedingAttempts";

interface CreateBreedingAttemptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateBreedingAttemptDialog({
  open,
  onOpenChange,
}: CreateBreedingAttemptDialogProps) {
  const { horses } = useHorses();
  const { createAttempt } = useBreedingAttempts();
  const [loading, setLoading] = useState(false);

  const [mareId, setMareId] = useState("");
  const [stallionId, setStallionId] = useState("");
  const [externalStallionName, setExternalStallionName] = useState("");
  const [attemptType, setAttemptType] = useState<CreateBreedingAttemptData["attempt_type"]>("natural");
  const [attemptDate, setAttemptDate] = useState<Date | undefined>(new Date());
  const [notes, setNotes] = useState("");
  const [useExternalStallion, setUseExternalStallion] = useState(false);

  const mares = horses.filter(h => h.gender === "mare" || h.gender === "female");
  const stallions = horses.filter(h => h.gender === "stallion" || h.gender === "male");

  const resetForm = () => {
    setMareId("");
    setStallionId("");
    setExternalStallionName("");
    setAttemptType("natural");
    setAttemptDate(new Date());
    setNotes("");
    setUseExternalStallion(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mareId || !attemptDate) return;

    setLoading(true);
    try {
      await createAttempt({
        mare_id: mareId,
        stallion_id: useExternalStallion ? null : stallionId || null,
        external_stallion_name: useExternalStallion ? externalStallionName : null,
        attempt_type: attemptType,
        attempt_date: format(attemptDate, "yyyy-MM-dd"),
        notes: notes || null,
      });
      resetForm();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Breeding Attempt</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Mare *</Label>
            <Select value={mareId} onValueChange={setMareId}>
              <SelectTrigger>
                <SelectValue placeholder="Select mare" />
              </SelectTrigger>
              <SelectContent>
                {mares.map((mare) => (
                  <SelectItem key={mare.id} value={mare.id}>
                    {mare.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="useExternal"
                checked={useExternalStallion}
                onChange={(e) => setUseExternalStallion(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="useExternal" className="text-sm">Use external stallion</Label>
            </div>
          </div>

          {useExternalStallion ? (
            <div className="space-y-2">
              <Label>External Stallion Name</Label>
              <Input
                value={externalStallionName}
                onChange={(e) => setExternalStallionName(e.target.value)}
                placeholder="Enter stallion name"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Stallion</Label>
              <Select value={stallionId} onValueChange={setStallionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select stallion" />
                </SelectTrigger>
                <SelectContent>
                  {stallions.map((stallion) => (
                    <SelectItem key={stallion.id} value={stallion.id}>
                      {stallion.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Attempt Type *</Label>
            <Select value={attemptType} onValueChange={(v) => setAttemptType(v as CreateBreedingAttemptData["attempt_type"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="natural">Natural</SelectItem>
                <SelectItem value="ai_fresh">AI (Fresh)</SelectItem>
                <SelectItem value="ai_frozen">AI (Frozen)</SelectItem>
                <SelectItem value="embryo_transfer">Embryo Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Attempt Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !attemptDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {attemptDate ? format(attemptDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={attemptDate}
                  onSelect={setAttemptDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading || !mareId || !attemptDate}>
              {loading ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
