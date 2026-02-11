import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLabRequestMessages } from "@/hooks/laboratory/useLabRequestMessages";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { useI18n } from "@/i18n";
import { formatDistanceToNow } from "date-fns";
import { Send, Loader2, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface LabRequestThreadProps {
  requestId: string;
}

export function LabRequestThread({ requestId }: LabRequestThreadProps) {
  const { user } = useAuth();
  const { activeTenant } = useTenant();
  const { t } = useI18n();
  const { messages, loading, sendMessage, isSending } = useLabRequestMessages(requestId);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = async () => {
    if (!draft.trim() || isSending) return;
    const text = draft;
    setDraft("");
    try {
      await sendMessage(text);
    } catch {
      setDraft(text); // restore on failure
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[200px] max-h-[400px]"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <MessageSquare className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">{t('laboratory.requests.noMessages')}</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_user_id === user?.id;
            const isSameTenant = msg.sender_tenant_id === activeTenant?.tenant_id;

            return (
              <div
                key={msg.id}
                className={cn(
                  "flex",
                  isMe ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-xl px-3 py-2 text-sm",
                    isMe
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted rounded-bl-sm"
                  )}
                >
                  {!isMe && (
                    <p className="text-[10px] font-medium opacity-70 mb-0.5">
                      {isSameTenant ? t('laboratory.requests.team') : t('laboratory.requests.partner')}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                  <p
                    className={cn(
                      "text-[10px] mt-1 opacity-60",
                      isMe ? "text-end" : "text-start"
                    )}
                  >
                    {formatDistanceToNow(new Date(msg.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input area */}
      <div className="border-t p-3 flex gap-2 items-end">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('laboratory.requests.typeMessage')}
          rows={1}
          className="min-h-[40px] max-h-[100px] resize-none flex-1"
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!draft.trim() || isSending}
          className="shrink-0"
        >
          {isSending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
