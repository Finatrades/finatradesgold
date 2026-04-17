import { cn } from '@/lib/utils';

interface AuroraBackgroundProps {
  className?: string;
}

export function AuroraBackground({ className }: AuroraBackgroundProps) {
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none fixed inset-0 z-0 overflow-hidden',
        className,
      )}
    >
      <div className="aurora-layer aurora-layer-1" />
      <div className="aurora-layer aurora-layer-2" />
      <div className="aurora-layer aurora-layer-3" />
      <div className="aurora-grain" />
    </div>
  );
}
