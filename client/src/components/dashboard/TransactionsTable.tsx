import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowUpRight, ArrowDownLeft, RefreshCw, ShoppingCart, DollarSign } from 'lucide-react';

interface Transaction {
  id: string;
  type: 'buy' | 'sell' | 'send' | 'receive' | 'bnsl' | 'trade';
  amount: string;
  value: string;
  date: string;
  status: 'completed' | 'pending';
}

const mockTransactions: Transaction[] = [
  { id: '1', type: 'buy', amount: '10.50 g', value: '-$896.70', date: 'Today, 10:23 AM', status: 'completed' },
  { id: '2', type: 'receive', amount: '5.00 g', value: '+$427.00', date: 'Yesterday, 4:15 PM', status: 'completed' },
  { id: '3', type: 'bnsl', amount: '50.00 g', value: '-$4,270.00', date: 'Dec 10, 2025', status: 'pending' },
  { id: '4', type: 'sell', amount: '2.50 g', value: '+$213.50', date: 'Dec 08, 2025', status: 'completed' },
  { id: '5', type: 'trade', amount: '100.00 g', value: '-$8,540.00', date: 'Dec 05, 2025', status: 'completed' },
];

const getIcon = (type: Transaction['type']) => {
  switch (type) {
    case 'buy': return <ShoppingCart className="w-4 h-4 text-green-400" />;
    case 'sell': return <DollarSign className="w-4 h-4 text-red-400" />;
    case 'send': return <ArrowUpRight className="w-4 h-4 text-orange-400" />;
    case 'receive': return <ArrowDownLeft className="w-4 h-4 text-blue-400" />;
    case 'bnsl': return <RefreshCw className="w-4 h-4 text-[#FF2FBF]" />;
    default: return <RefreshCw className="w-4 h-4 text-white" />;
  }
};

const getBgColor = (type: Transaction['type']) => {
  switch (type) {
    case 'buy': return 'bg-green-500/10';
    case 'sell': return 'bg-red-500/10';
    case 'send': return 'bg-orange-500/10';
    case 'receive': return 'bg-blue-500/10';
    case 'bnsl': return 'bg-[#FF2FBF]/10';
    default: return 'bg-white/10';
  }
};

export default function TransactionsTable() {
  return (
    <Card className="p-6 bg-white/5 border border-white/10 backdrop-blur-sm h-[400px] flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-white">Recent Transactions</h3>
        <Button variant="link" className="text-[#D4AF37] h-auto p-0 hover:text-[#D4AF37]/80">
          View all
        </Button>
      </div>

      <div className="overflow-y-auto flex-1 pr-2 space-y-3 custom-scrollbar">
        {mockTransactions.map((tx) => (
          <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getBgColor(tx.type)}`}>
                {getIcon(tx.type)}
              </div>
              <div>
                <p className="text-sm font-medium text-white capitalize">{tx.type} Gold</p>
                <p className="text-xs text-white/40">{tx.date}</p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-sm font-bold ${tx.value.startsWith('+') ? 'text-green-400' : 'text-white'}`}>
                {tx.value}
              </p>
              <p className="text-xs text-white/60">{tx.amount}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
