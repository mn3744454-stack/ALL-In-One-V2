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
import { useEmbryoTransfers, CreateEmbryoTransferData } from "@/hooks/breeding/useEmbryoTransfers";

interface CreateEmbryoTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateEmbryoTransferDialog({
  open,
  onOpenChange,
}: CreateEmbryoTransferDialogProps) {
  const { horses } = useHorses();
  const { createTransfer } = useEmbryoTransfers();
  const [loading, setLoading] = useState(false);

  const [donorMareId, setDonorMareId] = useState("");
  const [recipientMareId, setRecipientMareId] = useState("");
  const [flushDate, setFlushDate] = useState<Date | undefined>();
  const [transferDate, setTransferDate] = useState<Date | undefined>();
  const [embryoGrade, setEmbryoGrade] = useState("");
  const [embryoCount, setEmbryoCount] = useState("1");
  const [notes, setNotes] = useState("");

  const mares = horses.filter(h => h.gender === "mare" || h.gender === "female");

  const resetForm = () => {
    setDonorMareId("");
    setRecipientMareId("");
    setFlushDate(undefined);
    setTransferDate(undefined);
    setEmbryoGrade("");
    setEmbryoCount("1");
    setNotes("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!donorMareId || !recipientMareId) return;

    setLoading(true);
    try {
      await createTransfer({
        donor_mare_id: donorMareId,
        recipient_mare_id: recipientMareId,
        flush_date: flushDate ? format(flushDate, "yyyy-MM-dd") : null,
        transfer_date: transferDate ? format(transferDate, "yyyy-MM-dd") : null,
        embryo_grade: embryoGrade || null,
        embryo_count: parseInt(embryoCount) || 1,
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
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">Add Embryo Transfer</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column - Mare Selection */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Donor Mare *</Label>
                <Select value={donorMareId} onValueChange={setDonorMareId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select donor mare" />
                  </SelectTrigger>
                  <SelectContent className="z-[200]">
                    {mares.map((mare) => (
                      <SelectItem key={mare.id} value={mare.id}>
                        {mare.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Recipient Mare *</Label>
                <Select value={recipientMareId} onValueChange={setRecipientMareId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select recipient mare" />
                  </SelectTrigger>
                  <SelectContent className="z-[200]">
                    {mares.filter(m => m.id !== donorMareId).map((mare) => (
                      <SelectItem key={mare.id} value={mare.id}>
                        {mare.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Right Column - Dates */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Flush Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !flushDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {flushDate ? format(flushDate, "PPP") : <span>Select flush date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[200]" align="start">
                    <Calendar
                      mode="single"
                      selected={flushDate}
                      onSelect={setFlushDate}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Transfer Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !transferDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {transferDate ? format(transferDate, "PPP") : <span>Select transfer date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[200]" align="start">
                    <Calendar
                      mode="single"
                      selected={transferDate}
                      onSelect={setTransferDate}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Embryo Details Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Embryo Grade</Label>
              <Select value={embryoGrade} onValueChange={setEmbryoGrade}>
                <SelectTrigger>
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Embryo Count</Label>
              <Input
                type="number"
                min="1"
                value={embryoCount}
                onChange={(e) => setEmbryoCount(e.target.value)}
              />
            </div>
          </div>

          {/* Full Width Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this embryo transfer..."
              rows={4}
            />
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading || !donorMareId || !recipientMareId}>
              {loading ? "Creating..." : "Create Transfer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
