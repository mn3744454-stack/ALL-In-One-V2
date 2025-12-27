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
import { useSemenInventory, CreateSemenBatchData } from "@/hooks/breeding/useSemenInventory";

interface CreateSemenBatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateSemenBatchDialog({
  open,
  onOpenChange,
}: CreateSemenBatchDialogProps) {
  const { horses } = useHorses();
  const { tanks, createBatch } = useSemenInventory();
  const [loading, setLoading] = useState(false);

  const [stallionId, setStallionId] = useState("");
  const [tankId, setTankId] = useState("");
  const [collectionDate, setCollectionDate] = useState<Date | undefined>(new Date());
  const [type, setType] = useState<CreateSemenBatchData["type"]>("frozen");
  const [dosesTotal, setDosesTotal] = useState("1");
  const [dosesAvailable, setDosesAvailable] = useState("1");
  const [qualityNotes, setQualityNotes] = useState("");

  const stallions = horses.filter(h => h.gender === "stallion" || h.gender === "male");

  const resetForm = () => {
    setStallionId("");
    setTankId("");
    setCollectionDate(new Date());
    setType("frozen");
    setDosesTotal("1");
    setDosesAvailable("1");
    setQualityNotes("");
  };

  const handleDosesTotalChange = (value: string) => {
    setDosesTotal(value);
    setDosesAvailable(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stallionId || !collectionDate) return;

    setLoading(true);
    try {
      await createBatch({
        stallion_id: stallionId,
        tank_id: tankId || null,
        collection_date: format(collectionDate, "yyyy-MM-dd"),
        type,
        doses_total: parseInt(dosesTotal) || 1,
        doses_available: parseInt(dosesAvailable) || 1,
        quality_notes: qualityNotes || null,
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
          <DialogTitle className="text-xl font-display">Add Semen Batch</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Stallion *</Label>
                <Select value={stallionId} onValueChange={setStallionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select stallion" />
                  </SelectTrigger>
                  <SelectContent className="z-[200]">
                    {stallions.map((stallion) => (
                      <SelectItem key={stallion.id} value={stallion.id}>
                        {stallion.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Storage Tank</Label>
                <Select value={tankId} onValueChange={setTankId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tank (optional)" />
                  </SelectTrigger>
                  <SelectContent className="z-[200]">
                    <SelectItem value="">No tank</SelectItem>
                    {tanks.map((tank) => (
                      <SelectItem key={tank.id} value={tank.id}>
                        {tank.name} {tank.location && `(${tank.location})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Collection Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !collectionDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {collectionDate ? format(collectionDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[200]" align="start">
                    <Calendar
                      mode="single"
                      selected={collectionDate}
                      onSelect={setCollectionDate}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select value={type} onValueChange={(v) => setType(v as CreateSemenBatchData["type"])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[200]">
                    <SelectItem value="fresh">Fresh</SelectItem>
                    <SelectItem value="frozen">Frozen</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Total Doses *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={dosesTotal}
                    onChange={(e) => handleDosesTotalChange(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Available Doses</Label>
                  <Input
                    type="number"
                    min="0"
                    max={dosesTotal}
                    value={dosesAvailable}
                    onChange={(e) => setDosesAvailable(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Full Width Notes */}
          <div className="space-y-2">
            <Label>Quality Notes</Label>
            <Textarea
              value={qualityNotes}
              onChange={(e) => setQualityNotes(e.target.value)}
              placeholder="Motility, concentration, morphology, etc..."
              rows={4}
            />
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading || !stallionId || !collectionDate}>
              {loading ? "Creating..." : "Create Batch"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
