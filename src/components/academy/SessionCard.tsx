import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Calendar, Clock, MapPin, Users, Banknote, MoreVertical, Pencil, Trash2, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { AcademySession } from "@/hooks/useAcademySessions";

interface SessionCardProps {
  session: AcademySession;
  confirmedCount: number;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}

export const SessionCard = ({
  session,
  confirmedCount,
  onEdit,
  onDelete,
  onToggleActive,
}: SessionCardProps) => {
  const isPast = new Date(session.end_at) < new Date();
  const isExpiredAndActive = isPast && session.is_active && session.is_public;

  return (
    <Card variant="elevated" className={`${!session.is_active || isPast ? "opacity-60" : ""}`}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col gap-4">
          {/* Expired Warning Banner */}
          {isExpiredAndActive && (
            <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700 text-sm">
                This session has ended and is no longer visible to customers. Update the date to make it available again.
              </AlertDescription>
            </Alert>
          )}

          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display font-semibold text-navy text-lg truncate">
                  {session.title}
                </h3>
                {!session.is_active && (
                  <Badge variant="outline" className="text-muted-foreground">
                    Inactive
                  </Badge>
                )}
                {!session.is_public && (
                  <Badge variant="outline" className="text-muted-foreground">
                    Private
                  </Badge>
                )}
                {isPast && (
                  <Badge variant="destructive" className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Expired
                  </Badge>
                )}
              </div>
              {session.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {session.description}
                </p>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onToggleActive}>
                  {session.is_active ? (
                    <>
                      <EyeOff className="w-4 h-4 mr-2" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      Activate
                    </>
                  )}
                </DropdownMenuItem>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem
                      onSelect={(e) => e.preventDefault()}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Session?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete "{session.title}" and all associated bookings. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={onDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 shrink-0 text-gold" />
              <span>{format(new Date(session.start_at), "EEE, MMM d, yyyy")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 shrink-0 text-gold" />
              <span>
                {format(new Date(session.start_at), "h:mm a")} -{" "}
                {format(new Date(session.end_at), "h:mm a")}
              </span>
            </div>
            {session.location_text && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 shrink-0 text-gold" />
                <span className="truncate">{session.location_text}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 shrink-0 text-gold" />
              <span>
                {confirmedCount}/{session.capacity} confirmed
              </span>
            </div>
          </div>

          {/* Price */}
          {session.price_display && (
            <div className="flex items-center gap-2 text-navy font-semibold pt-2 border-t border-border">
              <Banknote className="w-4 h-4 text-gold" />
              <span>{session.price_display}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
