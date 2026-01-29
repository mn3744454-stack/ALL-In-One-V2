import Logo from "@/components/Logo";
import { Link } from "react-router-dom";
import { useI18n } from "@/i18n";

const Footer = () => {
  const { t } = useI18n();

  const platformLinks = [
    { labelKey: "landing.footer.features", href: "#features" },
    { labelKey: "landing.footer.pricing", href: "#pricing" },
    { labelKey: "landing.footer.solutions", href: "#solutions" },
    { labelKey: "landing.footer.mobileApp", href: "#" },
  ];

  const companyLinks = [
    { labelKey: "landing.footer.aboutUs", href: "#" },
    { labelKey: "landing.footer.careers", href: "#" },
    { labelKey: "landing.footer.contact", href: "#" },
    { labelKey: "landing.footer.blog", href: "#" },
  ];

  const supportLinks = [
    { labelKey: "landing.footer.helpCenter", href: "#" },
    { labelKey: "landing.footer.documentation", href: "#" },
    { labelKey: "landing.footer.apiReference", href: "#" },
    { labelKey: "landing.footer.status", href: "#" },
  ];

  return (
    <footer className="bg-navy border-t border-cream/10 py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="col-span-1 md:col-span-1">
            <Logo variant="light" className="mb-4" />
            <p className="text-cream/60 text-sm leading-relaxed">
              {t('landing.footer.description')}
            </p>
          </div>

          {/* Links */}
          <FooterColumn
            title={t('landing.footer.platform')}
            links={platformLinks.map(l => ({ label: t(l.labelKey), href: l.href }))}
          />
          <FooterColumn
            title={t('landing.footer.company')}
            links={companyLinks.map(l => ({ label: t(l.labelKey), href: l.href }))}
          />
          <FooterColumn
            title={t('landing.footer.support')}
            links={supportLinks.map(l => ({ label: t(l.labelKey), href: l.href }))}
          />
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-cream/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-cream/50 text-sm">
            © {new Date().getFullYear()} Khail. {t('landing.footer.rights')}
          </p>
          <div className="flex items-center gap-6">
            <Link to="#" className="text-cream/50 hover:text-cream text-sm transition-colors">
              {t('landing.footer.privacy')}
            </Link>
            <Link to="#" className="text-cream/50 hover:text-cream text-sm transition-colors">
              {t('landing.footer.terms')}
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
