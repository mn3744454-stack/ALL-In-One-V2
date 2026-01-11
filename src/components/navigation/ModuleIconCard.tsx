import { cn } from "@/lib/utils";

export type ModuleColorScheme =
  | "gold"
  | "emerald"
  | "purple"
  | "sky"
  | "orange"
  | "indigo"
  | "slate"
  | "cyan"
  | "rose"
  | "pink"
  | "teal"
  | "amber"
  | "navy";

// Direct color definitions for each scheme
const COLOR_SCHEME_STYLES: Record<ModuleColorScheme, {
  gradient: string;
  glow: string;
  border: string;
}> = {
  gold: {
    gradient: "linear-gradient(135deg, hsl(43, 74%, 49%) 0%, hsl(38, 80%, 60%) 100%)",
    glow: "hsla(43, 74%, 49%, 0.4)",
    border: "hsl(43, 74%, 49%)",
  },
  emerald: {
    gradient: "linear-gradient(135deg, hsl(152, 69%, 40%) 0%, hsl(166, 72%, 50%) 100%)",
    glow: "hsla(152, 69%, 40%, 0.4)",
    border: "hsl(152, 69%, 40%)",
  },
  purple: {
    gradient: "linear-gradient(135deg, hsl(271, 76%, 53%) 0%, hsl(292, 70%, 60%) 100%)",
    glow: "hsla(271, 76%, 53%, 0.4)",
    border: "hsl(271, 76%, 53%)",
  },
  sky: {
    gradient: "linear-gradient(135deg, hsl(199, 89%, 48%) 0%, hsl(188, 94%, 50%) 100%)",
    glow: "hsla(199, 89%, 48%, 0.4)",
    border: "hsl(199, 89%, 48%)",
  },
  orange: {
    gradient: "linear-gradient(135deg, hsl(25, 95%, 53%) 0%, hsl(35, 95%, 55%) 100%)",
    glow: "hsla(25, 95%, 53%, 0.4)",
    border: "hsl(25, 95%, 53%)",
  },
  indigo: {
    gradient: "linear-gradient(135deg, hsl(239, 84%, 67%) 0%, hsl(250, 85%, 70%) 100%)",
    glow: "hsla(239, 84%, 67%, 0.4)",
    border: "hsl(239, 84%, 67%)",
  },
  slate: {
    gradient: "linear-gradient(135deg, hsl(215, 16%, 47%) 0%, hsl(215, 20%, 55%) 100%)",
    glow: "hsla(215, 16%, 47%, 0.3)",
    border: "hsl(215, 16%, 47%)",
  },
  cyan: {
    gradient: "linear-gradient(135deg, hsl(187, 85%, 43%) 0%, hsl(175, 80%, 50%) 100%)",
    glow: "hsla(187, 85%, 43%, 0.4)",
    border: "hsl(187, 85%, 43%)",
  },
  rose: {
    gradient: "linear-gradient(135deg, hsl(350, 89%, 60%) 0%, hsl(340, 85%, 65%) 100%)",
    glow: "hsla(350, 89%, 60%, 0.4)",
    border: "hsl(350, 89%, 60%)",
  },
  pink: {
    gradient: "linear-gradient(135deg, hsl(330, 81%, 60%) 0%, hsl(320, 80%, 65%) 100%)",
    glow: "hsla(330, 81%, 60%, 0.4)",
    border: "hsl(330, 81%, 60%)",
  },
  teal: {
    gradient: "linear-gradient(135deg, hsl(168, 76%, 42%) 0%, hsl(160, 70%, 50%) 100%)",
    glow: "hsla(168, 76%, 42%, 0.4)",
    border: "hsl(168, 76%, 42%)",
  },
  amber: {
    gradient: "linear-gradient(135deg, hsl(45, 93%, 47%) 0%, hsl(50, 95%, 55%) 100%)",
    glow: "hsla(45, 93%, 47%, 0.4)",
    border: "hsl(45, 93%, 47%)",
  },
  navy: {
    gradient: "linear-gradient(135deg, hsl(222, 47%, 25%) 0%, hsl(220, 50%, 35%) 100%)",
    glow: "hsla(222, 47%, 25%, 0.4)",
    border: "hsl(222, 47%, 25%)",
  },
};

interface ModuleIconCardProps {
  icon: React.ElementType;
  label: string;
  colorScheme: ModuleColorScheme;
  onClick: () => void;
  index?: number;
}

// Trigger haptic feedback on supported devices
const triggerHaptic = () => {
  if ("vibrate" in navigator) {
    navigator.vibrate(10);
  }
};

export function ModuleIconCard({
  icon: Icon,
  label,
  colorScheme,
  onClick,
  index = 0,
}: ModuleIconCardProps) {
  const handleClick = () => {
    triggerHaptic();
    onClick();
  };

  const colors = COLOR_SCHEME_STYLES[colorScheme];

  return (
    <button
      onClick={handleClick}
      style={{ animationDelay: `${index * 60}ms` }}
      className={cn(
        // Base layout
        "group relative flex flex-col items-center justify-center gap-3 p-4 rounded-3xl",
        // Background and border
        "bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm",
        "border-2 border-transparent",
        // Shadow
        "shadow-lg shadow-black/5",
        // Animation on mount
        "opacity-0 animate-pop-in",
        // Transitions
        "transition-all duration-300 ease-out",
        // Hover effects
        "hover:scale-105 hover:-translate-y-2",
        "hover:shadow-xl hover:shadow-black/10",
        // Active state
        "active:scale-95 active:translate-y-0"
      )}
    >
      {/* Glow effect on hover */}
      <div
        className={cn(
          "absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-300",
          "group-hover:opacity-100",
          "pointer-events-none"
        )}
        style={{
          boxShadow: `0 0 30px 5px ${colors.glow}`,
        }}
      />

      {/* Border glow on hover */}
      <div
        className={cn(
          "absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-300",
          "group-hover:opacity-100",
          "pointer-events-none",
          "border-2"
        )}
        style={{
          borderColor: colors.border,
        }}
      />

      {/* Icon container with gradient */}
      <div
        className={cn(
          "relative w-14 h-14 rounded-2xl flex items-center justify-center",
          "transition-all duration-300",
          // Hover animation
          "group-hover:scale-110 group-hover:rotate-3",
          // Active animation
          "group-active:scale-95 group-active:rotate-0"
        )}
        style={{
          background: colors.gradient,
        }}
      >
        {/* Inner shadow for depth */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/20 to-transparent" />
        
        <Icon className="relative w-7 h-7 text-white drop-shadow-md transition-transform duration-300 group-hover:scale-110" />
      </div>

      {/* Label */}
      <span
        className={cn(
          "text-sm font-semibold text-center text-foreground/80 line-clamp-2",
          "transition-colors duration-300",
          "group-hover:text-foreground"
        )}
      >
        {label}
      </span>
    </button>
  );
}

// Module key to color scheme mapping
export const MODULE_COLOR_SCHEMES: Record<string, ModuleColorScheme> = {
  // Main modules
  horses: "gold",
  finance: "emerald",
  housing: "purple",
  academy: "sky",
  hr: "orange",
  directory: "indigo",
  settings: "slate",
  community: "pink",
  payments: "teal",
  revenue: "emerald",
  services: "amber",
  files: "slate",
  sessions: "sky",
  bookings: "cyan",
  profile: "indigo",
  schedule: "orange",
  
  // Sub-modules (horses children)
  myhorses: "gold",
  orders: "amber",
  breeding: "rose",
  vet: "cyan",
  lab: "purple",
  movement: "teal",
};

// Get color scheme for a module key
export function getModuleColorScheme(moduleKey: string): ModuleColorScheme {
  return MODULE_COLOR_SCHEMES[moduleKey.toLowerCase()] || "navy";
}
