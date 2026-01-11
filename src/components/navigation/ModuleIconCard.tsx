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

  return (
    <button
      onClick={handleClick}
      style={{ animationDelay: `${index * 60}ms` }}
      className={cn(
        // Base layout
        "group relative flex flex-col items-center justify-center gap-3 p-4 rounded-3xl",
        // Background and border
        "bg-white/90 backdrop-blur-sm",
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
        "active:scale-95 active:translate-y-0",
        // Color scheme class for CSS variables
        `module-icon-${colorScheme}`
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
          boxShadow: "0 0 30px 5px var(--icon-glow)",
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
          borderColor: "var(--icon-border)",
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
          background: "var(--icon-gradient)",
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
