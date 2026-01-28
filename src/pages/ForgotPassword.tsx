import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import Logo from "@/components/Logo";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n/I18nContext";
import heroImage from "@/assets/hero-horse.jpg";

const ForgotPassword = () => {
  const { t, dir } = useI18n();
  const isRTL = dir === 'rtl';
  
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        console.error("Password reset error:", error);
        
        const errorMsg = error.message?.toLowerCase() || '';
        if (errorMsg.includes("rate limit") || errorMsg.includes("too many")) {
          toast.error(t('auth.errors.rateLimited'));
        } else if (errorMsg.includes("network") || errorMsg.includes("fetch")) {
          toast.error(t('auth.errors.networkError'));
        } else {
          // Don't reveal if email exists or not for security
          toast.error(t('auth.passwordReset.sendFailed'));
        }
        setLoading(false);
        return;
      }

      // Success - show confirmation even if email doesn't exist (security best practice)
      setSent(true);
      toast.success(t('auth.passwordReset.emailSent'));
    } catch (err) {
      console.error("Unexpected error:", err);
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
              {t('auth.passwordReset.title')}
            </h1>
            <p className="text-muted-foreground">
              {t('auth.passwordReset.subtitle')}
            </p>
          </div>

          <Card variant="elevated" className="border-0 shadow-lg">
            <CardContent className="pt-6">
              {sent ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-navy mb-2">
                    {t('auth.passwordReset.checkEmail')}
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    {t('auth.passwordReset.checkEmailDesc')}
                  </p>
                  <Link to="/auth">
                    <Button variant="outline" className="w-full">
                      <ArrowLeft className={`w-4 h-4 ${isRTL ? 'ms-2 rotate-180' : 'me-2'}`} />
                      {t('auth.passwordReset.backToSignIn')}
                    </Button>
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
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
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="ps-10"
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" variant="gold" className="w-full" size="lg" disabled={loading}>
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-navy/30 border-t-navy rounded-full animate-spin" />
                        {t('auth.passwordReset.sending')}
                      </span>
                    ) : (
                      t('auth.passwordReset.sendLink')
                    )}
                  </Button>

                  <div className="text-center pt-2">
                    <Link
                      to="/auth"
                      className="text-sm text-gold hover:text-gold-dark transition-colors inline-flex items-center gap-1"
                    >
                      <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                      {t('auth.passwordReset.backToSignIn')}
                    </Link>
                  </div>
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

export default ForgotPassword;
