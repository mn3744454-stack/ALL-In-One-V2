import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { LanguageSelector } from "@/components/ui/language-selector";
import { useI18n } from "@/i18n";
import { useAuth } from "@/contexts/AuthContext";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === "/";
  const { t } = useI18n();
  const { user } = useAuth();

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isHome ? "bg-navy/80 backdrop-blur-xl border-b border-border/20" : "bg-card/80 backdrop-blur-xl border-b border-border/50"
    }`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Logo variant={isHome ? "light" : "default"} />

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <NavLinks variant={isHome ? "light" : "default"} />
            <div className="flex items-center gap-3">
              <LanguageSelector variant={isHome ? "hero" : "default"} />
              {user ? (
                <Button variant={isHome ? "hero" : "gold"} asChild>
                  <Link to="/dashboard">{t('landing.nav.goToDashboard') || 'Go to Dashboard'}</Link>
                </Button>
              ) : (
                <>
                  <Button variant={isHome ? "hero-outline" : "ghost"} asChild>
                    <Link to="/auth">{t('landing.nav.signIn')}</Link>
                  </Button>
                  <Button variant={isHome ? "hero" : "gold"} asChild>
                    <Link to="/auth?mode=signup">{t('landing.nav.getStarted')}</Link>
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`md:hidden p-2 rounded-xl ${isHome ? "text-cream" : "text-foreground"}`}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-card/95 backdrop-blur-xl border-b border-border/50 animate-slide-up">
          <div className="container mx-auto px-4 py-4 space-y-4">
            <NavLinks variant="default" mobile onLinkClick={() => setIsOpen(false)} />
            <div className="flex flex-col gap-2 pt-4 border-t border-border/50">
              <div className="py-2">
                <LanguageSelector variant="default" />
              </div>
              {user ? (
                <Button variant="gold" asChild>
                  <Link to="/dashboard" onClick={() => setIsOpen(false)}>{t('landing.nav.goToDashboard') || 'Go to Dashboard'}</Link>
                </Button>
              ) : (
                <>
                  <Button variant="ghost" asChild className="justify-start">
                    <Link to="/auth" onClick={() => setIsOpen(false)}>{t('landing.nav.signIn')}</Link>
                  </Button>
                  <Button variant="gold" asChild>
                    <Link to="/auth?mode=signup" onClick={() => setIsOpen(false)}>{t('landing.nav.getStarted')}</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

const NavLinks = ({ 
  variant = "default", 
  mobile = false,
  onLinkClick 
}: { 
  variant?: "default" | "light"; 
  mobile?: boolean;
  onLinkClick?: () => void;
}) => {
  const { t } = useI18n();
  
  const links = [
    { label: t('landing.nav.features'), href: "#features" },
    { label: t('landing.nav.directory'), href: "/directory" },
    { label: t('landing.nav.solutions'), href: "#solutions" },
    { label: t('landing.nav.pricing'), href: "#pricing" },
  ];

  const baseClass = variant === "light" 
    ? "text-cream/80 hover:text-cream" 
    : "text-muted-foreground hover:text-foreground";

  return (
    <div className={mobile ? "flex flex-col space-y-2" : "flex items-center gap-6"}>
      {links.map((link) => (
        <a
          key={link.href}
          href={link.href}
          onClick={onLinkClick}
          className={`text-sm font-medium transition-colors ${baseClass}`}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
};

export default Navbar;
