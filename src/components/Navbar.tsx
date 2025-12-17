import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isHome ? "bg-transparent" : "bg-card/80 backdrop-blur-xl border-b border-border/50"
    }`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Logo variant={isHome ? "light" : "default"} />

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <NavLinks variant={isHome ? "light" : "default"} />
            <div className="flex items-center gap-3">
              <Button variant={isHome ? "hero-outline" : "ghost"} asChild>
                <Link to="/auth">Sign In</Link>
              </Button>
              <Button variant={isHome ? "hero" : "gold"} asChild>
                <Link to="/auth?mode=signup">Get Started</Link>
              </Button>
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
              <Button variant="ghost" asChild className="justify-start">
                <Link to="/auth" onClick={() => setIsOpen(false)}>Sign In</Link>
              </Button>
              <Button variant="gold" asChild>
                <Link to="/auth?mode=signup" onClick={() => setIsOpen(false)}>Get Started</Link>
              </Button>
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
  const links = [
    { label: "Features", href: "#features" },
    { label: "Solutions", href: "#solutions" },
    { label: "Pricing", href: "#pricing" },
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
