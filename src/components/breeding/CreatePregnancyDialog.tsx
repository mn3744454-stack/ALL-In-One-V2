import { useState } from "react";
import { format, addMonths } from "date-fns";
import { CalendarIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { usePregnancies, CreatePregnancyData } from "@/hooks/breeding/usePregnancies";

interface CreatePregnancyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePregnancyDialog({
  open,
  onOpenChange,
}: CreatePregnancyDialogProps) {
  const { horses } = useHorses();
  const { createPregnancy } = usePregnancies();
  const [loading, setLoading] = useState(false);

  const [mareId, setMareId] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [expectedDueDate, setExpectedDueDate] = useState<Date | undefined>();
  const [notes, setNotes] = useState("");

  const mares = horses.filter(h => h.gender === "mare" || h.gender === "female");

  const resetForm = () => {
    setMareId("");
    setStartDate(new Date());
    setExpectedDueDate(undefined);
    setNotes("");
  };

  const handleMareSelect = (id: string) => {
    setMareId(id);
    // Auto-calculate expected due date (11 months for horses)
    if (startDate) {
      setExpectedDueDate(addMonths(startDate, 11));
    }
  };

  const handleStartDateChange = (date: Date | undefined) => {
    setStartDate(date);
    if (date) {
      setExpectedDueDate(addMonths(date, 11));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mareId || !startDate) return;

    setLoading(true);
    try {
      await createPregnancy({
        mare_id: mareId,
        start_date: format(startDate, "yyyy-MM-dd"),
        expected_due_date: expectedDueDate ? format(expectedDueDate, "yyyy-MM-dd") : null,
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
          <DialogTitle>Add Pregnancy Record</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Mare *</Label>
            <Select value={mareId} onValueChange={handleMareSelect}>
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
            <Label>Start Date (Conception) *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={handleStartDateChange}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Expected Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !expectedDueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {expectedDueDate ? format(expectedDueDate, "PPP") : <span>Auto-calculated (~11 months)</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={expectedDueDate}
                  onSelect={setExpectedDueDate}
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
            <Button type="submit" className="flex-1" disabled={loading || !mareId || !startDate}>
              {loading ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
