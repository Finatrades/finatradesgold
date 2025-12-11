import React, { useState } from 'react';
import { DepositRequest } from '@/types/finavault';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, Package, Clock, ShieldCheck, AlertCircle, Search, Filter, MapPin, Database, Coins, Scale, Calendar } from 'lucide-react';
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
        colorClass = 'bg-blue-100 text-blue-700 border-blue-200';
        break;
      case 'Under Review':
        colorClass = 'bg-yellow-100 text-yellow-700 border-yellow-200';
        break;
      case 'Approved – Awaiting Delivery':
      case 'Approved':
        colorClass = 'bg-green-100 text-green-700 border-green-200';
        break;
      case 'Received at Vault':
        colorClass = 'bg-teal-100 text-teal-700 border-teal-200';
        break;
      case 'Stored in Vault':
        colorClass = 'bg-emerald-100 text-emerald-700 border-emerald-200';
        break;
      case 'Rejected':
      case 'Cancelled':
        colorClass = 'bg-red-100 text-red-700 border-red-200';
        break;
      default:
        colorClass = 'bg-gray-100 text-gray-700 border-gray-200';
    }

    return (
      <Badge variant="outline" className={`${colorClass} rounded-md font-medium border`}>
        {status}
      </Badge>
    );
  };

  return (
    <Card className="bg-white border-white/20 overflow-hidden shadow-sm">
      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-gray-100">
        <div>
          <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
             <div className="p-1.5 bg-[#D4AF37]/10 rounded border border-[#D4AF37]/20">
               <Database className="w-4 h-4 text-[#D4AF37]" />
             </div>
             Gold Deposits — My Requests
          </CardTitle>
          <p className="text-sm text-gray-500 mt-1">Track all current and past gold deposit requests.</p>
        </div>
        <Button 
          onClick={onNewRequest}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium shadow-lg shadow-purple-500/20 rounded-full px-6"
        >
          <Plus className="w-4 h-4 mr-2" /> New Deposit Request
        </Button>
      </CardHeader>

      <div className="p-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              placeholder="Search by Request ID..." 
              className="pl-10 bg-gray-50 border-gray-200 text-gray-900 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full md:w-[180px]">
             <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-white border-gray-200 text-gray-700">
                   <Filter className="w-4 h-4 mr-2 text-gray-400" />
                   <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 text-gray-900">
                   <SelectItem value="all">All Status</SelectItem>
                   <SelectItem value="Submitted">Submitted</SelectItem>
                   <SelectItem value="Under Review">Under Review</SelectItem>
                   <SelectItem value="Stored in Vault">Stored in Vault</SelectItem>
                </SelectContent>
             </Select>
          </div>
          <div className="w-full md:w-[180px]">
             <Select value={vaultFilter} onValueChange={setVaultFilter}>
                <SelectTrigger className="bg-white border-gray-200 text-gray-700">
                   <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                   <SelectValue placeholder="All Vaults" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 text-gray-900">
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
               <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                 <Search className="w-8 h-8 text-gray-300" />
               </div>
               <h3 className="text-gray-900 font-medium mb-1">No requests found</h3>
               <p className="text-gray-500 text-sm">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-semibold text-[#D4AF37] uppercase tracking-wider bg-[#FFF8E7]/30">
                  <th className="p-4 rounded-tl-lg">Request ID</th>
                  <th className="p-4">Vault</th>
                  <th className="p-4">Weight</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 rounded-tr-lg">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredRequests.map((req, index) => (
                  <motion.tr 
                    key={req.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50 transition-colors group cursor-pointer"
                    onClick={() => onSelectRequest(req)}
                  >
                    <td className="p-4 font-medium text-[#D4AF37] hover:underline">
                      {req.id}
                    </td>
                    <td className="p-4 text-gray-600 font-medium">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        {req.vaultLocation}
                      </div>
                    </td>
                    <td className="p-4">
                       <div className="font-bold text-gray-900 text-lg">{req.totalDeclaredWeightGrams} g</div>
                       <div className="text-xs text-gray-500">{(req.totalDeclaredWeightGrams / 31.1035).toFixed(2)} oz</div>
                    </td>
                    <td className="p-4 text-gray-600">
                       <div className="flex items-center gap-2">
                          {req.depositType === 'Bars' ? <Database className="w-4 h-4" /> : req.depositType === 'Coins' ? <Coins className="w-4 h-4" /> : <Scale className="w-4 h-4" />}
                          {req.depositType}
                       </div>
                    </td>
                    <td className="p-4">
                      {getStatusBadge(req.status)}
                    </td>
                    <td className="p-4 text-gray-500 text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-300" />
                        {new Date(req.submittedAt).toISOString().split('T')[0]}
                      </div>
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
