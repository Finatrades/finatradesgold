import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { useTradeFinance } from '@/context/TradeFinanceContext';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { BarChart3, ShieldCheck, FileText, PlusCircle, Briefcase, Info } from 'lucide-react';
import { FinaBridgeWallet, TradeCase } from '@/types/finabridge';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import FinaBridgeWalletCard from '@/components/finabridge/FinaBridgeWalletCard';
import TradeCaseList from '@/components/finabridge/TradeCaseList';
import CreateTradeCase from '@/components/finabridge/CreateTradeCase';
import TradeCaseDetail from '@/components/finabridge/TradeCaseDetail';
import { useToast } from '@/hooks/use-toast';

// Mock Data
const MOCK_WALLET: FinaBridgeWallet = {
  importer: { availableGoldGrams: 250.0, lockedGoldGrams: 150.0 },
  exporter: { availableGoldGrams: 40.0, lockedGoldGrams: 0, incomingLockedGoldGrams: 150.0 }
};

const MOCK_CASES: TradeCase[] = [
  {
    id: 'TF-2025-0007',
    name: 'Gold Bullion Import - Dubai to London',
    role: 'Importer',
    buyer: { company: 'FinaTrades Importer Ltd', country: 'UK', contactName: 'John Buyer', email: 'john@importer.com' },
    seller: { company: 'Pending Finatrades Assignment', country: 'Global', contactName: 'FinaTrades Broker Desk', email: 'broker@finatrades.com' },
    commodityDescription: '10kg Gold Bullion, 999.9 Purity',
    valueUsd: 852200,
    valueGoldGrams: 10000,
    paymentTerms: 'LC',
    deliveryTerms: 'CIF',
    shipmentMethod: 'Secure Logistics',
    expectedDeliveryDate: '2025-02-15',
    lockedGoldGrams: 10000,
    status: 'Funded – Docs Pending',
    createdAt: '2025-01-10T10:00:00Z',
    updatedAt: '2025-01-10T10:00:00Z',
    riskLevel: 'Low',
    amlStatus: 'Clear'
  }
];

export default function FinaBridge() {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // State
  const [activeTab, setActiveTab] = useState('cases');
  const [wallet, setWallet] = useState<FinaBridgeWallet>(MOCK_WALLET);
  const [finaPayBalanceGold, setFinaPayBalanceGold] = useState(500.0); // Mock FinaPay
  const [role, setRole] = useState<'Importer' | 'Exporter'>('Importer'); // Toggle for demo
  const [cases, setCases] = useState<TradeCase[]>(MOCK_CASES);
  const [selectedCase, setSelectedCase] = useState<TradeCase | null>(null);

  // Actions
  const handleTransferFromFinaPay = (amount: number) => {
    setFinaPayBalanceGold(prev => prev - amount);
    setWallet(prev => ({
      ...prev,
      importer: {
        ...prev.importer,
        availableGoldGrams: prev.importer.availableGoldGrams + amount
      }
    }));
    addNotification({
      title: "Gold Transferred",
      message: `${amount.toFixed(2)}g transferred from FinaPay to FinaBridge Importer Wallet.`,
      type: 'transaction'
    });
  };

  const handleCaseCreation = (newCase: TradeCase, lockAmount: number) => {
    setCases(prev => [newCase, ...prev]);
    
    // Update wallet lock
    if (lockAmount > 0) {
      setWallet(prev => ({
        ...prev,
        importer: {
          ...prev.importer,
          availableGoldGrams: prev.importer.availableGoldGrams - lockAmount,
          lockedGoldGrams: prev.importer.lockedGoldGrams + lockAmount
        }
      }));
    }
    
    setActiveTab('cases');
    
    toast({
        title: "Trade Case Created",
        description: `Trade #${newCase.id} initiated. ${lockAmount > 0 ? 'Funds locked.' : 'Status: Draft'}`,
    });
    addNotification({
      title: "New Trade Initiated",
      message: `Trade Case #${newCase.id} created. ${lockAmount > 0 ? `${lockAmount.toFixed(2)}g locked as collateral.` : ''}`,
      type: 'success'
    });
  };

  const handleReleaseFunds = (caseId: string, amount: number) => {
     // 1. Decrease Importer Locked
     // 2. Decrease Exporter Incoming Locked
     // 3. Increase Exporter Available
     
     setWallet(prev => ({
       importer: {
         ...prev.importer,
         lockedGoldGrams: prev.importer.lockedGoldGrams - amount
       },
       exporter: {
         ...prev.exporter,
         incomingLockedGoldGrams: (prev.exporter.incomingLockedGoldGrams || 0) - amount,
         availableGoldGrams: prev.exporter.availableGoldGrams + amount
       }
     }));

     setCases(prev => prev.map(c => c.id === caseId ? { ...c, status: 'Released' } : c));
     if (selectedCase) setSelectedCase(prev => prev ? { ...prev, status: 'Released' } : null);
     
     addNotification({
       title: "Funds Released",
       message: `Settlement for Trade #${caseId} released. Ownership transferred to Exporter.`,
       type: 'success'
     });
  };

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        
        {/* TOP BAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-secondary/10 rounded-lg border border-secondary/20 text-secondary">
                <BarChart3 className="w-6 h-6" />
             </div>
             <div>
               <h1 className="text-2xl font-bold text-foreground">FinaBridge Trade</h1>
               <p className="text-muted-foreground text-sm">Gold-backed trade finance wallet.</p>
             </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Role Toggler for Demo */}
            <div className="flex bg-muted rounded-lg p-1 border border-border">
              <button 
                onClick={() => setRole('Importer')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${role === 'Importer' ? 'bg-blue-600/20 text-blue-600' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Importer View
              </button>
              <button 
                onClick={() => setRole('Exporter')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${role === 'Exporter' ? 'bg-purple-600/20 text-purple-600' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Exporter View
              </button>
            </div>
            
            <div className="hidden md:block text-right border-l border-border pl-4">
               <p className="text-xs text-muted-foreground uppercase tracking-wider">Gold Spot</p>
               <p className="text-secondary font-bold font-mono">$85.22 <span className="text-xs text-muted-foreground">/g</span></p>
            </div>
          </div>
        </div>

        {/* WALLET STRIP */}
        <FinaBridgeWalletCard 
          wallet={wallet} 
          role={role} 
          finaPayBalanceGold={finaPayBalanceGold}
          onTransferFromFinaPay={handleTransferFromFinaPay}
        />
        <div className="flex justify-end -mt-4">
            <Button variant="link" size="sm" className="text-muted-foreground hover:text-primary" onClick={() => setLocation('/finapay')}>
                Need more funds? Go to FinaPay Wallet &rarr;
            </Button>
        </div>

        {/* MAIN CONTENT AREA */}
        {selectedCase ? (
          <TradeCaseDetail 
            tradeCase={selectedCase} 
            onBack={() => setSelectedCase(null)}
            onUpdateCase={(updated) => setSelectedCase(updated)}
            onReleaseFunds={() => handleReleaseFunds(selectedCase.id, selectedCase.lockedGoldGrams)}
            currentRole={role}
          />
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-muted border border-border p-1 mb-8 w-full md:w-auto flex">
              <TabsTrigger value="cases" className="flex-1 md:flex-none data-[state=active]:bg-secondary data-[state=active]:text-white">
                <Briefcase className="w-4 h-4 mr-2" /> Trades
              </TabsTrigger>
              <TabsTrigger value="create" className="flex-1 md:flex-none data-[state=active]:bg-secondary data-[state=active]:text-white">
                <PlusCircle className="w-4 h-4 mr-2" /> Create New Trade
              </TabsTrigger>
              <TabsTrigger value="audit" className="flex-1 md:flex-none data-[state=active]:bg-secondary data-[state=active]:text-white">
                <ShieldCheck className="w-4 h-4 mr-2" /> Audit & Compliance
              </TabsTrigger>
            </TabsList>

            <TabsContent value="cases" className="mt-0">
               <TradeCaseList 
                 cases={cases} 
                 onViewCase={setSelectedCase} 
                 onCreateNew={() => setActiveTab('create')}
               />
            </TabsContent>

            <TabsContent value="create">
               <CreateTradeCase 
                 onSuccess={handleCaseCreation} 
                 wallet={wallet}
                 currentRole={role}
                 finaPayBalanceGold={finaPayBalanceGold}
                 onTransferFromFinaPay={handleTransferFromFinaPay}
               />
            </TabsContent>

            <TabsContent value="audit">
               <Card className="bg-white shadow-sm border border-border">
                 <CardContent className="p-12 text-center text-muted-foreground">
                    <ShieldCheck className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <h3 className="text-lg font-bold text-foreground mb-2">Compliance Dashboard</h3>
                    <p>Global view of all trade risks, AML flags, and audit trails.</p>
                 </CardContent>
               </Card>
            </TabsContent>
          </Tabs>
        )}

      </div>
    </DashboardLayout>
  );
}
