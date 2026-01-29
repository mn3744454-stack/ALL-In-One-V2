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
import heroImage from "@/assets/hero-horse.jpg";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signIn, signUp, user } = useAuth();
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

  // Get the 'next' parameter for post-auth redirect (e.g., from invitation flow)
  const nextPath = searchParams.get("next");

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

    try {
      if (mode === "signup") {
        const { error } = await signUp(formData.email, formData.password, formData.name);
        
        if (error) {
          // Log full error for debugging (only visible in dev console)
          console.error("Sign up error:", error);
          
          // Show safe, generic messages to prevent information disclosure
          if (error.message?.includes("already registered")) {
            toast.error("This email is already registered. Please sign in.");
          } else if (error.message?.includes("Password")) {
            toast.error("Password does not meet requirements. Please use a stronger password.");
          } else {
            toast.error("Unable to create account. Please try again.");
          }
          setLoading(false);
          return;
        }

        toast.success("Account created successfully!");
        // Redirect to next path if available, otherwise dashboard
        navigate(nextPath || "/dashboard");
      } else {
        const { error } = await signIn(formData.email, formData.password);
        
        if (error) {
          // Log full error for debugging (only visible in dev console)
          console.error("Sign in error:", error);
          
          // Generic message to prevent user enumeration attacks
          toast.error("Invalid email or password. Please try again.");
          setLoading(false);
          return;
        }

        toast.success("Welcome back!");
        // Redirect to next path if available, otherwise dashboard
        navigate(nextPath || "/dashboard");
      }
    } catch (err) {
      toast.error("An unexpected error occurred");
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
              {mode === "signup" ? "Create your account" : "Welcome back"}
            </h1>
            <p className="text-muted-foreground">
              {mode === "signup"
                ? "Start managing your equestrian business today"
                : "Sign in to continue to your dashboard"}
            </p>
          </div>

          <Card variant="elevated" className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "signup" && (
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-navy font-medium">
                      Full Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="name"
                        type="text"
                        placeholder="Enter your full name"
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
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="ps-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-navy font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="ps-10 pe-10"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {mode === "signin" && (
                  <div className="flex justify-end">
                    <Link to="/forgot-password" className="text-sm text-gold hover:text-gold-dark transition-colors">
                      Forgot password?
                    </Link>
                  </div>
                )}

                <Button type="submit" variant="gold" className="w-full" size="lg" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-navy/30 border-t-navy rounded-full animate-spin" />
                      {mode === "signup" ? "Creating account..." : "Signing in..."}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {mode === "signup" ? "Create Account" : "Sign In"}
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {mode === "signup" ? "Already have an account?" : "Don't have an account?"}{" "}
                  <Link
                    to={mode === "signup" ? "/auth" : "/auth?mode=signup"}
                    className="text-gold font-semibold hover:text-gold-dark transition-colors"
                  >
                    {mode === "signup" ? "Sign in" : "Sign up"}
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground text-center mt-6">
            By continuing, you agree to our{" "}
            <Link to="#" className="text-navy hover:underline">Terms of Service</Link> and{" "}
            <Link to="#" className="text-navy hover:underline">Privacy Policy</Link>.
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
        <div className="absolute inset-0 bg-gradient-to-l from-navy/80 to-navy/40" />
        <div className="relative z-10 flex items-end p-12">
          <div className="max-w-md">
            <blockquote className="text-2xl font-display font-semibold text-cream mb-4">
              "Khail has transformed how we manage our stable. The efficiency gains are incredible."
            </blockquote>
            <cite className="text-cream/80 not-italic">
              — Mohammed Al-Faisal, Al-Faisal Stables, Riyadh
            </cite>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
