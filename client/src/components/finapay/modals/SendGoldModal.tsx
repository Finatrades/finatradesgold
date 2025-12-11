import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, QrCode, Scan, Upload, X, ArrowRightLeft, User, Search } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SendGoldModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletBalance: number; // USD Balance
  goldBalance: number;   // Gold Balance in Grams
  onConfirm: (recipient: string, amount: number, asset: 'USD' | 'GOLD') => void;
}

const RECENT_CONTACTS = [
  { id: 'u1', name: 'Alex Johnson', username: '@alex_crypto', avatar: 'AJ' },
  { id: 'u2', name: 'Sarah Smith', username: '@sarah_gold', avatar: 'SS' },
  { id: 'u3', name: 'Mike Ross', username: '@mike_r', avatar: 'MR' },
  { id: 'u4', name: 'Emily Chen', username: '@emily_c', avatar: 'EC' },
];

export default function SendGoldModal({ isOpen, onClose, walletBalance, goldBalance, onConfirm }: SendGoldModalProps) {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [assetType, setAssetType] = useState<'USD' | 'GOLD'>('USD');
  const [note, setNote] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('direct');
  const [attachment, setAttachment] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setRecipient('');
      setAmount('');
      setAssetType('USD');
      setNote('');
      setOtp('');
      setIsLoading(false);
      setActiveTab('direct');
      setAttachment(null);
    }
  }, [isOpen]);

  const numericAmount = parseFloat(amount) || 0;
  
  // Determine max balance based on asset type
  const currentBalance = assetType === 'USD' ? walletBalance : goldBalance;
  const currencyLabel = assetType === 'USD' ? '$' : 'g';

  const handleSendOtp = () => {
    setStep(2);
  };

  const handleConfirm = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onConfirm(recipient, numericAmount, assetType);
    }, 1500);
  };

  const handleAttachment = () => {
    setAttachment('invoice_123.pdf');
  };

  const handleContactSelect = (username: string) => {
    setRecipient(username);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white border-border text-foreground sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <span className={assetType === 'USD' ? "text-green-600" : "text-secondary"}>
              Send {assetType === 'USD' ? 'USD' : 'Gold'}
            </span>
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Transfer assets instantly to another FinaPay user.
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted border border-border mb-4">
              <TabsTrigger value="direct">Direct Send</TabsTrigger>
              <TabsTrigger value="scan">Scan QR</TabsTrigger>
            </TabsList>

            <TabsContent value="direct" className="space-y-4">
              
              {/* Asset Selection */}
              <div className="flex justify-center bg-muted p-1 rounded-lg border border-border">
                 <button 
                   onClick={() => setAssetType('USD')}
                   className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${assetType === 'USD' ? 'bg-green-600 text-white' : 'text-muted-foreground hover:text-foreground'}`}
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
                <Label>Recipient</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Username, Email, or ID" 
                    className="bg-background border-input pl-9"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
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
                <div className="flex justify-between">
                  <Label>Amount ({assetType})</Label>
                  <span className="text-xs text-muted-foreground">
                    Available: {assetType === 'USD' ? '$' : ''}{currentBalance.toFixed(assetType === 'USD' ? 2 : 4)}{assetType === 'GOLD' ? ' g' : ''}
                  </span>
                </div>
                <div className="relative">
                   <Input 
                     type="number" 
                     placeholder="0.00" 
                     className="bg-background border-input pl-8 text-lg font-medium"
                     value={amount}
                     onChange={(e) => setAmount(e.target.value)}
                   />
                   <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">{currencyLabel}</span>
                   <Button 
                     size="sm" 
                     variant="ghost" 
                     className="absolute right-1 top-1/2 -translate-y-1/2 h-7 text-xs text-secondary hover:text-secondary/80"
                     onClick={() => setAmount(currentBalance.toString())}
                   >
                     MAX
                   </Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                   <Label>Note (Optional)</Label>
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
                    placeholder="What's this for?" 
                    className="bg-background border-input resize-none h-20"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                )}
              </div>

              <Button 
                className={`w-full text-white font-bold ${assetType === 'USD' ? 'bg-green-600 hover:bg-green-700' : 'bg-secondary hover:bg-secondary/90'}`}
                disabled={!recipient || numericAmount <= 0 || numericAmount > currentBalance}
                onClick={handleSendOtp}
              >
                Next
              </Button>
            </TabsContent>

            <TabsContent value="scan" className="space-y-4">
              <div className="bg-muted/50 border-2 border-dashed border-border rounded-xl h-[250px] flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer hover:border-green-500/50 transition-colors">
                 <div className="absolute inset-0 bg-gradient-to-b from-transparent via-green-500/5 to-transparent animate-pulse pointer-events-none" />
                 <Scan className="w-12 h-12 text-muted-foreground mb-3 group-hover:text-green-500 transition-colors" />
                 <p className="text-muted-foreground text-sm font-medium">Click to Activate Camera</p>
              </div>
              
              <Button 
                className="w-full bg-muted text-foreground hover:bg-muted/80"
                onClick={() => {
                   setRecipient('@qr_scanned_user');
                   setActiveTab('direct');
                }}
              >
                Simulate Scan
              </Button>
            </TabsContent>
          </Tabs>
        )}

        {step === 2 && (
          <div className="space-y-6 py-4">
            <div className="bg-muted/30 p-6 rounded-xl border border-border text-center space-y-4">
               <div className="space-y-1">
                 <p className="text-muted-foreground text-sm uppercase tracking-wider">Review Transfer</p>
                 <div className="flex items-center justify-center gap-2 text-2xl font-bold text-foreground">
                   <Avatar className="w-8 h-8 border border-border">
                      <AvatarFallback className="bg-secondary text-white text-xs font-bold">ME</AvatarFallback>
                   </Avatar>
                   <ArrowRightLeft className="w-5 h-5 text-muted-foreground" />
                   <Avatar className="w-8 h-8 border border-border">
                      <AvatarFallback className="bg-muted text-muted-foreground text-xs">TO</AvatarFallback>
                   </Avatar>
                 </div>
               </div>
               
               <div>
                 <p className={`text-3xl font-bold ${assetType === 'USD' ? 'text-green-600' : 'text-secondary'}`}>
                   {assetType === 'USD' ? '$' : ''}{numericAmount.toFixed(assetType === 'USD' ? 2 : 4)}{assetType === 'GOLD' ? ' g' : ''}
                 </p>
                 <p className="text-muted-foreground text-sm mt-1">{recipient}</p>
               </div>
            </div>

            <div className="space-y-3">
              <Label className="text-center block w-full">Security Verification</Label>
              <div className="relative">
                <Input 
                  placeholder="000000" 
                  className="bg-background border-input text-center tracking-[0.5em] text-2xl font-mono h-14"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">Enter the 6-digit code sent to your device.</p>
            </div>

            <Button 
              className={`w-full text-white font-bold h-12 ${assetType === 'USD' ? 'bg-green-600 hover:bg-green-700' : 'bg-secondary hover:bg-secondary/90'}`}
              disabled={otp.length < 4 || isLoading}
              onClick={handleConfirm}
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Send className="w-5 h-5 mr-2" />}
              Confirm Transfer
            </Button>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}
