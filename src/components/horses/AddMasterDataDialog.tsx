import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export type MasterDataType =
  | "color"
  | "breed"
  | "branch"
  | "stable"
  | "housing_unit"
  | "breeder"
  | "owner";

interface AddMasterDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: MasterDataType;
  onCreate: (data: Record<string, string>) => Promise<{ data: unknown; error: Error | null }>;
  onSuccess?: (data: unknown) => void;
}

const typeConfig: Record<MasterDataType, { title: string; fields: { key: string; label: string; required?: boolean }[] }> = {
  color: {
    title: "Add New Color",
    fields: [
      { key: "name", label: "Name (English)", required: true },
      { key: "name_ar", label: "Name (Arabic)" },
    ],
  },
  breed: {
    title: "Add New Breed",
    fields: [
      { key: "name", label: "Name (English)", required: true },
      { key: "name_ar", label: "Name (Arabic)" },
    ],
  },
  branch: {
    title: "Add New Branch",
    fields: [
      { key: "name", label: "Branch Name", required: true },
      { key: "address", label: "Address" },
    ],
  },
  stable: {
    title: "Add New Stable",
    fields: [{ key: "name", label: "Stable Name", required: true }],
  },
  housing_unit: {
    title: "Add New Housing Unit",
    fields: [
      { key: "code", label: "Unit Code (e.g., A1, Stall-5)", required: true },
      { key: "unit_type", label: "Type (stall/room/paddock)" },
    ],
  },
  breeder: {
    title: "Add New Breeder",
    fields: [
      { key: "name", label: "Name", required: true },
      { key: "name_ar", label: "Name (Arabic)" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
    ],
  },
  owner: {
    title: "Add New Owner",
    fields: [
      { key: "name", label: "Name", required: true },
      { key: "name_ar", label: "Name (Arabic)" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
    ],
  },
};

export const AddMasterDataDialog = ({
  open,
  onOpenChange,
  type,
  onCreate,
  onSuccess,
}: AddMasterDataDialogProps) => {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const config = typeConfig[type];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const requiredFields = config.fields.filter((f) => f.required);
    const missingFields = requiredFields.filter((f) => !formData[f.key]?.trim());
    
    if (missingFields.length > 0) {
      toast({
        title: "Missing required fields",
        description: `Please fill in: ${missingFields.map((f) => f.label).join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { data, error } = await onCreate(formData);
    setLoading(false);

    if (error) {
      toast({
        title: "Error creating item",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Created successfully",
      description: `${config.title.replace("Add New ", "")} has been added.`,
    });

    setFormData({});
    onOpenChange(false);
    onSuccess?.(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {config.fields.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={field.key}>
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              <Input
                id={field.key}
                value={formData[field.key] || ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))
                }
                placeholder={field.label}
              />
            </div>
          ))}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
