import { useCurrency, type CurrencyCode } from '@/context/CurrencyContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface CurrencySelectorProps {
  showLabel?: boolean;
  className?: string;
  size?: 'sm' | 'default';
}

export function CurrencySelector({ showLabel = true, className = '', size = 'default' }: CurrencySelectorProps) {
  const { displayCurrency, setDisplayCurrency, currencies, loading } = useCurrency();

  const activeCurrencies = currencies.filter(c => c.isActive);

  return (
    <div className={`flex flex-col gap-2 ${className}`} data-testid="currency-selector-container">
      {showLabel && (
        <Label htmlFor="currency-select" className="text-sm font-medium">
          Display Currency
        </Label>
      )}
      <Select
        value={displayCurrency}
        onValueChange={(value) => setDisplayCurrency(value as CurrencyCode)}
        disabled={loading}
      >
        <SelectTrigger 
          id="currency-select"
          className={size === 'sm' ? 'h-8 text-sm' : ''}
          data-testid="currency-selector-trigger"
        >
          <SelectValue placeholder="Select currency" />
        </SelectTrigger>
        <SelectContent data-testid="currency-selector-content">
          {activeCurrencies.map((currency) => (
            <SelectItem 
              key={currency.code} 
              value={currency.code}
              data-testid={`currency-option-${currency.code}`}
            >
              <span className="flex items-center gap-2">
                <span className="font-medium">{currency.symbol}</span>
                <span>{currency.code}</span>
                <span className="text-muted-foreground text-sm">- {currency.name}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface CurrencyDisplayProps {
  amount: number;
  currency?: CurrencyCode;
  showSymbol?: boolean;
  className?: string;
  convertFrom?: CurrencyCode;
}

export function CurrencyDisplay({ 
  amount, 
  currency, 
  showSymbol = true, 
  className = '',
  convertFrom 
}: CurrencyDisplayProps) {
  const { formatCurrency, convert, displayCurrency } = useCurrency();
  
  const targetCurrency = currency || displayCurrency;
  const displayAmount = convertFrom 
    ? convert(amount, convertFrom, targetCurrency) 
    : amount;

  return (
    <span className={className} data-testid="currency-display">
      {formatCurrency(displayAmount, targetCurrency, showSymbol)}
    </span>
  );
}

interface GoldPriceDisplayProps {
  priceUsd: number;
  currency?: CurrencyCode;
  showUnit?: boolean;
  className?: string;
}

export function GoldPriceDisplay({ 
  priceUsd, 
  currency, 
  showUnit = true,
  className = '' 
}: GoldPriceDisplayProps) {
  const { formatGoldPrice, displayCurrency } = useCurrency();
  
  const targetCurrency = currency || displayCurrency;

  return (
    <span className={className} data-testid="gold-price-display">
      {formatGoldPrice(priceUsd, targetCurrency)}
      {showUnit && <span className="text-muted-foreground text-sm">/g</span>}
    </span>
  );
}

interface CurrencyBadgeProps {
  currency: CurrencyCode;
  className?: string;
}

export function CurrencyBadge({ currency, className = '' }: CurrencyBadgeProps) {
  const { getCurrencySymbol } = useCurrency();

  return (
    <span 
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground ${className}`}
      data-testid={`currency-badge-${currency}`}
    >
      {getCurrencySymbol(currency)} {currency}
    </span>
  );
}
