import React from 'react';

interface DirhamSymbolProps {
  className?: string;
  size?: number | string;
}

export const AED_SYMBOL = 'Dh';

export function DirhamSymbol({ className = '', size = '1em' }: DirhamSymbolProps) {
  return (
    <svg 
      viewBox="0 0 24 32" 
      fill="currentColor" 
      style={{ 
        width: size, 
        height: size, 
        display: 'inline-block', 
        verticalAlign: 'baseline',
        marginRight: '0.15em'
      }}
      className={className}
      aria-label="AED"
    >
      <path d="M4 4h2c6.627 0 12 5.373 12 12s-5.373 12-12 12H4V4zm2 4v16h0c4.418 0 8-3.582 8-8s-3.582-8-8-8z" />
      <rect x="0" y="11" width="18" height="2.5" rx="1" />
      <rect x="0" y="18" width="18" height="2.5" rx="1" />
    </svg>
  );
}

export function formatAED(amount: number, decimals = 2): string {
  return amount.toLocaleString('en-US', { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  });
}

interface AEDAmountProps {
  amount: number;
  decimals?: number;
  className?: string;
  symbolSize?: number | string;
}

export function AEDAmount({ amount, decimals = 2, className = '', symbolSize = '0.9em' }: AEDAmountProps) {
  return (
    <span className={className}>
      <DirhamSymbol size={symbolSize} />
      {formatAED(amount, decimals)}
    </span>
  );
}

export default DirhamSymbol;
