import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Edit3, UserMinus, History, Loader2 } from "lucide-react";
import { useHorseOwnershipHistory } from "@/hooks/useHorseOwnershipHistory";

interface OwnershipTimelineProps {
  horseId: string;
}

export const OwnershipTimeline = ({ horseId }: OwnershipTimelineProps) => {
  const { history, loading } = useHorseOwnershipHistory(horseId);

  const getActionIcon = (action: string) => {
    switch (action) {
      case "added":
        return <UserPlus className="w-4 h-4" />;
      case "updated":
        return <Edit3 className="w-4 h-4" />;
      case "removed":
        return <UserMinus className="w-4 h-4" />;
      default:
        return <History className="w-4 h-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "added":
        return "bg-success/20 text-success";
      case "updated":
        return "bg-gold/20 text-gold";
      case "removed":
        return "bg-destructive/20 text-destructive";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case "added":
        return "Owner Added";
      case "updated":
        return "Ownership Updated";
      case "removed":
        return "Owner Removed";
      default:
        return action;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="w-5 h-5 text-gold" />
            Ownership History
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="w-5 h-5 text-gold" />
          Ownership History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">
            No ownership changes recorded yet
          </p>
        ) : (
          <div className="relative space-y-0">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

            {history.map((entry, index) => (
              <div key={entry.id} className="relative pl-10 pb-6 last:pb-0">
                {/* Timeline dot */}
                <div className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center ${getActionColor(entry.action)}`}>
                  {getActionIcon(entry.action)}
                </div>

                {/* Content */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground">
                      {entry.owner?.name || "Unknown Owner"}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {entry.ownership_percentage}%
                      {entry.is_primary && " • Primary"}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    {getActionLabel(entry.action)}
                    {entry.action === "updated" && entry.previous_percentage !== null && (
                      <span className="text-xs ml-1">
                        (from {entry.previous_percentage}%)
                      </span>
                    )}
                  </p>
                  
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(entry.changed_at), "PPp")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
