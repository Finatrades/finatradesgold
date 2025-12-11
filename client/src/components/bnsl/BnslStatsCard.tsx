import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, DollarSign, Calendar, Activity } from 'lucide-react';

interface BnslStatsCardProps {
  label: string;
  value: string;
  subValue?: string;
  icon: React.ElementType;
  tooltip?: string;
  trend?: 'up' | 'down' | 'neutral';
  accentColor?: string;
}

export default function BnslStatsCard({ label, value, subValue, icon: Icon, tooltip, trend, accentColor = "text-[#D4AF37]" }: BnslStatsCardProps) {
  return (
    <Card className="bg-white/5 border-white/10 backdrop-blur-sm relative overflow-hidden group hover:border-white/20 transition-colors">
      <div className={`absolute top-0 right-0 p-3 opacity-10 ${accentColor}`}>
        <Icon className="w-16 h-16" />
      </div>
      <CardContent className="p-6 relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div className={`p-2 bg-white/5 rounded-lg ${accentColor}`}>
            <Icon className="w-5 h-5" />
          </div>
          {tooltip && (
            <div className="text-xs text-white/40 cursor-help" title={tooltip}>
              Info
            </div>
          )}
        </div>
        
        <div>
          <h3 className={`text-2xl font-bold text-white mb-1`}>{value}</h3>
          <p className="text-sm text-white/60 font-medium mb-1">{label}</p>
          {subValue && (
            <p className="text-xs text-white/40">{subValue}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
