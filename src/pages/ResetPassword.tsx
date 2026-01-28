import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import Logo from "@/components/Logo";
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n/I18nContext";
import heroImage from "@/assets/hero-horse.jpg";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { t, dir } = useI18n();
  const isRTL = dir === 'rtl';
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // Check for recovery session from the URL hash
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');

    if (type === 'recovery' && accessToken) {
      // Session will be automatically set by Supabase from the URL
      setSessionReady(true);
    } else {
      // Listen for auth state change (Supabase handles the token automatically)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setSessionReady(true);
        }
      });

      // Check if there's already a session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setSessionReady(true);
        }
      });

      return () => subscription.unsubscribe();
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError(t('auth.passwordReset.passwordsNoMatch'));
      return;
    }

    // Validate password length
    if (password.length < 6) {
      setError(t('auth.errors.weakPassword'));
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        console.error("Password update error:", updateError);
        
        const errorMsg = updateError.message?.toLowerCase() || '';
        if (errorMsg.includes("same password") || errorMsg.includes("different")) {
          setError(t('auth.passwordReset.samePassword'));
        } else if (errorMsg.includes("weak") || errorMsg.includes("6 characters")) {
          setError(t('auth.errors.weakPassword'));
        } else if (errorMsg.includes("session") || errorMsg.includes("expired")) {
          setError(t('auth.passwordReset.linkExpired'));
        } else {
          setError(t('auth.passwordReset.updateFailed'));
        }
        setLoading(false);
        return;
      }

      // Success
      setSuccess(true);
      toast.success(t('auth.passwordReset.success'));
      
      // Sign out and redirect to login after a short delay
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate("/auth");
      }, 2000);
    } catch (err) {
      console.error("Unexpected error:", err);
      setError(t('common.unknownError'));
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-cream">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <Logo className="mb-8" />
            <h1 className="font-display text-3xl font-bold text-navy mb-2">
              {t('auth.passwordReset.newPasswordTitle')}
            </h1>
            <p className="text-muted-foreground">
              {t('auth.passwordReset.newPasswordSubtitle')}
            </p>
          </div>

          <Card variant="elevated" className="border-0 shadow-lg">
            <CardContent className="pt-6">
              {success ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-navy mb-2">
                    {t('auth.passwordReset.successTitle')}
                  </h2>
                  <p className="text-muted-foreground">
                    {t('auth.passwordReset.successDesc')}
                  </p>
                </div>
              ) : !sessionReady ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-amber-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-navy mb-2">
                    {t('auth.passwordReset.invalidLink')}
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    {t('auth.passwordReset.invalidLinkDesc')}
                  </p>
                  <Button
                    variant="gold"
                    onClick={() => navigate("/forgot-password")}
                    className="w-full"
                  >
                    {t('auth.passwordReset.requestNewLink')}
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-navy font-medium">
                      {t('auth.passwordReset.newPassword')}
                    </Label>
                    <div className="relative">
                      <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder={t('auth.passwordReset.enterNewPassword')}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="ps-10 pe-10"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-navy font-medium">
                      {t('auth.passwordReset.confirmPassword')}
                    </Label>
                    <div className="relative">
                      <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder={t('auth.passwordReset.confirmNewPassword')}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="ps-10 pe-10"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" variant="gold" className="w-full" size="lg" disabled={loading}>
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-navy/30 border-t-navy rounded-full animate-spin" />
                        {t('auth.passwordReset.updating')}
                      </span>
                    ) : (
                      t('auth.passwordReset.updatePassword')
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right Side - Image */}
      <div className="hidden lg:flex flex-1 relative">
        <img
          src={heroImage}
          alt="Arabian horse"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className={`absolute inset-0 ${isRTL ? 'bg-gradient-to-r' : 'bg-gradient-to-l'} from-navy/80 to-navy/40`} />
        <div className="relative z-10 flex items-end p-12">
          <div className="max-w-md">
            <blockquote className="text-2xl font-display font-semibold text-cream mb-4">
              "{t('auth.testimonial')}"
            </blockquote>
            <cite className="text-cream/80 not-italic">
              — {t('auth.testimonialAuthor')}
            </cite>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
