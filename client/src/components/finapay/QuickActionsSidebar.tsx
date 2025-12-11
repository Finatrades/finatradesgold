import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Minus, ArrowRight } from 'lucide-react';

interface QuickActionsSidebarProps {
  onAction: (action: string) => void;
}

export default function QuickActionsSidebar({ onAction }: QuickActionsSidebarProps) {
  return (
    <Card className="border border-gray-100 shadow-sm h-full">
      <CardHeader className="pb-2">
         <CardTitle className="text-lg font-bold text-gray-900">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-2">
        <Button 
          className="w-full justify-start h-14 text-left bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 group transition-all"
          onClick={() => onAction('buy')}
        >
           <div className="bg-white/20 p-2 rounded-lg mr-3 group-hover:bg-white/30 transition-colors">
              <Plus className="w-5 h-5 text-white" />
           </div>
           <div>
             <span className="block font-bold text-sm">Buy Gold</span>
             <span className="block text-[10px] text-white/80 font-normal">Purchase instantly</span>
           </div>
        </Button>

        <Button 
          variant="outline"
          className="w-full justify-start h-14 text-left border-gray-200 hover:bg-gray-50 hover:text-gray-900 group transition-all"
          onClick={() => onAction('sell')}
        >
           <div className="bg-gray-100 p-2 rounded-lg mr-3 group-hover:bg-gray-200 transition-colors">
              <Minus className="w-5 h-5 text-gray-600" />
           </div>
           <div>
             <span className="block font-bold text-sm text-gray-900">Sell Gold</span>
             <span className="block text-[10px] text-gray-400 font-normal">Redeem holdings</span>
           </div>
        </Button>

        <div className="pt-2">
           <Button variant="ghost" className="w-full text-xs text-gray-400 hover:text-gray-900 justify-between">
              View All Actions <ArrowRight className="w-3 h-3" />
           </Button>
        </div>
      </CardContent>
    </Card>
  );
}
