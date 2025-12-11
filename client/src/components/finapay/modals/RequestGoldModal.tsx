import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowDownLeft, QrCode, Copy, Share2, Link } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface RequestGoldModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (from: string, grams: number) => void;
}

export default function RequestGoldModal({ isOpen, onClose, onConfirm }: RequestGoldModalProps) {
  const { toast } = useToast();
  const [fromUser, setFromUser] = useState('');
  const [grams, setGrams] = useState('');
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('request');

  useEffect(() => {
    if (isOpen) {
      setFromUser('');
      setGrams('');
      setNote('');
      setIsLoading(false);
      setActiveTab('request');
    }
  }, [isOpen]);

  const numericGrams = parseFloat(grams) || 0;

  const handleConfirm = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onConfirm(fromUser, numericGrams);
    }, 1000);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`https://finatrades.com/pay/user123`);
    toast({
      title: "Link Copied",
      description: "Payment link copied to clipboard.",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1A0A2E] border-white/10 text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <span className="text-blue-400">Request Gold</span>
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Request payment via ID or share a payment link.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-black/20 border border-white/10 mb-4">
            <TabsTrigger value="request">Request from User</TabsTrigger>
            <TabsTrigger value="share">Share QR / Link</TabsTrigger>
          </TabsList>

          <TabsContent value="request" className="space-y-4">
            <div className="space-y-2">
              <Label>Request From (Email / ID)</Label>
              <Input 
                placeholder="friend@example.com" 
                className="bg-black/20 border-white/10"
                value={fromUser}
                onChange={(e) => setFromUser(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Amount (g)</Label>
              <Input 
                type="number" 
                placeholder="0.000" 
                className="bg-black/20 border-white/10"
                value={grams}
                onChange={(e) => setGrams(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                placeholder="Invoice #1024..." 
                className="bg-black/20 border-white/10 resize-none h-20"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <Button 
              className="w-full bg-blue-500 text-white hover:bg-blue-600 font-bold"
              disabled={!fromUser || numericGrams <= 0 || isLoading}
              onClick={handleConfirm}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowDownLeft className="w-4 h-4 mr-2" />}
              Send Request
            </Button>
          </TabsContent>

          <TabsContent value="share" className="space-y-6 py-2">
             <div className="flex flex-col items-center justify-center space-y-4">
                <div className="bg-white p-4 rounded-xl shadow-lg shadow-blue-500/10">
                   <QrCode className="w-40 h-40 text-black" strokeWidth={1.5} />
                </div>
                <div className="text-center space-y-1">
                   <p className="text-lg font-bold text-white">@username</p>
                   <p className="text-sm text-white/40">Scan to pay directly</p>
                </div>
             </div>

             <div className="space-y-3">
               <div className="flex gap-2">
                  <Input 
                    readOnly 
                    value="https://finatrades.com/pay/user123" 
                    className="bg-black/20 border-white/10 text-white/60"
                  />
                  <Button variant="outline" size="icon" className="border-white/10 hover:bg-white/5" onClick={copyLink}>
                     <Copy className="w-4 h-4" />
                  </Button>
               </div>
               <Button className="w-full bg-white/10 hover:bg-white/20 text-white">
                  <Share2 className="w-4 h-4 mr-2" /> Share Link
               </Button>
             </div>
          </TabsContent>
        </Tabs>

      </DialogContent>
    </Dialog>
  );
}
