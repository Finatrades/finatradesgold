import React from 'react';
import { DepositRequest, DepositRequestStatus } from '@/types/finavault';
import { CheckCircle2, Circle, Clock, Package, ShieldCheck, XCircle, FileText, Download, Truck, MapPin, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface RequestDetailsProps {
  request: DepositRequest;
  onClose: () => void;
  onCancel: (id: string) => void;
}

const STATUS_STEPS: DepositRequestStatus[] = [
  'Submitted',
  'Under Review',
  'Approved – Awaiting Delivery',
  'Received at Vault',
  'Stored in Vault'
];

export default function RequestDetails({ request, onClose, onCancel }: RequestDetailsProps) {
  
  const getStatusColor = (status: DepositRequestStatus) => {
    switch (status) {
      case 'Submitted': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'Under Review': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'Approved – Awaiting Delivery': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'Received at Vault': return 'bg-teal-500/10 text-teal-500 border-teal-500/20';
      case 'Stored in Vault': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'Rejected': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'Cancelled': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const isStepComplete = (step: string) => {
    const currentIndex = STATUS_STEPS.indexOf(request.status as any);
    const stepIndex = STATUS_STEPS.indexOf(step as any);
    return currentIndex >= stepIndex && !['Rejected', 'Cancelled'].includes(request.status);
  };

  const isStepCurrent = (step: string) => request.status === step;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            Request #{request.id}
            <Badge variant="outline" className={`${getStatusColor(request.status)}`}>
              {request.status}
            </Badge>
          </h2>
          <p className="text-white/60 mt-1 flex items-center gap-2">
            <MapPin className="w-4 h-4" /> {request.vaultLocation}
          </p>
        </div>
        <Button variant="outline" onClick={onClose} className="border-white/10 hover:bg-white/5">
          Back to List
        </Button>
      </div>

      {/* Status Timeline */}
      <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
        <CardContent className="pt-6">
          {['Rejected', 'Cancelled'].includes(request.status) ? (
            <div className="flex items-center gap-3 text-red-400 p-4 bg-red-500/10 rounded-lg border border-red-500/20">
              <XCircle className="w-6 h-6" />
              <div>
                <h4 className="font-bold">Request {request.status}</h4>
                {request.rejectionReason && <p className="text-sm opacity-80">{request.rejectionReason}</p>}
              </div>
            </div>
          ) : (
            <div className="relative flex justify-between">
              {STATUS_STEPS.map((step, index) => {
                const completed = isStepComplete(step);
                const current = isStepCurrent(step);
                
                return (
                  <div key={step} className="flex flex-col items-center relative z-10 w-full">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors duration-300 ${
                      completed || current 
                        ? 'bg-[#D4AF37] border-[#D4AF37] text-black' 
                        : 'bg-[#0D0515] border-white/20 text-white/20'
                    }`}>
                      {completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                    </div>
                    <span className={`text-xs mt-2 text-center max-w-[100px] font-medium transition-colors duration-300 ${
                      current ? 'text-[#D4AF37]' : completed ? 'text-white' : 'text-white/30'
                    }`}>
                      {step}
                    </span>
                    
                    {/* Progress Bar Line */}
                    {index < STATUS_STEPS.length - 1 && (
                      <div className="absolute top-4 left-1/2 w-full h-[2px] -z-10 bg-white/10">
                        <div 
                          className="h-full bg-[#D4AF37] transition-all duration-500"
                          style={{ width: isStepComplete(STATUS_STEPS[index + 1]) ? '100%' : '0%' }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Gold Summary */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-lg font-medium text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-[#D4AF37]" />
                Deposit Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 rounded-lg bg-white/5">
                  <dt className="text-sm text-white/40 mb-1">Total Weight</dt>
                  <dd className="text-xl font-bold text-[#D4AF37]">{request.totalDeclaredWeightGrams.toLocaleString()}g</dd>
                </div>
                <div className="p-3 rounded-lg bg-white/5">
                  <dt className="text-sm text-white/40 mb-1">Type</dt>
                  <dd className="text-lg font-medium text-white">{request.depositType}</dd>
                </div>
                <div className="p-3 rounded-lg bg-white/5">
                  <dt className="text-sm text-white/40 mb-1">Items</dt>
                  <dd className="text-lg font-medium text-white">{request.items.length}</dd>
                </div>
                <div className="p-3 rounded-lg bg-white/5">
                  <dt className="text-sm text-white/40 mb-1">Date</dt>
                  <dd className="text-lg font-medium text-white">{new Date(request.submittedAt).toLocaleDateString()}</dd>
                </div>
              </dl>

              <div className="mt-6">
                <h4 className="text-sm font-medium text-white/60 mb-3">Item Details</h4>
                <div className="border border-white/10 rounded-lg overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-white/5 text-white/60">
                      <tr>
                        <th className="px-4 py-2 font-medium">Type</th>
                        <th className="px-4 py-2 font-medium">Brand</th>
                        <th className="px-4 py-2 font-medium">Purity</th>
                        <th className="px-4 py-2 font-medium text-right">Weight/Unit</th>
                        <th className="px-4 py-2 font-medium text-right">Qty</th>
                        <th className="px-4 py-2 font-medium text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-white">
                      {request.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3">{item.itemType}</td>
                          <td className="px-4 py-3 text-white/80">{item.brand}</td>
                          <td className="px-4 py-3 text-white/60">{item.purity}</td>
                          <td className="px-4 py-3 text-right text-white/60">{item.weightPerUnitGrams}g</td>
                          <td className="px-4 py-3 text-right">{item.quantity}</td>
                          <td className="px-4 py-3 text-right font-medium text-[#D4AF37]">{item.totalWeightGrams}g</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-lg font-medium text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#D4AF37]" />
                Attached Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {request.documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{doc.type}</p>
                        <p className="text-xs text-white/40">{doc.name}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-white/60 hover:text-[#D4AF37]">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Right Column - Info & Actions */}
        <div className="space-y-6">
          
          {/* Delivery Info */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-lg font-medium text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#D4AF37]" />
                Delivery Method
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-300 text-sm font-medium flex items-center gap-2">
                <Info className="w-4 h-4" />
                {request.deliveryMethod}
              </div>
              
              {request.deliveryMethod === 'Pickup' && request.pickupDetails && (
                <div className="space-y-3 text-sm">
                   <div>
                     <span className="block text-white/40 text-xs uppercase tracking-wider mb-1">Pickup Address</span>
                     <p className="text-white bg-white/5 p-2 rounded border border-white/5">{request.pickupDetails.address}</p>
                   </div>
                   <div className="grid grid-cols-2 gap-2">
                     <div>
                       <span className="block text-white/40 text-xs uppercase tracking-wider mb-1">Contact</span>
                       <p className="text-white">{request.pickupDetails.contactName}</p>
                     </div>
                     <div>
                       <span className="block text-white/40 text-xs uppercase tracking-wider mb-1">Mobile</span>
                       <p className="text-white">{request.pickupDetails.contactMobile}</p>
                     </div>
                   </div>
                   <div className="grid grid-cols-2 gap-2">
                     <div>
                       <span className="block text-white/40 text-xs uppercase tracking-wider mb-1">Date</span>
                       <p className="text-white">{request.pickupDetails.date}</p>
                     </div>
                     <div>
                       <span className="block text-white/40 text-xs uppercase tracking-wider mb-1">Time</span>
                       <p className="text-white">{request.pickupDetails.timeSlot}</p>
                     </div>
                   </div>
                </div>
              )}

              {request.status === 'Approved – Awaiting Delivery' && (
                 <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-300 text-sm">
                   <p className="font-bold mb-1">Action Required:</p>
                   Please deliver your gold to the vault address provided in your email, quoting Reference #{request.id}.
                 </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          {request.status === 'Submitted' && (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="pt-6">
                 <Button 
                   variant="destructive" 
                   className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20"
                   onClick={() => onCancel(request.id)}
                 >
                   Cancel Request
                 </Button>
              </CardContent>
            </Card>
          )}

          {request.status === 'Stored in Vault' && (
             <Card className="bg-green-500/5 border-green-500/10">
               <CardContent className="pt-6 text-center">
                 <div className="w-12 h-12 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                   <ShieldCheck className="w-6 h-6" />
                 </div>
                 <h3 className="text-green-500 font-bold mb-1">Securely Stored</h3>
                 <p className="text-white/40 text-xs mb-4">Vault Ref: {request.vaultInternalReference || 'PENDING'}</p>
                 <Button className="w-full bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90">
                   Download Vault Receipt
                 </Button>
               </CardContent>
             </Card>
          )}

        </div>
      </div>
    </div>
  );
}
