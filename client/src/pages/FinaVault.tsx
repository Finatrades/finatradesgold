import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { Database, TrendingUp, DollarSign, Globe, History, PlusCircle, Bell, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import DepositList from '@/components/finavault/DepositList';
import NewDepositForm from '@/components/finavault/NewDepositForm';
import RequestDetails from '@/components/finavault/RequestDetails';
import { DepositRequest, DepositRequestStatus } from '@/types/finavault';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

// Mock Data
const MOCK_REQUESTS: DepositRequest[] = [
  {
    id: 'FD-2024-0042',
    userId: 'user-1',
    vaultLocation: 'Swiss Vault',
    depositType: 'Bars',
    totalDeclaredWeightGrams: 1000,
    items: [
      { id: '1', itemType: 'Bar', quantity: 1, weightPerUnitGrams: 1000, totalWeightGrams: 1000, purity: '999.9', brand: 'PAMP' }
    ],
    deliveryMethod: 'Courier',
    documents: [],
    status: 'Stored in Vault',
    submittedAt: '2024-11-15T10:00:00Z',
    vaultInternalReference: 'CH-ZH-99281'
  },
  {
    id: 'FD-2024-0089',
    userId: 'user-1',
    vaultLocation: 'Dubai Vault',
    depositType: 'Mixed',
    totalDeclaredWeightGrams: 250,
    items: [
      { id: '1', itemType: 'Bar', quantity: 2, weightPerUnitGrams: 100, totalWeightGrams: 200, purity: '999.9', brand: 'Valcambi' },
      { id: '2', itemType: 'Coin', quantity: 5, weightPerUnitGrams: 10, totalWeightGrams: 50, purity: '999.9', brand: 'Maple Leaf' }
    ],
    deliveryMethod: 'Walk-in',
    documents: [],
    status: 'Approved – Awaiting Delivery',
    submittedAt: '2024-12-05T14:30:00Z'
  },
  {
     id: 'FD-2024-0091',
     userId: 'user-1',
     vaultLocation: 'Dubai Vault',
     depositType: 'Coins',
     totalDeclaredWeightGrams: 250,
     items: [
       { id: '1', itemType: 'Coin', quantity: 25, weightPerUnitGrams: 10, totalWeightGrams: 250, purity: '999.9', brand: 'Britannia' }
     ],
     deliveryMethod: 'Pickup',
     pickupDetails: {
        address: 'Downtown Dubai',
        contactName: 'John Doe',
        contactMobile: '+971500000000',
        date: '2024-12-10',
        timeSlot: '10:00 - 12:00'
     },
     documents: [],
     status: 'Under Review',
     submittedAt: '2024-12-03T09:15:00Z'
   }
];

export default function FinaVault() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [activeTab, setActiveTab] = useState('my-deposits');
  const [requests, setRequests] = useState<DepositRequest[]>(MOCK_REQUESTS);
  const [selectedRequest, setSelectedRequest] = useState<DepositRequest | null>(null);

  // Handlers
  const handleNewRequest = (data: Omit<DepositRequest, 'id' | 'status' | 'submittedAt'>) => {
    const newRequest: DepositRequest = {
      ...data,
      id: `FD-2025-${Math.floor(Math.random() * 1000).toString().padStart(4, '0')}`,
      status: 'Submitted',
      submittedAt: new Date().toISOString(),
    };
    
    setRequests(prev => [newRequest, ...prev]);
    setActiveTab('my-deposits');
    setSelectedRequest(newRequest); // Auto-open details
    
    toast({
      title: "Request Submitted",
      description: `Deposit request #${newRequest.id} has been created successfully.`,
    });
  };

  const handleCancelRequest = (id: string) => {
    setRequests(prev => prev.map(req => 
      req.id === id ? { ...req, status: 'Cancelled' as DepositRequestStatus } : req
    ));
    if (selectedRequest?.id === id) {
      setSelectedRequest(prev => prev ? { ...prev, status: 'Cancelled' as DepositRequestStatus } : null);
    }
    toast({
      title: "Request Cancelled",
      description: "The deposit request has been cancelled.",
    });
  };

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-[#D4AF37]/10 rounded-lg border border-[#D4AF37]/20 text-[#D4AF37]">
                <Database className="w-6 h-6" />
             </div>
             <h1 className="text-2xl font-bold text-white">
               FinaVault — <span className="text-white/60 font-normal">Gold Deposit</span>
             </h1>
          </div>
          
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10 rounded-full">
               <Bell className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10 rounded-full">
               <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
        
        {/* KPI Cards Strip */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
           {/* Card 1: Total Gold - Custom Style */}
           <div className="p-6 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-white relative overflow-hidden group">
              <div className="flex justify-between items-start mb-2">
                 <span className="text-sm font-medium opacity-60">Total Gold</span>
                 <div className="p-2 bg-[#D4AF37]/20 rounded-lg text-[#D4AF37]">
                    <Database className="w-4 h-4" />
                 </div>
              </div>
              <div className="text-3xl font-bold mb-1 text-[#D4AF37]">1,500.00 <span className="text-lg font-normal opacity-60 text-white">g</span></div>
              <div className="text-sm opacity-50 font-medium">48.23 oz</div>
           </div>

           {/* Card 2: Locked Gold */}
           <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-white relative overflow-hidden">
              <div className="flex justify-between items-start mb-2">
                 <span className="text-sm font-medium opacity-60">Locked Gold</span>
                 <div className="p-2 bg-[#FFD700]/20 rounded-lg text-[#FFD700]">
                    <TrendingUp className="w-4 h-4" />
                 </div>
              </div>
              <div className="text-3xl font-bold mb-1">500.00 <span className="text-lg font-normal opacity-60">g</span></div>
              <div className="text-sm opacity-50 font-medium">In BNSL</div>
           </div>

           {/* Card 3: Value USD */}
           <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-white relative overflow-hidden">
              <div className="flex justify-between items-start mb-2">
                 <span className="text-sm font-medium opacity-60">Value (USD)</span>
                 <div className="p-2 bg-green-500/20 rounded-lg text-green-500">
                    <DollarSign className="w-4 h-4" />
                 </div>
              </div>
              <div className="text-3xl font-bold text-[#D4AF37] mb-1">$127,830</div>
              <div className="text-sm opacity-50 font-medium">@ $85.22/g</div>
           </div>

           {/* Card 4: Value AED */}
           <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-white relative overflow-hidden">
              <div className="flex justify-between items-start mb-2">
                 <span className="text-sm font-medium opacity-60">Value (AED)</span>
                 <div className="p-2 bg-blue-500/20 rounded-lg text-blue-500">
                    <Globe className="w-4 h-4" />
                 </div>
              </div>
              <div className="text-3xl font-bold text-white mb-1">469.5K</div>
              <div className="text-sm opacity-50 font-medium">@ 312.76/g</div>
           </div>
        </div>

        {/* Main Content */}
        <AnimatePresence mode="wait">
          {selectedRequest ? (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <RequestDetails 
                request={selectedRequest} 
                onClose={() => setSelectedRequest(null)}
                onCancel={handleCancelRequest}
              />
            </motion.div>
          ) : (
            <motion.div
              key="tabs"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                {activeTab === 'new-request' && (
                  <TabsList className="bg-white/5 border border-white/10 p-1 mb-8 w-full md:w-auto flex">
                    <TabsTrigger 
                      value="my-deposits"
                      className="flex-1 md:flex-none data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black"
                    >
                      <History className="w-4 h-4 mr-2" />
                      My Deposits
                    </TabsTrigger>
                    <TabsTrigger 
                      value="new-request"
                      className="flex-1 md:flex-none data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black"
                    >
                      <PlusCircle className="w-4 h-4 mr-2" />
                      New Deposit Request
                    </TabsTrigger>
                  </TabsList>
                )}

                <TabsContent value="my-deposits" className="mt-0">
                  <DepositList 
                    requests={requests} 
                    onSelectRequest={setSelectedRequest}
                    onNewRequest={() => setActiveTab('new-request')}
                  />
                </TabsContent>

                <TabsContent value="new-request">
                  <NewDepositForm 
                    onSubmit={handleNewRequest}
                    onCancel={() => setActiveTab('my-deposits')}
                  />
                </TabsContent>
              </Tabs>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </DashboardLayout>
  );
}
