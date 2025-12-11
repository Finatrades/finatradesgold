import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowDownLeft } from 'lucide-react';

interface RequestGoldModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (from: string, grams: number) => void;
}

export default function RequestGoldModal({ isOpen, onClose, onConfirm }: RequestGoldModalProps) {
  const [fromUser, setFromUser] = useState('');
  const [grams, setGrams] = useState('');
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFromUser('');
      setGrams('');
      setNote('');
      setIsLoading(false);
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1A0A2E] border-white/10 text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <span className="text-blue-400">Request Gold</span>
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Send a payment request to another user.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
        </div>

      </DialogContent>
    </Dialog>
  );
}
