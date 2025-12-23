import React from 'react';

interface DirhamSymbolProps {
  className?: string;
  size?: number | string;
}

export const AED_SYMBOL = 'AED';

export function DirhamSymbol({ className = '', size = '1em' }: DirhamSymbolProps) {
  return (
    <span 
      style={{ 
        fontSize: size, 
        display: 'inline',
        marginRight: '0.25em',
        fontWeight: 600
      }}
      className={className}
      aria-label="AED"
    >
      AED
    </span>
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
