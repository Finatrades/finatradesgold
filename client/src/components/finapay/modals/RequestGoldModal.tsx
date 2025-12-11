import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowDownLeft, QrCode, Copy, Share2, Upload, X, User } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

interface RequestGoldModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (from: string, amount: number, asset: 'USD' | 'GOLD') => void;
}

const RECENT_CONTACTS = [
  { id: 'u1', name: 'Alex Johnson', username: '@alex_crypto', avatar: 'AJ' },
  { id: 'u2', name: 'Sarah Smith', username: '@sarah_gold', avatar: 'SS' },
  { id: 'u3', name: 'Mike Ross', username: '@mike_r', avatar: 'MR' },
  { id: 'u4', name: 'Emily Chen', username: '@emily_c', avatar: 'EC' },
];

export default function RequestGoldModal({ isOpen, onClose, onConfirm }: RequestGoldModalProps) {
  const { toast } = useToast();
  const [fromUser, setFromUser] = useState('');
  const [amount, setAmount] = useState('');
  const [assetType, setAssetType] = useState<'USD' | 'GOLD'>('USD');
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('request');
  const [attachment, setAttachment] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFromUser('');
      setAmount('');
      setAssetType('USD');
      setNote('');
      setIsLoading(false);
      setActiveTab('request');
      setAttachment(null);
    }
  }, [isOpen]);

  const numericAmount = parseFloat(amount) || 0;
  const currencyLabel = assetType === 'USD' ? '$' : 'g';

  const handleConfirm = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onConfirm(fromUser, numericAmount, assetType);
    }, 1000);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`https://finatrades.com/pay/user123`);
    toast({
      title: "Link Copied",
      description: "Payment link copied to clipboard.",
    });
  };

  const handleAttachment = () => {
    setAttachment('invoice_123.pdf');
  };

  const handleContactSelect = (username: string) => {
    setFromUser(username);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white border-border text-foreground sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <span className={assetType === 'USD' ? "text-blue-600" : "text-secondary"}>
              Request {assetType === 'USD' ? 'USD' : 'Gold'}
            </span>
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Request payment via ID or share a payment link.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-muted border border-border mb-4">
            <TabsTrigger value="request">Request from User</TabsTrigger>
            <TabsTrigger value="share">Share QR / Link</TabsTrigger>
          </TabsList>

          <TabsContent value="request" className="space-y-4">
            
            {/* Asset Selection */}
            <div className="flex justify-center bg-muted p-1 rounded-lg border border-border">
               <button 
                 onClick={() => setAssetType('USD')}
                 className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${assetType === 'USD' ? 'bg-blue-600 text-white' : 'text-muted-foreground hover:text-foreground'}`}
               >
                 USD ($)
               </button>
               <button 
                 onClick={() => setAssetType('GOLD')}
                 className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${assetType === 'GOLD' ? 'bg-secondary text-white' : 'text-muted-foreground hover:text-foreground'}`}
               >
                 Gold (g)
               </button>
            </div>

            <div className="space-y-3">
              <Label>Request From</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Username, Email, or ID" 
                  className="bg-background border-input pl-9"
                  value={fromUser}
                  onChange={(e) => setFromUser(e.target.value)}
                />
              </div>

              {/* Recent Contacts Horizontal Scroll */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Recent Contacts</Label>
                <ScrollArea className="w-full whitespace-nowrap">
                  <div className="flex gap-2 pb-2">
                    {RECENT_CONTACTS.map((contact) => (
                      <button
                        key={contact.id}
                        onClick={() => handleContactSelect(contact.username)}
                        className="flex flex-col items-center gap-1 min-w-[70px] p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                      >
                        <Avatar className="w-10 h-10 border border-border group-hover:border-secondary/30 transition-colors">
                          <AvatarFallback className="bg-muted text-muted-foreground text-xs">{contact.avatar}</AvatarFallback>
                        </Avatar>
                        <span className="text-[10px] text-muted-foreground truncate w-full text-center">{contact.name}</span>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Amount ({assetType})</Label>
              <div className="relative">
                 <Input 
                   type="number" 
                   placeholder="0.00" 
                   className="bg-background border-input pl-8 text-lg font-medium"
                   value={amount}
                   onChange={(e) => setAmount(e.target.value)}
                 />
                 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">{currencyLabel}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                 <Label>Description</Label>
                 <Button 
                   variant="ghost" 
                   size="sm" 
                   className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                   onClick={handleAttachment}
                 >
                   <Upload className="w-3 h-3 mr-1" />
                   Upload File
                 </Button>
              </div>

              {attachment ? (
                <div className="flex items-center justify-between bg-muted/30 p-2 rounded border border-border text-sm">
                  <div className="flex items-center text-foreground/80">
                    <Upload className="w-3 h-3 mr-2" />
                    {attachment}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-muted-foreground hover:text-red-500"
                    onClick={() => setAttachment(null)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <Textarea 
                  placeholder="Invoice #1024..." 
                  className="bg-background border-input resize-none h-20"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              )}
            </div>

            <Button 
              className={`w-full font-bold ${assetType === 'USD' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-secondary hover:bg-secondary/90 text-white'}`}
              disabled={!fromUser || numericAmount <= 0 || isLoading}
              onClick={handleConfirm}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowDownLeft className="w-4 h-4 mr-2" />}
              Send Request
            </Button>
          </TabsContent>

          <TabsContent value="share" className="space-y-6 py-2">
             <div className="flex flex-col items-center justify-center space-y-4">
                <div className="bg-white p-4 rounded-xl shadow-lg shadow-blue-500/10 border border-border">
                   <QrCode className="w-40 h-40 text-black" strokeWidth={1.5} />
                </div>
                <div className="text-center space-y-1">
                   <p className="text-lg font-bold text-foreground">@username</p>
                   <p className="text-sm text-muted-foreground">Scan to pay directly</p>
                </div>
             </div>

             <div className="space-y-3">
               <div className="flex gap-2">
                  <Input 
                    readOnly 
                    value="https://finatrades.com/pay/user123" 
                    className="bg-muted border-border text-muted-foreground"
                  />
                  <Button variant="outline" size="icon" className="border-border hover:bg-muted" onClick={copyLink}>
                     <Copy className="w-4 h-4" />
                  </Button>
               </div>
               <Button className="w-full bg-muted hover:bg-muted/80 text-foreground">
                  <Share2 className="w-4 h-4 mr-2" /> Share Link
               </Button>
             </div>
          </TabsContent>
        </Tabs>

      </DialogContent>
    </Dialog>
  );
}
