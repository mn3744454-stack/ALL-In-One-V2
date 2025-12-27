import { format } from "date-fns";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Calendar, Droplets, MapPin } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SemenBatch } from "@/hooks/breeding/useSemenInventory";
import { Progress } from "@/components/ui/progress";

interface SemenBatchCardProps {
  batch: SemenBatch;
  onEdit?: (batch: SemenBatch) => void;
  onDelete?: (id: string) => void;
  canManage?: boolean;
}

export function SemenBatchCard({
  batch,
  onEdit,
  onDelete,
  canManage = false,
}: SemenBatchCardProps) {
  const usagePercent = ((batch.doses_total - batch.doses_available) / batch.doses_total) * 100;
  const isLowStock = batch.doses_available <= 2;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={batch.stallion?.avatar_url || undefined} />
              <AvatarFallback>{(batch.stallion?.name || "S")[0]}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">{batch.stallion?.name || "Unknown Stallion"}</h3>
              <p className="text-xs text-muted-foreground">
                Collected {format(new Date(batch.collection_date), "PP")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={batch.type === "frozen" ? "secondary" : "outline"}>
              {batch.type === "frozen" ? "Frozen" : "Fresh"}
            </Badge>
            {canManage && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit?.(batch)}>Edit</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDelete?.(batch.id)} className="text-destructive">
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Doses Available</span>
              <span className={isLowStock ? "text-destructive font-medium" : ""}>
                {batch.doses_available} / {batch.doses_total} {batch.unit}s
              </span>
            </div>
            <Progress value={100 - usagePercent} className="h-2" />
          </div>
          
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            {batch.tank && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                <span>{batch.tank.name}</span>
                {batch.tank.location && <span className="opacity-70">({batch.tank.location})</span>}
              </div>
            )}
          </div>

          {batch.quality_notes && (
            <p className="text-sm text-muted-foreground line-clamp-2">{batch.quality_notes}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
