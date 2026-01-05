import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface DirectionalIconProps {
  icon: LucideIcon;
  className?: string;
  flipInRTL?: boolean;
}

/**
 * Icon wrapper that automatically flips directional icons (like chevrons, arrows)
 * when the app is in RTL mode.
 */
export function DirectionalIcon({ 
  icon: Icon, 
  className, 
  flipInRTL = true 
}: DirectionalIconProps) {
  const { dir } = useI18n();
  const shouldFlip = flipInRTL && dir === 'rtl';

  return (
    <Icon 
      className={cn(
        className, 
        shouldFlip && 'scale-x-[-1]'
      )} 
    />
  );
}
