import React from 'react';

interface DirhamSymbolProps {
  className?: string;
  size?: number | string;
}

export const AED_SYMBOL = 'د';

export function DirhamSymbol({ className = '', size = '1em' }: DirhamSymbolProps) {
  return (
    <svg
      viewBox="0 0 22 26"
      fill="currentColor"
      style={{
        display: 'inline-block',
        verticalAlign: '-0.15em',
        height: size,
        width: 'auto',
      }}
      className={className}
      aria-label="AED"
    >
      {/* D body shape */}
      <path d="M2 1h6C15.2 1 21 5.8 21 13S15.2 25 8 25H2V1zm3.5 3.5v17C10.5 21.5 17.5 18 17.5 13S10.5 4.5 5.5 4.5z" />
      {/* Two horizontal lines crossing through the D — like = sign on the letter */}
      <rect x="0" y="8.5" width="21" height="2.2" rx="1.1" />
      <rect x="0" y="15" width="21" height="2.2" rx="1.1" />
    </svg>
  );
}

export function formatAED(amount: number, decimals = 2): string {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
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
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      <DirhamSymbol size={symbolSize} />
      {formatAED(amount, decimals)}
    </span>
  );
}

export default DirhamSymbol;
