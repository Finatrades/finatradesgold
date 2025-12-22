import React, { useState } from 'react';
import { DepositRequest } from '@/types/finavault';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, Package, Clock, ShieldCheck, AlertCircle, Search, Filter, MapPin, Database, Coins, Scale, Calendar, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import DigitalCertificateModal from './DigitalCertificateModal';

interface DepositListProps {
  requests: DepositRequest[];
  onSelectRequest: (request: DepositRequest) => void;
  onNewRequest: () => void;
}

export default function DepositList({ requests, onSelectRequest, onNewRequest }: DepositListProps) {
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [vaultFilter, setVaultFilter] = useState('all');
  const [selectedCertificate, setSelectedCertificate] = useState<DepositRequest | null>(null);

  // Filter Logic
  const filteredRequests = requests.filter(req => {
    const matchesSearch = req.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    const matchesVault = vaultFilter === 'all' || req.vaultLocation === vaultFilter;
    return matchesSearch && matchesStatus && matchesVault;
  });

  const getStatusBadge = (status: string) => {
    let colorClass = '';
    
    switch (status) {
      case 'Submitted':
        colorClass = 'bg-blue-500/10 text-blue-500 border-blue-500/20';
        break;
      case 'Under Review':
        colorClass = 'bg-purple-500/10 text-purple-500 border-purple-500/20';
        break;
      case 'Approved – Awaiting Delivery':
      case 'Approved':
        colorClass = 'bg-green-500/10 text-green-500 border-green-500/20';
        break;
      case 'Received at Vault':
        colorClass = 'bg-teal-500/10 text-teal-500 border-teal-500/20';
        break;
      case 'Received':
        colorClass = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
        break;
      case 'Transferred':
        colorClass = 'bg-purple-500/10 text-purple-500 border-purple-500/20';
        break;
      case 'Rejected':
      case 'Cancelled':
        colorClass = 'bg-red-500/10 text-red-500 border-red-500/20';
        break;
      default:
        colorClass = 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }

    return (
      <Badge variant="outline" className={`${colorClass} rounded-md font-medium border`}>
        {status}
      </Badge>
    );
  };

  return (
    <Card className="bg-white shadow-sm border border-border overflow-hidden">
      <DigitalCertificateModal 
        request={selectedCertificate} 
        open={!!selectedCertificate} 
        onOpenChange={(open) => !open && setSelectedCertificate(null)} 
      />
      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-border">
        <div>
          <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
             <div className="p-1.5 bg-secondary/10 rounded border border-secondary/20">
               <Database className="w-4 h-4 text-secondary" />
             </div>
             Vault Transaction Record
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Complete history and status of your vault activities.</p>
        </div>
        <Button 
          onClick={onNewRequest}
          className="bg-primary text-white hover:bg-primary/90 font-bold shadow-lg shadow-primary/20 rounded-full px-6"
        >
          <Plus className="w-4 h-4 mr-2" /> New Deposit Request
        </Button>
      </CardHeader>

      <div className="p-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by Request ID..." 
              className="pl-10 bg-background border-input text-foreground focus:ring-secondary focus:border-secondary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full md:w-[180px]">
             <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-background border-input text-foreground">
                   <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                   <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-foreground">
                   <SelectItem value="all">All Status</SelectItem>
                   <SelectItem value="Submitted">Submitted</SelectItem>
                   <SelectItem value="Under Review">Under Review</SelectItem>
                   <SelectItem value="Stored in Vault">Stored in Vault</SelectItem>
                </SelectContent>
             </Select>
          </div>
          <div className="w-full md:w-[180px]">
             <Select value={vaultFilter} onValueChange={setVaultFilter}>
                <SelectTrigger className="bg-background border-input text-foreground">
                   <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
                   <SelectValue placeholder="All Vaults" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-foreground">
                   <SelectItem value="all">All Vaults</SelectItem>
                   <SelectItem value="Dubai Vault">Dubai Vault</SelectItem>
                   <SelectItem value="Swiss Vault">Swiss Vault</SelectItem>
                </SelectContent>
             </Select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12">
               <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                 <Search className="w-8 h-8 text-muted-foreground" />
               </div>
               <h3 className="text-foreground font-medium mb-1">No requests found</h3>
               <p className="text-muted-foreground text-sm">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-xs font-semibold text-foreground uppercase tracking-wider bg-muted/40">
                  <th className="p-4 rounded-tl-lg">Request ID</th>
                  <th className="p-4">Weight</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Submitted</th>
                  <th className="p-4 text-center">Record</th>
                  <th className="p-4 rounded-tr-lg text-center">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRequests.map((req, index) => (
                  <motion.tr 
                    key={req.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-muted/50 transition-colors group cursor-pointer"
                    onClick={() => onSelectRequest(req)}
                  >
                    <td className="p-4 font-medium text-secondary hover:underline">
                      {req.id}
                    </td>
                    <td className="p-4">
                       <div className="font-bold text-foreground text-lg">{req.totalDeclaredWeightGrams} g</div>
                       <div className="text-xs text-muted-foreground">{(req.totalDeclaredWeightGrams / 31.1035).toFixed(2)} oz</div>
                    </td>
                    <td className="p-4 text-muted-foreground">
                       <div className="flex items-center gap-2">
                          {req.depositType === 'Bars' ? <Database className="w-4 h-4" /> : req.depositType === 'Coins' ? <Coins className="w-4 h-4" /> : <Scale className="w-4 h-4" />}
                          {req.depositType}
                       </div>
                    </td>
                    <td className="p-4">
                      {getStatusBadge(req.status)}
                    </td>
                    <td className="p-4 text-muted-foreground text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground/50" />
                        {new Date(req.submittedAt).toISOString().split('T')[0]}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-muted" onClick={(e) => { e.stopPropagation(); setSelectedCertificate(req); }}>
                        <FileText className="w-4 h-4" />
                      </Button>
                    </td>
                    <td className="p-4 text-center">
                       <Button variant="ghost" size="icon" className="text-secondary hover:bg-secondary/10" onClick={(e) => { e.stopPropagation(); onSelectRequest(req); }}>
                         <Eye className="w-4 h-4" />
                       </Button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Card>
  );
}

import { Plus } from 'lucide-react';
