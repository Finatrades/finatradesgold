import React, { useState } from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Package, ShieldCheck, AlertTriangle, Plus, ArrowRight, Scale, Lock, MinusCircle, PlusCircle } from 'lucide-react';
import { usePlatform } from '@/context/PlatformContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function VaultManagement() {
  const { settings, updateInventory } = usePlatform();
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockAction, setStockAction] = useState<'add' | 'remove'>('add');
  const [stockAmount, setStockAmount] = useState('');

  // Derived Stats
  const availableLiquidity = settings.vaultInventoryGrams - settings.reservedGoldGrams;
  const coverageRatio = (settings.vaultInventoryGrams / settings.reservedGoldGrams) * 100;
  
  const handleStockUpdate = () => {
    const amount = parseFloat(stockAmount);
    if (!amount || amount <= 0) return;

    if (stockAction === 'remove' && amount > availableLiquidity) {
      toast.error("Cannot remove stock", { description: "Removal amount exceeds available liquidity." });
      return;
    }

    updateInventory(amount, stockAction);
    setIsStockModalOpen(false);
    setStockAmount('');
    toast.success("Vault Updated", { 
      description: `${stockAction === 'add' ? 'Added' : 'Removed'} ${amount}g from physical inventory.` 
    });
  };

  const inventory = [
    { id: "BAR-CH-8821", weight: "1000g", purity: "999.9", ref: "Valcambi", status: "Allocated", location: "Zone A-12" },
    { id: "BAR-CH-8822", weight: "1000g", purity: "999.9", ref: "PAMP", status: "Allocated", location: "Zone A-12" },
    { id: "BAR-CH-8823", weight: "500g", purity: "999.9", ref: "Argor-Heraeus", status: "Available", location: "Zone B-04" },
    { id: "BAR-CH-8824", weight: "100g", purity: "999.9", ref: "Valcambi", status: "Available", location: "Zone B-05" },
    { id: "BAR-CH-8825", weight: "1000g", purity: "999.9", ref: "PAMP", status: "Reserved", location: "Zone A-13" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Vault Management</h1>
            <p className="text-gray-500">Manage physical gold inventory and audit reconciliation.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setStockAction('remove'); setIsStockModalOpen(true); }}>
              <MinusCircle className="w-4 h-4 mr-2" /> Remove Stock
            </Button>
            <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => { setStockAction('add'); setIsStockModalOpen(true); }}>
              <PlusCircle className="w-4 h-4 mr-2" /> Add Physical Gold
            </Button>
          </div>
        </div>

        {/* Vault Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-slate-900 text-white border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Vault Coverage Ratio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-bold ${coverageRatio < 100 ? 'text-red-400' : 'text-white'}`}>
                  {coverageRatio.toFixed(1)}%
                </span>
                <span className={`text-sm ${coverageRatio < 100 ? 'text-red-400' : 'text-green-400'}`}>
                  {coverageRatio < 100 ? 'Under-collateralized' : 'Over-collateralized'}
                </span>
              </div>
              <Progress value={Math.min(coverageRatio, 100)} className={`h-2 mt-4 bg-slate-700 [&>div]:${coverageRatio < 100 ? "bg-red-500" : "bg-green-500"}`} />
              <p className="text-xs text-slate-400 mt-2">Physical Holdings vs Digital Liabilities</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Physical Inventory</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-100 text-yellow-700 rounded-lg">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{(settings.vaultInventoryGrams / 1000).toFixed(2)} kg</p>
                  <p className="text-xs text-gray-500">Total Weight in Vault</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Available Liquidity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 text-green-700 rounded-lg">
                  <Scale className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{(availableLiquidity / 1000).toFixed(2)} kg</p>
                  <p className="text-xs text-gray-500">Unallocated Gold for Sale</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Inventory List */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Gold Bar Inventory</CardTitle>
              <CardDescription>Registry of physical bars stored in Zurich Free Port</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {inventory.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-yellow-50 rounded flex items-center justify-center border border-yellow-100">
                        <Scale className="w-5 h-5 text-yellow-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{item.id}</p>
                        <p className="text-xs text-gray-500">{item.ref} • {item.purity}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="font-medium text-gray-900">{item.weight}</p>
                        <p className="text-xs text-gray-500">{item.location}</p>
                      </div>
                      <Badge variant="outline" className={
                        item.status === 'Allocated' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                        item.status === 'Available' ? 'bg-green-50 text-green-700 border-green-200' :
                        'bg-purple-50 text-purple-700 border-purple-200'
                      }>
                        {item.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                <Button variant="ghost" className="text-sm text-gray-500">View All Inventory <ArrowRight className="w-4 h-4 ml-1" /></Button>
              </div>
            </CardContent>
          </Card>

          {/* Reconciliation Actions */}
          <div className="space-y-6">
            <Card className="bg-purple-50 border-purple-100">
              <CardHeader>
                <CardTitle className="text-purple-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" /> Low Inventory Alert
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-purple-800 mb-4">
                  Available unallocated gold is below 10kg. Consider restocking to maintain liquidity buffer for BNSL operations.
                </p>
                <Button size="sm" className="w-full bg-purple-600 hover:bg-purple-700">Initiate Restock</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Vault Security</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                   <span className="text-gray-500">Access Control</span>
                   <Badge variant="outline" className="bg-green-50 text-green-700">Active</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                   <span className="text-gray-500">CCTV Monitoring</span>
                   <Badge variant="outline" className="bg-green-50 text-green-700">Online</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                   <span className="text-gray-500">Motion Sensors</span>
                   <Badge variant="outline" className="bg-green-50 text-green-700">Armed</Badge>
                </div>
                <Button variant="outline" className="w-full mt-2">
                  <Lock className="w-4 h-4 mr-2" /> Security Log
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Stock Management Modal */}
      <Dialog open={isStockModalOpen} onOpenChange={setIsStockModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{stockAction === 'add' ? 'Add Physical Inventory' : 'Remove Physical Inventory'}</DialogTitle>
            <DialogDescription>
              {stockAction === 'add' 
                ? 'Register new gold bars entering the vault.' 
                : 'Remove gold bars for physical delivery or audit adjustment.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Amount (Grams)</Label>
              <Input 
                type="number" 
                placeholder="e.g. 1000" 
                value={stockAmount}
                onChange={(e) => setStockAmount(e.target.value)}
              />
            </div>
            {stockAction === 'remove' && (
               <div className="bg-yellow-50 text-yellow-800 p-3 rounded text-sm">
                  Available for removal: {availableLiquidity.toFixed(2)}g
               </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStockModalOpen(false)}>Cancel</Button>
            <Button 
              className={stockAction === 'add' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
              onClick={handleStockUpdate}
            >
              {stockAction === 'add' ? 'Confirm Addition' : 'Confirm Removal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}