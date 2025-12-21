import { useState } from "react";
import { useHorses } from "@/hooks/useHorses";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus, Heart } from "lucide-react";
import { toast } from "sonner";

interface AddHorseDialogProps {
  trigger?: React.ReactNode;
}

export const AddHorseDialog = ({ trigger }: AddHorseDialogProps) => {
  const { createHorse } = useHorses();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    gender: "" as "male" | "female" | "",
    breed: "",
    color: "",
    birth_date: "",
    registration_number: "",
    microchip_number: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.gender) {
      toast.error("Please fill in required fields");
      return;
    }

    setLoading(true);
    
    const { error } = await createHorse({
      name: formData.name,
      gender: formData.gender as "male" | "female",
      breed: formData.breed || undefined,
      color: formData.color || undefined,
      birth_date: formData.birth_date || undefined,
      registration_number: formData.registration_number || undefined,
      microchip_number: formData.microchip_number || undefined,
      notes: formData.notes || undefined,
    });

    setLoading(false);

    if (error) {
      toast.error("Failed to add horse");
    } else {
      toast.success(`${formData.name} has been added!`);
      setOpen(false);
      setFormData({
        name: "",
        gender: "",
        breed: "",
        color: "",
        birth_date: "",
        registration_number: "",
        microchip_number: "",
        notes: "",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="gold" size="icon" className="sm:w-auto sm:px-3 sm:gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Horse</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-gold" />
            Add New Horse
          </DialogTitle>
          <DialogDescription>
            Create a profile for a new horse in your stable
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="Horse name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label>Gender *</Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => setFormData({ ...formData, gender: value as "male" | "female" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male (Stallion)</SelectItem>
                  <SelectItem value="female">Female (Mare)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="breed">Breed</Label>
              <Input
                id="breed"
                placeholder="e.g., Arabian"
                value={formData.breed}
                onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                placeholder="e.g., Bay"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="birth_date">Date of Birth</Label>
            <Input
              id="birth_date"
              type="date"
              value={formData.birth_date}
              onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="registration_number">Registration Number</Label>
              <Input
                id="registration_number"
                placeholder="Optional"
                value={formData.registration_number}
                onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="microchip_number">Microchip Number</Label>
              <Input
                id="microchip_number"
                placeholder="Optional"
                value={formData.microchip_number}
                onChange={(e) => setFormData({ ...formData, microchip_number: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes about this horse..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="gold" disabled={loading}>
              {loading ? "Adding..." : "Add Horse"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
