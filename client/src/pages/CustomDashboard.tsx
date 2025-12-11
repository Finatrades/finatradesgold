import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useFinaPay } from '@/context/FinaPayContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { 
  LayoutDashboard, GripVertical, Eye, EyeOff, Save, 
  RotateCcw, Wallet, TrendingUp, BarChart3, History,
  PieChart, ArrowUpDown, Bell, Settings
} from 'lucide-react';
import WalletBalanceCards from '@/components/finapay/WalletBalanceCards';
import LiveGoldChart from '@/components/finapay/LiveGoldChart';
import TransactionHistory from '@/components/finapay/TransactionHistory';

interface Widget {
  id: string;
  type: string;
  label: string;
  icon: React.ElementType;
  x: number;
  y: number;
  w: number;
  h: number;
  visible: boolean;
}

const DEFAULT_WIDGETS: Widget[] = [
  { id: 'wallet', type: 'wallet', label: 'Wallet Balance', icon: Wallet, x: 0, y: 0, w: 12, h: 1, visible: true },
  { id: 'chart', type: 'chart', label: 'Gold Price Chart', icon: TrendingUp, x: 0, y: 1, w: 8, h: 2, visible: true },
  { id: 'stats', type: 'stats', label: 'Quick Stats', icon: BarChart3, x: 8, y: 1, w: 4, h: 2, visible: true },
  { id: 'transactions', type: 'transactions', label: 'Recent Transactions', icon: History, x: 0, y: 3, w: 12, h: 2, visible: true },
];

export default function CustomDashboard() {
  const { user } = useAuth();
  const { wallet, transactions, currentGoldPriceUsdPerGram } = useFinaPay();
  const queryClient = useQueryClient();
  const [widgets, setWidgets] = useState<Widget[]>(DEFAULT_WIDGETS);
  const [editMode, setEditMode] = useState(false);
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);

  const { data: savedLayout } = useQuery({
    queryKey: ['dashboard-layout', user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/layout/${user?.id}`);
      if (!response.ok) throw new Error('Failed to fetch layout');
      return response.json();
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (savedLayout?.layout?.widgets) {
      const mergedWidgets = DEFAULT_WIDGETS.map(defaultWidget => {
        const saved = savedLayout.layout.widgets.find((w: any) => w.id === defaultWidget.id);
        return saved ? { ...defaultWidget, ...saved } : defaultWidget;
      });
      setWidgets(mergedWidgets);
    }
  }, [savedLayout]);

  const saveMutation = useMutation({
    mutationFn: async (layout: { widgets: Widget[] }) => {
      const response = await fetch(`/api/dashboard/layout/${user?.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layout }),
      });
      if (!response.ok) throw new Error('Failed to save layout');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Dashboard layout saved!');
      queryClient.invalidateQueries({ queryKey: ['dashboard-layout'] });
    },
  });

  const toggleWidget = (widgetId: string) => {
    setWidgets(prev => prev.map(w => 
      w.id === widgetId ? { ...w, visible: !w.visible } : w
    ));
  };

  const moveWidget = (widgetId: string, direction: 'up' | 'down') => {
    setWidgets(prev => {
      const index = prev.findIndex(w => w.id === widgetId);
      if (index === -1) return prev;
      
      const newIndex = direction === 'up' ? Math.max(0, index - 1) : Math.min(prev.length - 1, index + 1);
      const newWidgets = [...prev];
      const [removed] = newWidgets.splice(index, 1);
      newWidgets.splice(newIndex, 0, removed);
      
      return newWidgets.map((w, i) => ({ ...w, y: i }));
    });
  };

  const resetLayout = () => {
    setWidgets(DEFAULT_WIDGETS);
    toast.info('Layout reset to default');
  };

  const saveLayout = () => {
    saveMutation.mutate({ widgets });
    setEditMode(false);
  };

  const goldBalance = wallet ? parseFloat(wallet.goldGrams) : 0;
  const usdBalance = wallet ? parseFloat(wallet.usdBalance) : 0;

  const walletData = {
    goldBalanceGrams: goldBalance,
    usdBalance: usdBalance,
    goldPriceUsdPerGram: currentGoldPriceUsdPerGram,
    usdAedRate: 3.67,
    bnslLockedUsd: 0,
    finaBridgeLockedUsd: 0
  };

  const mappedTransactions = transactions.slice(0, 5).map(tx => ({
    id: tx.id,
    type: tx.type as 'Buy' | 'Sell' | 'Send' | 'Receive' | 'Deposit' | 'Withdrawal',
    amountGrams: tx.amountGold ? parseFloat(tx.amountGold) : undefined,
    amountUsd: tx.amountUsd ? parseFloat(tx.amountUsd) : 0,
    feeUsd: 0,
    timestamp: tx.createdAt,
    referenceId: tx.referenceId || tx.id.slice(0, 8).toUpperCase(),
    status: tx.status as 'Completed' | 'Pending' | 'Failed',
    description: tx.description || '',
    assetType: (tx.amountGold && parseFloat(tx.amountGold) > 0) ? 'GOLD' : 'USD' as 'GOLD' | 'USD'
  }));

  const renderWidget = (widget: Widget) => {
    if (!widget.visible) return null;

    switch (widget.type) {
      case 'wallet':
        return <WalletBalanceCards wallet={walletData} />;
      case 'chart':
        return (
          <div className="h-[400px]">
            <LiveGoldChart />
          </div>
        );
      case 'stats':
        return (
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Gold Balance</span>
                <span className="font-bold">{goldBalance.toFixed(4)}g</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">USD Balance</span>
                <span className="font-bold">${usdBalance.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Gold Price</span>
                <span className="font-bold">${currentGoldPriceUsdPerGram.toFixed(2)}/g</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Portfolio Value</span>
                <span className="font-bold text-primary">
                  ${(goldBalance * currentGoldPriceUsdPerGram + usdBalance).toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      case 'transactions':
        return <TransactionHistory transactions={mappedTransactions} />;
      default:
        return null;
    }
  };

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 pb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg border border-primary/20 text-primary">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">My Dashboard</h1>
              <p className="text-muted-foreground text-sm">Customize your view</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            {editMode ? (
              <>
                <Button variant="outline" onClick={resetLayout}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
                <Button onClick={saveLayout} disabled={saveMutation.isPending}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Layout
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setEditMode(true)}>
                <Settings className="w-4 h-4 mr-2" />
                Customize
              </Button>
            )}
          </div>
        </div>

        {editMode && (
          <Card className="bg-muted/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Widget Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {widgets.map((widget, index) => (
                  <div 
                    key={widget.id}
                    className="flex items-center justify-between p-3 bg-background rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                      <widget.icon className="w-4 h-4 text-primary" />
                      <span className="font-medium">{widget.label}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => moveWidget(widget.id, 'up')}
                          disabled={index === 0}
                        >
                          <ArrowUpDown className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        {widget.visible ? (
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-muted-foreground" />
                        )}
                        <Switch
                          checked={widget.visible}
                          onCheckedChange={() => toggleWidget(widget.id)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-6">
          {widgets.map((widget) => (
            <div key={widget.id} className={widget.visible ? '' : 'hidden'}>
              {renderWidget(widget)}
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
