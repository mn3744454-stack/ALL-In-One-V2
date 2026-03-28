import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Globe, Eye, EyeOff, Sparkles, ExternalLink, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useI18n } from "@/i18n";
import {
  useTenantPublicSettings,
  useUpdatePublicSettings,
  useCheckSlugAvailability,
  useGenerateSlug,
  calculateProfileCompleteness,
} from "@/hooks/useTenantPublicSettings";
import { ProfileCompleteness } from "./ProfileCompleteness";
import { REGIONS } from "@/hooks/useDirectory";

const formSchema = z.object({
  is_public: z.boolean(),
  is_listed: z.boolean(),
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .max(50, "Slug must be less than 50 characters")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug can only contain lowercase letters, numbers, and hyphens"
    )
    .optional()
    .or(z.literal("")),
  public_name: z.string().max(100).optional().or(z.literal("")),
  public_description: z.string().max(1000).optional().or(z.literal("")),
  public_phone: z.string().max(20).optional().or(z.literal("")),
  public_email: z.string().email().optional().or(z.literal("")),
  public_website: z.string().max(200).optional().or(z.literal("")),
  public_location_text: z.string().max(200).optional().or(z.literal("")),
  region: z.string().optional().or(z.literal("")),
  tags: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

const SUGGESTED_TAGS = [
  "boarding", "training", "lessons", "arabian", "veterinary",
  "emergency", "dental", "reproduction", "diagnostics", "dna-testing",
  "medications", "supplements", "transport", "domestic", "international",
  "dressage", "jumping",
];

export const PublicProfileSettings = () => {
  const { t } = useI18n();
  const { data: settings, isLoading } = useTenantPublicSettings();
  const updateSettings = useUpdatePublicSettings();
  const checkSlug = useCheckSlugAvailability();
  const generateSlug = useGenerateSlug();

  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [newTag, setNewTag] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      is_public: false, is_listed: true, slug: "", public_name: "",
      public_description: "", public_phone: "", public_email: "",
      public_website: "", public_location_text: "", region: "", tags: [],
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        is_public: settings.is_public ?? false,
        is_listed: settings.is_listed ?? true,
        slug: settings.slug || "",
        public_name: settings.public_name || "",
        public_description: settings.public_description || "",
        public_phone: settings.public_phone || "",
        public_email: settings.public_email || "",
        public_website: settings.public_website || "",
        public_location_text: settings.public_location_text || "",
        region: settings.region || "",
        tags: settings.tags || [],
      });
    }
  }, [settings, form]);

  const isPublic = form.watch("is_public");
  const currentSlug = form.watch("slug");
  const currentTags = form.watch("tags") || [];
  const isDirty = form.formState.isDirty;

  useEffect(() => {
    if (!currentSlug || currentSlug.length < 3) { setSlugStatus("idle"); return; }
    const timer = setTimeout(async () => {
      setSlugStatus("checking");
      try {
        const available = await checkSlug.mutateAsync(currentSlug);
        setSlugStatus(available ? "available" : "taken");
      } catch { setSlugStatus("idle"); }
    }, 500);
    return () => clearTimeout(timer);
  }, [currentSlug]);

  const handleGenerateSlug = async () => {
    const name = settings?.name;
    if (!name) return;
    try {
      const slug = await generateSlug.mutateAsync(name);
      form.setValue("slug", slug, { shouldDirty: true });
    } catch (error) { console.error("Failed to generate slug:", error); }
  };

  const addTag = (tag: string) => {
    const trimmedTag = tag.toLowerCase().trim();
    if (trimmedTag && !currentTags.includes(trimmedTag)) {
      form.setValue("tags", [...currentTags, trimmedTag], { shouldDirty: true });
    }
    setNewTag("");
  };

  const removeTag = (tagToRemove: string) => {
    form.setValue("tags", currentTags.filter((t) => t !== tagToRemove), { shouldDirty: true });
  };

  const onSubmit = (values: FormValues) => {
    updateSettings.mutate({
      is_public: values.is_public,
      is_listed: values.is_listed,
      slug: values.slug || null,
      public_name: values.public_name || null,
      public_description: values.public_description || null,
      public_phone: values.public_phone || null,
      public_email: values.public_email || null,
      public_website: values.public_website || null,
      public_location_text: values.public_location_text || null,
      region: values.region || null,
      tags: values.tags && values.tags.length > 0 ? values.tags : null,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gold" />
      </div>
    );
  }

  const completeness = calculateProfileCompleteness(settings);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-display text-xl font-semibold text-navy mb-1">
          {t("publicProfile.title")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("publicProfile.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Visibility + URL Slug — side by side on desktop */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Visibility Card */}
                <Card variant="elevated">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Globe className="w-5 h-5 text-gold" />
                      {t("publicProfile.visibility")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="is_public"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-xl border border-border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base font-medium">
                              {t("publicProfile.makePublic")}
                            </FormLabel>
                            <FormDescription>
                              {t("publicProfile.makePublicDesc")}
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {isPublic && (
                      <FormField
                        control={form.control}
                        name="is_listed"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-xl border border-border p-4 bg-muted/30">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base font-medium flex items-center gap-2">
                                {field.value ? (
                                  <Eye className="w-4 h-4 text-success" />
                                ) : (
                                  <EyeOff className="w-4 h-4 text-muted-foreground" />
                                )}
                                {t("publicProfile.listInDirectory")}
                              </FormLabel>
                              <FormDescription>
                                {field.value ? t("publicProfile.listedDesc") : t("publicProfile.unlistedDesc")}
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    )}
                  </CardContent>
                </Card>

                {/* URL Slug Card */}
                <Card variant="elevated">
                  <CardHeader>
                    <CardTitle className="text-lg">{t("publicProfile.publicUrl")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="slug"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("publicProfile.urlSlug")}</FormLabel>
                          <div className="flex gap-2">
                            <div className="flex-1 relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                /t/
                              </span>
                              <FormControl>
                                <Input
                                  placeholder={t("publicProfile.slugPlaceholder")}
                                  {...field}
                                  className="pl-10"
                                />
                              </FormControl>
                              {slugStatus === "checking" && (
                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                              )}
                              {slugStatus === "available" && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-success">
                                  {t("publicProfile.available")}
                                </span>
                              )}
                              {slugStatus === "taken" && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-destructive">
                                  {t("publicProfile.taken")}
                                </span>
                              )}
                            </div>
                            <Button
                              type="button" variant="outline" size="icon"
                              onClick={handleGenerateSlug}
                              disabled={generateSlug.isPending}
                            >
                              <Sparkles className="w-4 h-4" />
                            </Button>
                          </div>
                          <FormDescription>
                            {currentSlug && isPublic && (
                              <Link
                                to={`/t/${currentSlug}`} target="_blank"
                                className="inline-flex items-center gap-1 text-gold hover:underline"
                              >
                                {t("publicProfile.preview")}: /t/{currentSlug}
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            )}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </div>
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-xl border border-border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base font-medium">
                            {t("publicProfile.makePublic")}
                          </FormLabel>
                          <FormDescription>
                            {t("publicProfile.makePublicDesc")}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {isPublic && (
                    <FormField
                      control={form.control}
                      name="is_listed"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-xl border border-border p-4 bg-muted/30">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base font-medium flex items-center gap-2">
                              {field.value ? (
                                <Eye className="w-4 h-4 text-success" />
                              ) : (
                                <EyeOff className="w-4 h-4 text-muted-foreground" />
                              )}
                              {t("publicProfile.listInDirectory")}
                            </FormLabel>
                            <FormDescription>
                              {field.value ? t("publicProfile.listedDesc") : t("publicProfile.unlistedDesc")}
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  )}
                </CardContent>
              </Card>

              {/* URL Slug */}
              <Card variant="elevated">
                <CardHeader>
                  <CardTitle className="text-lg">{t("publicProfile.publicUrl")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("publicProfile.urlSlug")}</FormLabel>
                        <div className="flex gap-2">
                          <div className="flex-1 relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                              /t/
                            </span>
                            <FormControl>
                              <Input
                                placeholder={t("publicProfile.slugPlaceholder")}
                                {...field}
                                className="pl-10"
                              />
                            </FormControl>
                            {slugStatus === "checking" && (
                              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                            )}
                            {slugStatus === "available" && (
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-success">
                                {t("publicProfile.available")}
                              </span>
                            )}
                            {slugStatus === "taken" && (
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-destructive">
                                {t("publicProfile.taken")}
                              </span>
                            )}
                          </div>
                          <Button
                            type="button" variant="outline" size="icon"
                            onClick={handleGenerateSlug}
                            disabled={generateSlug.isPending}
                          >
                            <Sparkles className="w-4 h-4" />
                          </Button>
                        </div>
                        <FormDescription>
                          {currentSlug && isPublic && (
                            <Link
                              to={`/t/${currentSlug}`} target="_blank"
                              className="inline-flex items-center gap-1 text-gold hover:underline"
                            >
                              {t("publicProfile.preview")}: /t/{currentSlug}
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          )}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Public Info */}
              <Card variant="elevated">
                <CardHeader>
                  <CardTitle className="text-lg">{t("publicProfile.publicInfo")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="public_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("publicProfile.displayName")}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={settings?.name || t("publicProfile.displayNamePlaceholder")}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>{t("publicProfile.displayNameDesc")}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="public_description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("publicProfile.description")}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t("publicProfile.descriptionPlaceholder")}
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="region"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("publicProfile.region")}</FormLabel>
                          <Select value={field.value || ""} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t("publicProfile.selectRegion")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {REGIONS.map((region) => (
                                <SelectItem key={region.value} value={region.value}>
                                  {region.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="public_location_text"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("publicProfile.locationDetails")}</FormLabel>
                          <FormControl>
                            <Input placeholder={t("publicProfile.locationPlaceholder")} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Contact Info */}
              <Card variant="elevated">
                <CardHeader>
                  <CardTitle className="text-lg">{t("publicProfile.contactInfo")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="public_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("publicProfile.phoneNumber")}</FormLabel>
                          <FormControl>
                            <Input type="tel" placeholder="+966 XX XXX XXXX" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="public_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("publicProfile.emailAddress")}</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="contact@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="public_website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("publicProfile.website")}</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Tags */}
              <Card variant="elevated">
                <CardHeader>
                  <CardTitle className="text-lg">{t("publicProfile.tagsCategories")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {currentTags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {currentTags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                          {tag}
                          <button
                            type="button" onClick={() => removeTag(tag)}
                            className="ml-1 rounded-full hover:bg-muted p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Input
                      placeholder={t("publicProfile.addTag")}
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); addTag(newTag); }
                      }}
                      className="flex-1"
                    />
                    <Button type="button" variant="outline" onClick={() => addTag(newTag)} disabled={!newTag.trim()}>
                      {t("common.add")}
                    </Button>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-2">{t("publicProfile.suggestedTags")}</p>
                    <div className="flex flex-wrap gap-1">
                      {SUGGESTED_TAGS.filter((tag) => !currentTags.includes(tag)).slice(0, 10).map((tag) => (
                        <button
                          key={tag} type="button" onClick={() => addTag(tag)}
                          className="px-2 py-1 text-xs rounded-full bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
                        >
                          + {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Submit */}
              <Button
                type="submit" variant="gold" size="lg" className="w-full"
                disabled={updateSettings.isPending}
              >
                {updateSettings.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("publicProfile.saving")}
                  </>
                ) : (
                  t("publicProfile.saveChanges")
                )}
              </Button>
            </form>
          </Form>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <ProfileCompleteness settings={settings} percentage={completeness} />

          {isPublic && currentSlug && (
            <Card variant="elevated" className="p-4">
              <h4 className="font-medium text-sm text-navy mb-2">
                {t("publicProfile.yourPublicPage")}
              </h4>
              <Link
                to={`/t/${currentSlug}`} target="_blank"
                className="flex items-center justify-between p-3 rounded-lg bg-gold/10 hover:bg-gold/20 transition-colors group"
              >
                <span className="text-sm font-medium text-gold truncate">/t/{currentSlug}</span>
                <ExternalLink className="w-4 h-4 text-gold shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
            </Card>
          )}
        </div>
      </div>

      {/* Sticky save bar */}
      {isDirty && (
        <div className="fixed bottom-0 inset-x-0 bg-background/95 backdrop-blur-sm border-t border-border p-3 z-50 lg:ps-64">
          <div className="container mx-auto max-w-4xl flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{t("myProfile.unsavedChanges")}</p>
            <Button
              variant="gold" size="sm"
              onClick={form.handleSubmit(onSubmit)}
              disabled={updateSettings.isPending}
            >
              {updateSettings.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t("publicProfile.saveChanges")
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
