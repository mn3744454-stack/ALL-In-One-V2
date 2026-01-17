import * as React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

/**
 * RTL-aware Tabs component that automatically reverses tab order in RTL mode.
 */
interface RtlTabsProps extends React.ComponentPropsWithoutRef<typeof Tabs> {
  children: React.ReactNode;
}

interface RtlTabsListProps extends React.ComponentPropsWithoutRef<typeof TabsList> {
  children: React.ReactNode;
}

const RtlTabs = React.forwardRef<HTMLDivElement, RtlTabsProps>(
  ({ className, ...props }, ref) => {
    const { dir } = useI18n();
    return <Tabs ref={ref} dir={dir} className={className} {...props} />;
  }
);
RtlTabs.displayName = "RtlTabs";

const RtlTabsList = React.forwardRef<HTMLDivElement, RtlTabsListProps>(
  ({ className, children, ...props }, ref) => {
    const { dir } = useI18n();
    
    return (
      <TabsList
        ref={ref}
        className={cn(
          className,
          dir === "rtl" && "flex-row-reverse"
        )}
        {...props}
      >
        {children}
      </TabsList>
    );
  }
);
RtlTabsList.displayName = "RtlTabsList";

// Re-export the trigger and content as-is
const RtlTabsTrigger = TabsTrigger;
const RtlTabsContent = TabsContent;

export { RtlTabs, RtlTabsList, RtlTabsTrigger, RtlTabsContent };
