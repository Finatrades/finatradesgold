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

export default function BnslStatsCard({ label, value, subValue, icon: Icon, tooltip, trend, accentColor = "text-secondary" }: BnslStatsCardProps) {
  return (
    <Card className="bg-white shadow-sm border border-border relative overflow-hidden group hover:border-secondary/50 transition-colors">
      <div className={`absolute top-0 right-0 p-3 opacity-5 ${accentColor}`}>
        <Icon className="w-16 h-16" />
      </div>
      <CardContent className="p-6 relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div className={`p-2 bg-muted rounded-lg ${accentColor}`}>
            <Icon className="w-5 h-5" />
          </div>
          {tooltip && (
            <div className="text-xs text-muted-foreground cursor-help" title={tooltip}>
              Info
            </div>
          )}
        </div>
        
        <div>
          <h3 className={`text-2xl font-bold text-foreground mb-1`}>{value}</h3>
          <p className="text-sm text-muted-foreground font-medium mb-1">{label}</p>
          {subValue && (
            <p className="text-xs text-muted-foreground/70">{subValue}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
