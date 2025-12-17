import { Link } from "react-router-dom";

const Logo = ({ className = "", variant = "default" }: { className?: string; variant?: "default" | "light" }) => {
  const textColor = variant === "light" ? "text-cream" : "text-navy";
  
  return (
    <Link to="/" className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-gold-light flex items-center justify-center shadow-gold">
          <svg
            viewBox="0 0 24 24"
            className="w-6 h-6 text-navy"
            fill="currentColor"
          >
            <path d="M12 2C10.5 2 9.5 3 9 4C8.5 5 8 6 7 7C6 8 4 9 3 10C2 11 2 13 3 14C4 15 5 15 6 15C7 15 8 15.5 9 16C10 16.5 11 17 12 18C13 17 14 16.5 15 16C16 15.5 17 15 18 15C19 15 20 15 21 14C22 13 22 11 21 10C20 9 18 8 17 7C16 6 15.5 5 15 4C14.5 3 13.5 2 12 2Z" />
            <path d="M12 6C11 6 10 7 10 8C10 9 11 10 12 10C13 10 14 9 14 8C14 7 13 6 12 6Z" opacity="0.5" />
          </svg>
        </div>
      </div>
      <div className="flex flex-col">
        <span className={`font-display text-xl font-bold tracking-tight ${textColor}`}>
          Khail
        </span>
        <span className={`text-[10px] uppercase tracking-widest ${variant === "light" ? "text-cream/70" : "text-muted-foreground"}`}>
          Horse Management
        </span>
      </div>
    </Link>
  );
};

export default Logo;
