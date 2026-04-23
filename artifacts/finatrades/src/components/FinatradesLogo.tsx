import React from 'react';

interface FinatradesLogoProps {
  className?: string;
  variant?: 'white' | 'gold' | 'color';
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function FinatradesLogo({ 
  className = '', 
  variant = 'color',
  showText = true,
  size = 'md'
}: FinatradesLogoProps) {
  const sizes = {
    sm: { icon: 24, text: 'text-base' },
    md: { icon: 32, text: 'text-xl' },
    lg: { icon: 48, text: 'text-3xl' }
  };

  const iconColor = variant === 'white' ? '#FFFFFF' : '#D4A020';
  const finaColor = variant === 'gold' ? '#D4A020' : '#FFFFFF';
  const tradesColor = variant === 'white' ? '#FFFFFF' : '#D4A020';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg 
        width={sizes[size].icon} 
        height={sizes[size].icon} 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <path 
          d="M25 20 L45 20 L45 45 L25 65 L25 20Z" 
          fill={iconColor}
        />
        <path 
          d="M50 15 L70 35 L50 55 L50 15Z" 
          fill={iconColor}
        />
        <path 
          d="M55 40 L75 20 L75 65 L55 85 L55 40Z" 
          fill={iconColor}
        />
        <path 
          d="M25 70 L45 50 L45 95 L25 95 L25 70Z" 
          fill={iconColor}
        />
      </svg>
      {showText && (
        <span className={`font-bold tracking-tight ${sizes[size].text}`}>
          <span style={{ color: finaColor }}>FINA</span>
          <span style={{ color: tradesColor }}>TRADES</span>
        </span>
      )}
    </div>
  );
}
