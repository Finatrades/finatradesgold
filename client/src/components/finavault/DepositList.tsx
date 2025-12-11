import React from 'react';
import { DepositRequest } from '@/types/finavault';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, Package, Clock, ShieldCheck, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

interface DepositListProps {
  requests: DepositRequest[];
  onSelectRequest: (request: DepositRequest) => void;
  onNewRequest: () => void;
}

export default function DepositList({ requests, onSelectRequest, onNewRequest }: DepositListProps) {
  
  if (requests.length === 0) {
    return (
      <Card className="bg-white/5 border-white/10 backdrop-blur-sm min-h-[400px] flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
            <Package className="w-10 h-10 text-white/20" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Deposit Requests</h3>
          <p className="text-white/40 mb-8 max-w-sm mx-auto">
            You haven't submitted any gold deposit requests yet. Start by creating a new request.
          </p>
          <Button 
            onClick={onNewRequest}
            className="bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 font-bold px-8"
          >
            New Deposit Request
          </Button>
        </div>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    let colorClass = '';
    let icon = null;

    switch (status) {
      case 'Submitted':
      case 'Under Review':
        colorClass = 'bg-blue-500/10 text-blue-500 border-blue-500/20';
        icon = <Clock className="w-3 h-3 mr-1" />;
        break;
      case 'Approved – Awaiting Delivery':
        colorClass = 'bg-amber-500/10 text-amber-500 border-amber-500/20';
        icon = <AlertCircle className="w-3 h-3 mr-1" />;
        break;
      case 'Received at Vault':
        colorClass = 'bg-teal-500/10 text-teal-500 border-teal-500/20';
        icon = <Package className="w-3 h-3 mr-1" />;
        break;
      case 'Stored in Vault':
        colorClass = 'bg-green-500/10 text-green-500 border-green-500/20';
        icon = <ShieldCheck className="w-3 h-3 mr-1" />;
        break;
      case 'Rejected':
      case 'Cancelled':
        colorClass = 'bg-red-500/10 text-red-500 border-red-500/20';
        icon = <AlertCircle className="w-3 h-3 mr-1" />;
        break;
      default:
        colorClass = 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }

    return (
      <Badge variant="outline" className={`${colorClass} flex items-center w-fit`}>
        {icon}
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with New Button */}
      <div className="flex justify-end mb-2">
         <Button 
            onClick={onNewRequest}
            className="bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 font-bold"
          >
            + New Deposit Request
          </Button>
      </div>

      <Card className="bg-white/5 border-white/10 backdrop-blur-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-sm text-white/40 uppercase tracking-wider">
                <th className="p-4 font-medium">Request ID</th>
                <th className="p-4 font-medium">Vault Location</th>
                <th className="p-4 font-medium text-right">Weight</th>
                <th className="p-4 font-medium">Type</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {requests.map((req, index) => (
                <motion.tr 
                  key={req.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-white/5 transition-colors group"
                >
                  <td className="p-4 font-medium text-white">{req.id}</td>
                  <td className="p-4 text-white/80">{req.vaultLocation}</td>
                  <td className="p-4 text-right font-bold text-[#D4AF37]">
                    {req.totalDeclaredWeightGrams.toLocaleString()}g
                  </td>
                  <td className="p-4 text-white/60">{req.depositType}</td>
                  <td className="p-4">
                    {getStatusBadge(req.status)}
                  </td>
                  <td className="p-4 text-white/60 text-sm">
                    {new Date(req.submittedAt).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-right">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => onSelectRequest(req)}
                      className="text-white/60 hover:text-white hover:bg-white/10"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Details
                    </Button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
