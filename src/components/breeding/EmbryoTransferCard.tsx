import { format } from "date-fns";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Calendar, ArrowRight, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmbryoTransfer } from "@/hooks/breeding/useEmbryoTransfers";
import { BreedingStatusBadge } from "./BreedingStatusBadge";

interface EmbryoTransferCardProps {
  transfer: EmbryoTransfer;
  onEdit?: (transfer: EmbryoTransfer) => void;
  onDelete?: (id: string) => void;
  onUpdateStatus?: (id: string, status: EmbryoTransfer["status"]) => void;
  canManage?: boolean;
}

export function EmbryoTransferCard({
  transfer,
  onEdit,
  onDelete,
  onUpdateStatus,
  canManage = false,
}: EmbryoTransferCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Avatar className="h-8 w-8">
                <AvatarImage src={transfer.donor_mare?.avatar_url || undefined} />
                <AvatarFallback>{(transfer.donor_mare?.name || "D")[0]}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{transfer.donor_mare?.name || "Donor"}</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-1">
              <Avatar className="h-8 w-8">
                <AvatarImage src={transfer.recipient_mare?.avatar_url || undefined} />
                <AvatarFallback>{(transfer.recipient_mare?.name || "R")[0]}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{transfer.recipient_mare?.name || "Recipient"}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <BreedingStatusBadge status={transfer.status} type="embryo" />
            {canManage && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {transfer.status === "planned" && (
                    <DropdownMenuItem onClick={() => onUpdateStatus?.(transfer.id, "transferred")}>
                      Mark Transferred
                    </DropdownMenuItem>
                  )}
                  {transfer.status === "transferred" && (
                    <>
                      <DropdownMenuItem onClick={() => onUpdateStatus?.(transfer.id, "completed")}>
                        Mark Completed
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onUpdateStatus?.(transfer.id, "failed")}>
                        Mark Failed
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem onClick={() => onEdit?.(transfer)}>Edit</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDelete?.(transfer.id)} className="text-destructive">
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-3">
          {transfer.embryo_grade && (
            <Badge variant="secondary">Grade: {transfer.embryo_grade}</Badge>
          )}
          <Badge variant="outline">{transfer.embryo_count} embryo(s)</Badge>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
          {transfer.flush_date && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>Flush: {format(new Date(transfer.flush_date), "PP")}</span>
            </div>
          )}
          {transfer.transfer_date && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>Transfer: {format(new Date(transfer.transfer_date), "PP")}</span>
            </div>
          )}
          {transfer.assignee && (
            <div className="flex items-center gap-1 col-span-2">
              <User className="h-3.5 w-3.5" />
              <span>{transfer.assignee.full_name || "Assigned"}</span>
            </div>
          )}
        </div>
        {transfer.notes && (
          <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{transfer.notes}</p>
        )}
      </CardContent>
    </Card>
  );
}
