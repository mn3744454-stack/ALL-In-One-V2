import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2 } from "lucide-react";
import { useI18n } from "@/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { useConnectionMessages } from "@/hooks/connections/useConnectionMessages";
import { formatDistanceToNow } from "date-fns";

interface ConnectionMessagesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionId: string;
  partnerName: string;
}

export function ConnectionMessagesDialog({
  open,
  onOpenChange,
  connectionId,
  partnerName,
}: ConnectionMessagesDialogProps) {
  const { t } = useI18n();
  const { user } = useAuth();
  const { messages, isLoading, sendMessage } = useConnectionMessages(
    open ? connectionId : undefined
  );
  const [body, setBody] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = async () => {
    if (!body.trim()) return;
    const text = body;
    setBody("");
    try {
      await sendMessage.mutateAsync(text);
    } catch {
      setBody(text); // Restore on failure
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {t("connections.messages.title")} — {partnerName}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 max-h-[50vh] px-1" ref={scrollRef}>
          <div className="space-y-3 py-2">
            {isLoading && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {!isLoading && messages.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                {t("connections.messages.empty")}
              </p>
            )}
            {messages.map((msg) => {
              const isMine = msg.sender_user_id === user?.id;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                      isMine
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                    <p
                      className={`text-[10px] mt-1 ${
                        isMine ? "text-primary-foreground/70" : "text-muted-foreground"
                      }`}
                    >
                      {formatDistanceToNow(new Date(msg.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="flex items-end gap-2 pt-2 border-t">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("connections.messages.placeholder")}
            className="min-h-[40px] max-h-[100px] resize-none"
            rows={1}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!body.trim() || sendMessage.isPending}
          >
            {sendMessage.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
