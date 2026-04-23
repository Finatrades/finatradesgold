import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Calculator, TrendingUp, DollarSign, Percent, Clock, RefreshCw } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

export default function InterestCalculator() {
  const [goldGrams, setGoldGrams] = useState(100);
  const [tenorMonths, setTenorMonths] = useState(12);
  const [marginRate, setMarginRate] = useState(8);
  const [goldPrice, setGoldPrice] = useState(85);

  const { data: configData } = useQuery({
    queryKey: ['bnsl-config'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/bnsl/config');
      return res.json();
    },
  });

  const { data: goldPriceData, refetch } = useQuery({
    queryKey: ['gold-price'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/gold-price');
      return res.json();
    },
  });

  const currentGoldPrice = goldPriceData?.pricePerGram || 85;

  const calculations = useMemo(() => {
    const principal = goldGrams * goldPrice;
    const annualRate = marginRate / 100;
    const monthlyRate = annualRate / 12;
    const periods = tenorMonths;
    
    const totalInterest = principal * annualRate * (periods / 12);
    const totalPayout = principal + totalInterest;
    const monthlyPayout = totalPayout / periods;
    
    const effectiveAPY = ((totalPayout / principal - 1) / (periods / 12)) * 100;
    
    const breakEvenPrice = goldPrice * (1 - (marginRate / 100) * (tenorMonths / 12));
    
    const platformCost = totalInterest;
    const platformCostPerGram = platformCost / goldGrams;
    
    return {
      principal,
      totalInterest,
      totalPayout,
      monthlyPayout,
      effectiveAPY,
      breakEvenPrice,
      platformCost,
      platformCostPerGram,
    };
  }, [goldGrams, tenorMonths, marginRate, goldPrice]);

  const formatCurrency = (value: number) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Interest Rate Calculator</h1>
            <p className="text-muted-foreground">BNSL margin and payout calculations</p>
          </div>
          <Button variant="outline" onClick={() => { refetch(); setGoldPrice(currentGoldPrice); }}>
            <RefreshCw className="w-4 h-4 mr-2" /> Use Live Price (${currentGoldPrice.toFixed(2)})
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" /> Input Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Gold Amount (grams)</Label>
                <Input 
                  type="number" 
                  value={goldGrams}
                  onChange={(e) => setGoldGrams(parseFloat(e.target.value) || 0)}
                />
                <Slider 
                  value={[goldGrams]} 
                  onValueChange={([v]) => setGoldGrams(v)}
                  min={10}
                  max={1000}
                  step={10}
                />
              </div>

              <div className="space-y-2">
                <Label>Gold Price ($/gram)</Label>
                <Input 
                  type="number" 
                  value={goldPrice}
                  onChange={(e) => setGoldPrice(parseFloat(e.target.value) || 0)}
                />
                <Slider 
                  value={[goldPrice]} 
                  onValueChange={([v]) => setGoldPrice(v)}
                  min={50}
                  max={150}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <Label>Tenor (months)</Label>
                <Select value={tenorMonths.toString()} onValueChange={(v) => setTenorMonths(parseInt(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 Months</SelectItem>
                    <SelectItem value="6">6 Months</SelectItem>
                    <SelectItem value="12">12 Months</SelectItem>
                    <SelectItem value="18">18 Months</SelectItem>
                    <SelectItem value="24">24 Months</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Margin Rate (% annual)</Label>
                <Input 
                  type="number" 
                  value={marginRate}
                  onChange={(e) => setMarginRate(parseFloat(e.target.value) || 0)}
                />
                <Slider 
                  value={[marginRate]} 
                  onValueChange={([v]) => setMarginRate(v)}
                  min={1}
                  max={20}
                  step={0.5}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" /> Calculation Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Principal</span>
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(calculations.principal)}</p>
                  <p className="text-xs text-muted-foreground">{goldGrams}g @ ${goldPrice}/g</p>
                </div>

                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-muted-foreground">Total Interest</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(calculations.totalInterest)}</p>
                  <p className="text-xs text-muted-foreground">Platform pays user</p>
                </div>

                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-purple-600" />
                    <span className="text-sm text-muted-foreground">Total Payout</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">{formatCurrency(calculations.totalPayout)}</p>
                  <p className="text-xs text-muted-foreground">At maturity</p>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Monthly Payout</span>
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(calculations.monthlyPayout)}</p>
                  <p className="text-xs text-muted-foreground">If quarterly payouts</p>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Percent className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Effective APY</span>
                  </div>
                  <p className="text-2xl font-bold">{calculations.effectiveAPY.toFixed(2)}%</p>
                  <p className="text-xs text-muted-foreground">Annual yield</p>
                </div>

                <div className="p-4 bg-orange-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-orange-600" />
                    <span className="text-sm text-muted-foreground">Break-Even Price</span>
                  </div>
                  <p className="text-2xl font-bold text-orange-600">${calculations.breakEvenPrice.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Gold price for platform</p>
                </div>
              </div>

              <div className="mt-6 p-4 border rounded-lg">
                <h4 className="font-semibold mb-3">Platform Cost Analysis</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Platform Cost</p>
                    <p className="text-xl font-bold text-red-600">{formatCurrency(calculations.platformCost)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cost per Gram</p>
                    <p className="text-xl font-bold text-red-600">{formatCurrency(calculations.platformCostPerGram)}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Platform needs to profit from gold price appreciation or spread to cover this cost
                </p>
              </div>

              <div className="mt-6">
                <h4 className="font-semibold mb-3">Scenario Comparison</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Tenor</th>
                        <th className="text-right py-2">Interest</th>
                        <th className="text-right py-2">Total Payout</th>
                        <th className="text-right py-2">APY</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[3, 6, 12, 18, 24].map((months) => {
                        const interest = calculations.principal * (marginRate / 100) * (months / 12);
                        const payout = calculations.principal + interest;
                        const apy = ((payout / calculations.principal - 1) / (months / 12)) * 100;
                        return (
                          <tr key={months} className={`border-b ${months === tenorMonths ? 'bg-primary/10' : ''}`}>
                            <td className="py-2">{months} months</td>
                            <td className="text-right py-2">{formatCurrency(interest)}</td>
                            <td className="text-right py-2">{formatCurrency(payout)}</td>
                            <td className="text-right py-2">{apy.toFixed(2)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
