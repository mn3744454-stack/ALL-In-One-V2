import Logo from "@/components/Logo";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-navy border-t border-cream/10 py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="col-span-1 md:col-span-1">
            <Logo variant="light" className="mb-4" />
            <p className="text-cream/60 text-sm leading-relaxed">
              The complete ecosystem for modern horse management. 
              Built for the Gulf region, ready for the world.
            </p>
          </div>

          {/* Links */}
          <FooterColumn
            title="Platform"
            links={[
              { label: "Features", href: "#features" },
              { label: "Pricing", href: "#pricing" },
              { label: "Solutions", href: "#solutions" },
              { label: "Mobile App", href: "#" },
            ]}
          />
          <FooterColumn
            title="Company"
            links={[
              { label: "About Us", href: "#" },
              { label: "Careers", href: "#" },
              { label: "Contact", href: "#" },
              { label: "Blog", href: "#" },
            ]}
          />
          <FooterColumn
            title="Support"
            links={[
              { label: "Help Center", href: "#" },
              { label: "Documentation", href: "#" },
              { label: "API Reference", href: "#" },
              { label: "Status", href: "#" },
            ]}
          />
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-cream/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-cream/50 text-sm">
            © {new Date().getFullYear()} Khail. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link to="#" className="text-cream/50 hover:text-cream text-sm transition-colors">
              Privacy Policy
            </Link>
            <Link to="#" className="text-cream/50 hover:text-cream text-sm transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

const FooterColumn = ({ 
  title, 
  links 
}: { 
  title: string; 
  links: { label: string; href: string }[] 
}) => (
  <div>
    <h4 className="font-semibold text-cream mb-4">{title}</h4>
    <ul className="space-y-3">
      {links.map((link) => (
        <li key={link.label}>
          <a
            href={link.href}
            className="text-cream/60 hover:text-gold text-sm transition-colors"
          >
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  </div>
);

export default Footer;
