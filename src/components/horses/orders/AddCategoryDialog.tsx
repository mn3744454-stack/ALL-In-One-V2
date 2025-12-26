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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCustomFinancialCategories, CreateCustomCategoryData } from "@/hooks/useCustomFinancialCategories";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultIsIncome?: boolean;
  onCategoryAdded?: () => void;
}

export function AddCategoryDialog({
  open,
  onOpenChange,
  defaultIsIncome = false,
  onCategoryAdded,
}: AddCategoryDialogProps) {
  const { createCategory, getMainCategories } = useCustomFinancialCategories();
  const [loading, setLoading] = useState(false);
  
  const [isIncome, setIsIncome] = useState(defaultIsIncome);
  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [description, setDescription] = useState("");
  const [isSubCategory, setIsSubCategory] = useState(false);
  const [parentId, setParentId] = useState<string | null>(null);
  const [accountCode, setAccountCode] = useState("");

  const parentCategories = getMainCategories(isIncome ? 'income' : 'expense');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Category name is required");
      return;
    }

    setLoading(true);
    try {
      const data: CreateCustomCategoryData = {
        name: name.trim(),
        name_ar: nameAr.trim() || undefined,
        description: description.trim() || undefined,
        category_type: isIncome ? 'income' : 'expense',
        parent_id: isSubCategory ? parentId : null,
        account_code: accountCode.trim() || undefined,
      };

      await createCategory(data);
      toast.success("Category added successfully");
      
      // Reset form
      setName("");
      setNameAr("");
      setDescription("");
      setIsSubCategory(false);
      setParentId(null);
      setAccountCode("");
      
      onCategoryAdded?.();
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to add category");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Financial Category</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Account Type Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
            <Label className="font-medium">Account Type</Label>
            <div className="flex items-center gap-2">
              <span className={cn("text-sm", !isIncome && "text-red-500 font-medium")}>
                Expense
              </span>
              <Switch
                checked={isIncome}
                onCheckedChange={(checked) => {
                  setIsIncome(checked);
                  setParentId(null);
                }}
                className={cn(
                  "transition-colors duration-200",
                  isIncome 
                    ? "data-[state=checked]:bg-emerald-500" 
                    : "data-[state=unchecked]:bg-red-500"
                )}
              />
              <span className={cn("text-sm", isIncome && "text-emerald-500 font-medium")}>
                Income
              </span>
            </div>
          </div>

          {/* Category Name */}
          <div className="space-y-2">
            <Label>Category Name (English) *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Equipment Rental"
              required
            />
          </div>

          {/* Category Name Arabic */}
          <div className="space-y-2">
            <Label>Category Name (Arabic)</Label>
            <Input
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              placeholder="e.g., تأجير معدات"
              dir="rtl"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={2}
            />
          </div>

          {/* Hierarchy Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div>
              <Label className="font-medium">Sub-category</Label>
              <p className="text-xs text-muted-foreground">
                Make this a child of another category
              </p>
            </div>
            <Switch
              checked={isSubCategory}
              onCheckedChange={setIsSubCategory}
            />
          </div>

          {/* Parent Category (if sub-category) */}
          {isSubCategory && (
            <div className="space-y-2">
              <Label>Parent Category</Label>
              <Select value={parentId || ""} onValueChange={setParentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select parent category" />
                </SelectTrigger>
                <SelectContent>
                  {parentCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {parentCategories.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No main categories available. Create a main category first.
                </p>
              )}
            </div>
          )}

          {/* Account Code */}
          <div className="space-y-2">
            <Label>Account Code</Label>
            <Input
              value={accountCode}
              onChange={(e) => setAccountCode(e.target.value)}
              placeholder="e.g., 4300"
              dir="ltr"
              className="text-left"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Category
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}