import { useRef, MouseEvent, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GlareCardProps {
  children: ReactNode;
  className?: string;
  glareColor?: string;
}

export function GlareCard({
  children,
  className,
  glareColor = 'rgba(255, 215, 0, 0.25)',
}: GlareCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    el.style.setProperty('--glare-x', `${x}%`);
    el.style.setProperty('--glare-y', `${y}%`);
    el.style.setProperty('--glare-opacity', '1');
    const tiltX = (y - 50) / 12;
    const tiltY = (50 - x) / 12;
    el.style.setProperty('--tilt-x', `${tiltX}deg`);
    el.style.setProperty('--tilt-y', `${tiltY}deg`);
  };

  const handleMouseLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--glare-opacity', '0');
    el.style.setProperty('--tilt-x', '0deg');
    el.style.setProperty('--tilt-y', '0deg');
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn('relative overflow-hidden transition-transform duration-200 ease-out', className)}
      style={
        {
          transform: 'perspective(900px) rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg))',
          transformStyle: 'preserve-3d',
          '--glare-x': '50%',
          '--glare-y': '50%',
          '--glare-opacity': '0',
        } as React.CSSProperties
      }
    >
      {children}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle 240px at var(--glare-x) var(--glare-y), ${glareColor}, transparent 60%)`,
          opacity: 'var(--glare-opacity, 0)',
          mixBlendMode: 'plus-lighter',
        }}
      />
    </div>
  );
}
