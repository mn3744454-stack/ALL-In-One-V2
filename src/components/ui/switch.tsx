import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

interface SwitchProps extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> {
  dir?: "ltr" | "rtl";
}

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  SwitchProps
>(({ className, dir, ...props }, ref) => {
  // Determine effective direction: prop > document > default ltr
  const effectiveDir = dir ?? (typeof document !== "undefined" ? document.documentElement.dir as "ltr" | "rtl" : "ltr") ?? "ltr";
  const isRtl = effectiveDir === "rtl";

  return (
    <SwitchPrimitives.Root
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
        className,
      )}
      {...props}
      ref={ref}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform duration-100",
          // LTR: unchecked=left(0), checked=right(5)
          // RTL: unchecked=right(5), checked=left(0)
          isRtl
            ? "data-[state=unchecked]:translate-x-5 data-[state=checked]:translate-x-0"
            : "data-[state=unchecked]:translate-x-0 data-[state=checked]:translate-x-5",
        )}
      />
    </SwitchPrimitives.Root>
  );
});
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
