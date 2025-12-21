import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useCreatePost } from "@/hooks/usePosts";
import { UserAvatar } from "./UserAvatar";
import { Send, Image, Globe, Users, Lock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const PostComposer = () => {
  const { user, profile } = useAuth();
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<"public" | "followers" | "private">("public");
  const createPost = useCreatePost();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    await createPost.mutateAsync({
      content: content.trim(),
      visibility,
    });

    setContent("");
  };

  const visibilityIcons = {
    public: Globe,
    followers: Users,
    private: Lock,
  };

  const VisibilityIcon = visibilityIcons[visibility];

  return (
    <Card variant="elevated" className="mb-4 sm:mb-6">
      <CardContent className="p-3 sm:p-4">
        <form onSubmit={handleSubmit}>
          <div className="flex gap-2 sm:gap-3">
            <div className="hidden sm:block">
              <UserAvatar
                userId={user?.id}
                name={profile?.full_name}
                avatarUrl={profile?.avatar_url}
                size="md"
                linkToProfile
              />
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <Textarea
                placeholder="Share something with the community..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[70px] sm:min-h-[80px] resize-none border-0 bg-muted/50 focus-visible:ring-1 focus-visible:ring-gold/30 text-sm sm:text-base"
              />
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 sm:gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-gold"
                    disabled
                  >
                    <Image className="h-4 w-4" />
                  </Button>
                  <Select
                    value={visibility}
                    onValueChange={(v) => setVisibility(v as typeof visibility)}
                  >
                    <SelectTrigger className="w-[100px] sm:w-[130px] h-8 text-xs border-0 bg-muted/50">
                      <VisibilityIcon className="h-3 w-3 mr-1 shrink-0" />
                      <span className="hidden sm:inline"><SelectValue /></span>
                      <span className="sm:hidden capitalize">{visibility.slice(0, 3)}</span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">
                        <div className="flex items-center gap-2">
                          <Globe className="h-3 w-3" />
                          Public
                        </div>
                      </SelectItem>
                      <SelectItem value="followers">
                        <div className="flex items-center gap-2">
                          <Users className="h-3 w-3" />
                          Followers
                        </div>
                      </SelectItem>
                      <SelectItem value="private">
                        <div className="flex items-center gap-2">
                          <Lock className="h-3 w-3" />
                          Only me
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="submit"
                  variant="gold"
                  size="sm"
                  disabled={!content.trim() || createPost.isPending}
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  Post
                </Button>
              </div>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
