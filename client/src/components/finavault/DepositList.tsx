import React, { useState } from 'react';
import { DepositRequest } from '@/types/finavault';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, Package, Clock, ShieldCheck, AlertCircle, Search, Filter, MapPin, Database, Coins, Scale, Calendar, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';

interface DepositListProps {
  requests: DepositRequest[];
  onSelectRequest: (request: DepositRequest) => void;
  onNewRequest: () => void;
}

export default function DepositList({ requests, onSelectRequest, onNewRequest }: DepositListProps) {
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [vaultFilter, setVaultFilter] = useState('all');

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
        colorClass = 'bg-amber-500/10 text-amber-500 border-amber-500/20';
        break;
      case 'Approved – Awaiting Delivery':
      case 'Approved':
        colorClass = 'bg-green-500/10 text-green-500 border-green-500/20';
        break;
      case 'Received at Vault':
        colorClass = 'bg-teal-500/10 text-teal-500 border-teal-500/20';
        break;
      case 'Stored in Vault':
        colorClass = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
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
    <Card className="bg-white/5 border-white/10 overflow-hidden shadow-sm backdrop-blur-sm">
      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-white/10">
        <div>
          <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
             <div className="p-1.5 bg-[#D4AF37]/10 rounded border border-[#D4AF37]/20">
               <Database className="w-4 h-4 text-[#D4AF37]" />
             </div>
             Vault Transaction Record
          </CardTitle>
          <p className="text-sm text-white/60 mt-1">Complete history and status of your vault activities.</p>
        </div>
        <Button 
          onClick={onNewRequest}
          className="bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 font-bold shadow-lg shadow-[#D4AF37]/20 rounded-full px-6"
        >
          <Plus className="w-4 h-4 mr-2" /> New Deposit Request
        </Button>
      </CardHeader>

      <div className="p-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input 
              placeholder="Search by Request ID..." 
              className="pl-10 bg-black/20 border-white/10 text-white focus:ring-[#D4AF37] focus:border-[#D4AF37]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full md:w-[180px]">
             <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-black/20 border-white/10 text-white">
                   <Filter className="w-4 h-4 mr-2 text-white/40" />
                   <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="bg-[#1A0A2E] border-white/10 text-white">
                   <SelectItem value="all">All Status</SelectItem>
                   <SelectItem value="Submitted">Submitted</SelectItem>
                   <SelectItem value="Under Review">Under Review</SelectItem>
                   <SelectItem value="Stored in Vault">Stored in Vault</SelectItem>
                </SelectContent>
             </Select>
          </div>
          <div className="w-full md:w-[180px]">
             <Select value={vaultFilter} onValueChange={setVaultFilter}>
                <SelectTrigger className="bg-black/20 border-white/10 text-white">
                   <MapPin className="w-4 h-4 mr-2 text-white/40" />
                   <SelectValue placeholder="All Vaults" />
                </SelectTrigger>
                <SelectContent className="bg-[#1A0A2E] border-white/10 text-white">
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
               <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                 <Search className="w-8 h-8 text-white/20" />
               </div>
               <h3 className="text-white font-medium mb-1">No requests found</h3>
               <p className="text-white/40 text-sm">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-xs font-semibold text-[#D4AF37] uppercase tracking-wider bg-[#D4AF37]/5">
                  <th className="p-4 rounded-tl-lg">Request ID</th>
                  <th className="p-4">Vault</th>
                  <th className="p-4">Weight</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Submitted</th>
                  <th className="p-4 text-center">Record</th>
                  <th className="p-4 rounded-tr-lg text-center">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredRequests.map((req, index) => (
                  <motion.tr 
                    key={req.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-white/5 transition-colors group cursor-pointer"
                    onClick={() => onSelectRequest(req)}
                  >
                    <td className="p-4 font-medium text-[#D4AF37] hover:underline">
                      {req.id}
                    </td>
                    <td className="p-4 text-white/80 font-medium">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-white/40" />
                        {req.vaultLocation}
                      </div>
                    </td>
                    <td className="p-4">
                       <div className="font-bold text-white text-lg">{req.totalDeclaredWeightGrams} g</div>
                       <div className="text-xs text-white/40">{(req.totalDeclaredWeightGrams / 31.1035).toFixed(2)} oz</div>
                    </td>
                    <td className="p-4 text-white/60">
                       <div className="flex items-center gap-2">
                          {req.depositType === 'Bars' ? <Database className="w-4 h-4" /> : req.depositType === 'Coins' ? <Coins className="w-4 h-4" /> : <Scale className="w-4 h-4" />}
                          {req.depositType}
                       </div>
                    </td>
                    <td className="p-4">
                      {getStatusBadge(req.status)}
                    </td>
                    <td className="p-4 text-white/60 text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-white/30" />
                        {new Date(req.submittedAt).toISOString().split('T')[0]}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <Button variant="ghost" size="icon" className="text-white/40 hover:text-white hover:bg-white/10" onClick={(e) => { e.stopPropagation(); /* TODO: Download handler */ }}>
                        <FileText className="w-4 h-4" />
                      </Button>
                    </td>
                    <td className="p-4 text-center">
                       <Button variant="ghost" size="icon" className="text-[#D4AF37] hover:bg-[#D4AF37]/10" onClick={(e) => { e.stopPropagation(); onSelectRequest(req); }}>
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
