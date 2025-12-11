import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { Database, Shield, History, PlusCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import DepositList from '@/components/finavault/DepositList';
import NewDepositForm from '@/components/finavault/NewDepositForm';
import RequestDetails from '@/components/finavault/RequestDetails';
import { DepositRequest, DepositRequestStatus } from '@/types/finavault';
import { useToast } from '@/hooks/use-toast';

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
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Database className="w-8 h-8 text-[#D4AF37]" />
              FinaVault
            </h1>
            <p className="text-white/60">Secure physical gold storage and deposit management.</p>
          </div>
          
          {/* Summary Strip */}
          <div className="flex gap-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 min-w-[140px]">
               <div className="text-xs text-white/40 mb-1">Stored Gold</div>
               <div className="text-xl font-bold text-[#D4AF37]">1,250g</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 min-w-[140px]">
               <div className="text-xs text-white/40 mb-1">Active Deposits</div>
               <div className="text-xl font-bold text-white">{requests.filter(r => !['Stored in Vault', 'Cancelled', 'Rejected'].includes(r.status)).length}</div>
            </div>
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

                <TabsContent value="my-deposits">
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
