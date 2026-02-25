import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]",
        outline: "border-2 border-border bg-transparent hover:bg-muted hover:border-primary/30 rounded-xl",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary-hover rounded-xl shadow-sm hover:shadow-md",
        ghost: "hover:bg-muted hover:text-foreground rounded-xl",
        link: "text-primary underline-offset-4 hover:underline",
        // Custom elegant variants
        gold: "bg-gradient-to-r from-gold to-gold-light text-navy font-semibold shadow-gold hover:shadow-lg rounded-xl hover:scale-[1.02] active:scale-[0.98]",
        navy: "bg-gradient-to-r from-navy to-navy-light text-cream font-semibold shadow-navy hover:shadow-lg rounded-xl hover:scale-[1.02] active:scale-[0.98]",
        hero: "bg-gradient-to-r from-gold to-gold-light text-navy font-bold shadow-gold hover:shadow-lg rounded-full hover:scale-[1.02] active:scale-[0.98]",
        "hero-outline": "border-2 border-cream/30 bg-transparent text-cream hover:bg-cream/10 rounded-full backdrop-blur-sm",
        glass: "bg-card/80 backdrop-blur-xl border border-border/50 text-foreground hover:bg-card/90 rounded-xl shadow-soft hover:shadow-medium",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 px-4 text-xs",
        lg: "h-12 px-8 text-base",
        xl: "h-14 px-10 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
