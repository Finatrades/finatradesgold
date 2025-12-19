import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TradeCase } from '@/types/finabridge';
import { Eye, Clock, CheckCircle2, XCircle, AlertCircle, FileText, Lock } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface TradeCaseListProps {
  cases: TradeCase[];
  onViewCase: (tradeCase: TradeCase) => void;
  onCreateNew: () => void;
}

export default function TradeCaseList({ cases, onViewCase, onCreateNew }: TradeCaseListProps) {
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Draft': return <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-500/20">Draft</Badge>;
      case 'Awaiting Funding': return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Awaiting Funding</Badge>;
      case 'Funded – Docs Pending': return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">Funded</Badge>;
      case 'Under Review': return <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">Under Review</Badge>;
      case 'Approved – Ready to Release': return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Approved</Badge>;
      case 'Released': return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Released</Badge>;
      case 'Rejected': return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">Rejected</Badge>;
      default: return <Badge variant="outline" className="bg-muted text-muted-foreground border-border">Unknown</Badge>;
    }
  };

  return (
    <Card className="bg-white shadow-sm border border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-6">
        <div>
          <CardTitle className="text-xl font-bold text-foreground">Active Trades</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Manage your ongoing trade finance deals.</p>
        </div>
        <Button onClick={onCreateNew} className="bg-primary text-white hover:bg-primary/90 font-bold">
          + Create New Trade
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground">Trade ID</TableHead>
              <TableHead className="text-muted-foreground">Exporter</TableHead>
              <TableHead className="text-muted-foreground">Value (USD)</TableHead>
              <TableHead className="text-muted-foreground">Locked Gold</TableHead>
              <TableHead className="text-muted-foreground">Status</TableHead>
              <TableHead className="text-muted-foreground text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  No trades found. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              cases.map((c) => (
                <TableRow key={c.id} className="border-border hover:bg-muted/50 transition-colors">
                  <TableCell className="font-mono text-secondary">{c.id}</TableCell>
                  <TableCell className="text-foreground font-medium">
                    <div className="flex flex-col">
                      <span>{c.role === 'Importer' ? c.seller.company : c.buyer.company}</span>
                      {(c.seller.company.includes('Finatrades') || c.seller.company.includes('Pending')) && (
                        <span className="text-[10px] text-secondary flex items-center gap-1 mt-0.5">
                          <CheckCircle2 className="w-3 h-3" /> Admin Involved
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-foreground/80">${c.valueUsd.toLocaleString()}</TableCell>
                  <TableCell className="text-foreground/80 flex items-center gap-2">
                    {c.lockedGoldGrams > 0 && <Lock className="w-3 h-3 text-purple-500" />}
                    {c.lockedGoldGrams.toFixed(3)} g
                  </TableCell>
                  <TableCell>{getStatusBadge(c.status)}</TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => onViewCase(c)}
                      className="text-muted-foreground hover:text-foreground hover:bg-muted"
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
