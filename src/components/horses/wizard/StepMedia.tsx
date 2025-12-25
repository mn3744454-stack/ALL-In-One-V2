import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Link, Image } from "lucide-react";
import type { HorseWizardData } from "../HorseWizard";

interface StepMediaProps {
  data: HorseWizardData;
  onChange: (updates: Partial<HorseWizardData>) => void;
}

export const StepMedia = ({ data, onChange }: StepMediaProps) => {
  const addImageUrl = () => {
    onChange({ images: [...data.images, ""] });
  };

  const updateImageUrl = (index: number, value: string) => {
    const newImages = [...data.images];
    newImages[index] = value;
    onChange({ images: newImages });
  };

  const removeImageUrl = (index: number) => {
    onChange({ images: data.images.filter((_, i) => i !== index) });
  };

  const addLink = () => {
    onChange({ external_links: [...data.external_links, ""] });
  };

  const updateLink = (index: number, value: string) => {
    const newLinks = [...data.external_links];
    newLinks[index] = value;
    onChange({ external_links: newLinks });
  };

  const removeLink = (index: number) => {
    onChange({ external_links: data.external_links.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <Label className="text-base">Images</Label>
            <p className="text-sm text-muted-foreground">Add image URLs for this horse</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addImageUrl} className="gap-2">
            <Plus className="w-4 h-4" /> Add Image
          </Button>
        </div>

        {data.images.length === 0 ? (
          <div className="border-2 border-dashed rounded-xl p-8 text-center text-muted-foreground">
            <Image className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No images added yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.images.map((url, index) => (
              <div key={index} className="flex gap-2">
                <Input value={url} onChange={(e) => updateImageUrl(index, e.target.value)} placeholder="https://example.com/image.jpg" />
                <Button type="button" variant="ghost" size="icon" onClick={() => removeImageUrl(index)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <Label className="text-base">External Links</Label>
            <p className="text-sm text-muted-foreground">Add related links</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addLink} className="gap-2">
            <Plus className="w-4 h-4" /> Add Link
          </Button>
        </div>

        {data.external_links.length === 0 ? (
          <div className="border-2 border-dashed rounded-xl p-8 text-center text-muted-foreground">
            <Link className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No links added yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.external_links.map((url, index) => (
              <div key={index} className="flex gap-2">
                <Input value={url} onChange={(e) => updateLink(index, e.target.value)} placeholder="https://example.com" />
                <Button type="button" variant="ghost" size="icon" onClick={() => removeLink(index)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
