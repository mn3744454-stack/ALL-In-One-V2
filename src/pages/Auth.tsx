import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import Logo from "@/components/Logo";
import { Eye, EyeOff, Mail, Lock, User, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nContext";
import heroImage from "@/assets/hero-horse.jpg";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signIn, signUp, user } = useAuth();
  const { t, dir } = useI18n();
  const isRTL = dir === 'rtl';
  
  const [mode, setMode] = useState<"signin" | "signup">(
    searchParams.get("mode") === "signup" ? "signup" : "signin"
  );
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  useEffect(() => {
    setMode(searchParams.get("mode") === "signup" ? "signup" : "signin");
  }, [searchParams]);

  // Get redirect parameter for post-auth redirect (supports both 'next' and 'redirect' params)
  const nextPath = searchParams.get("redirect") || searchParams.get("next");

  useEffect(() => {
    if (user) {
      // If there's a next path (e.g., /invite/:token), redirect there
      // Otherwise, default to dashboard
      navigate(nextPath || "/dashboard");
    }
  }, [user, navigate, nextPath]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Trim whitespace from inputs
    const email = formData.email.trim();
    const password = formData.password;
    const name = formData.name.trim();

    try {
      if (mode === "signup") {
        // Client-side validation
        if (password.length < 6) {
          toast.error(t('auth.errors.weakPassword'));
          setLoading(false);
          return;
        }

        const { error } = await signUp(email, password, name);
        
        if (error) {
          console.error("Sign up error:", error);
          
          const errorMsg = error.message?.toLowerCase() || '';
          if (errorMsg.includes("already registered") || errorMsg.includes("already exists")) {
            toast.error(t('auth.errors.emailExists'));
          } else if (errorMsg.includes("password") || errorMsg.includes("6 characters")) {
            toast.error(t('auth.errors.weakPassword'));
          } else if (errorMsg.includes("invalid email") || errorMsg.includes("email")) {
            toast.error(t('auth.errors.invalidEmail'));
          } else if (errorMsg.includes("rate limit") || errorMsg.includes("too many")) {
            toast.error(t('auth.errors.rateLimited'));
          } else {
            toast.error(t('auth.errors.createFailed'));
          }
          setLoading(false);
          return;
        }

        toast.success(t('auth.accountCreated'));
        navigate(nextPath || "/dashboard");
      } else {
        const { error } = await signIn(email, password);
        
        if (error) {
          console.error("Sign in error:", error);
          
          const errorMsg = error.message?.toLowerCase() || '';
          if (errorMsg.includes('failed to fetch') || errorMsg.includes('timed out') || errorMsg.includes('network')) {
            toast.error(t('auth.errors.networkError'));
          } else {
            toast.error(t('auth.errors.invalidCredentials'));
          }
          
          setLoading(false);
          return;
        }

        toast.success(t('auth.welcomeBack'));
        navigate(nextPath || "/dashboard");
      }
    } catch (err) {
      console.error("Auth exception:", err);
      toast.error(t('common.unknownError'));
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
              {mode === "signup" ? t('auth.createAccount') : t('auth.welcomeBackTitle')}
            </h1>
            <p className="text-muted-foreground">
              {mode === "signup"
                ? t('auth.startManaging')
                : t('auth.signInToContinue')}
            </p>
          </div>

          <Card variant="elevated" className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "signup" && (
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-navy font-medium">
                      {t('auth.fullName')}
                    </Label>
                    <div className="relative">
                      <User className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="name"
                        type="text"
                        placeholder={t('auth.enterFullName')}
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="ps-10"
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-navy font-medium">
                    {t('auth.emailAddress')}
                  </Label>
                  <div className="relative">
                    <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder={t('auth.enterEmail')}
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="ps-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-navy font-medium">
                    {t('auth.password')}
                  </Label>
                  <div className="relative">
                    <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder={t('auth.enterPassword')}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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

                {mode === "signin" && (
                  <div className={`flex ${isRTL ? 'justify-start' : 'justify-end'}`}>
                    <Link to="/forgot-password" className="text-sm text-gold hover:text-gold-dark transition-colors">
                      {t('auth.forgotPassword')}
                    </Link>
                  </div>
                )}

                <Button type="submit" variant="gold" className="w-full" size="lg" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-navy/30 border-t-navy rounded-full animate-spin" />
                      {mode === "signup" ? t('auth.creatingAccount') : t('auth.signingIn')}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {mode === "signup" ? t('auth.createAccountBtn') : t('auth.signIn')}
                      <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                    </span>
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {mode === "signup" ? t('auth.hasAccount') : t('auth.noAccount')}{" "}
                  <Link
                    to={mode === "signup" ? "/auth" : "/auth?mode=signup"}
                    className="text-gold font-semibold hover:text-gold-dark transition-colors"
                  >
                    {mode === "signup" ? t('auth.signIn') : t('auth.signUp')}
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground text-center mt-6">
            {t('auth.termsAgreement')}{" "}
            <Link to="#" className="text-navy hover:underline">{t('auth.termsOfService')}</Link> {t('auth.and')}{" "}
            <Link to="#" className="text-navy hover:underline">{t('auth.privacyPolicy')}</Link>.
          </p>
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

export default Auth;
