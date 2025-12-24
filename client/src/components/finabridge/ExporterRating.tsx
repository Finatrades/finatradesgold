import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Star, Shield, TrendingUp, Package, MessageCircle, Truck, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ExporterRatingProps {
  exporterUserId: string;
  tradeRequestId: string;
  exporterName?: string;
  onRatingSubmitted?: () => void;
}

interface TrustScore {
  totalTrades: number;
  completedTrades: number;
  disputedTrades: number;
  averageRating: string;
  totalRatings: number;
  trustScore: number;
  verificationLevel: string;
}

export default function ExporterRating({ 
  exporterUserId, 
  tradeRequestId, 
  exporterName,
  onRatingSubmitted 
}: ExporterRatingProps) {
  const [overallRating, setOverallRating] = useState(0);
  const [qualityRating, setQualityRating] = useState(0);
  const [communicationRating, setCommunicationRating] = useState(0);
  const [deliveryRating, setDeliveryRating] = useState(0);
  const [review, setReview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [trustScore, setTrustScore] = useState<TrustScore | null>(null);
  const [loadingTrust, setLoadingTrust] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);

  React.useEffect(() => {
    fetchTrustScore();
  }, [exporterUserId]);

  const fetchTrustScore = async () => {
    setLoadingTrust(true);
    try {
      const response = await fetch(`/api/finabridge/exporter/${exporterUserId}/trust-score`);
      if (response.ok) {
        const data = await response.json();
        setTrustScore(data.trustScore);
      }
    } catch (error) {
      console.error('Failed to fetch trust score:', error);
    } finally {
      setLoadingTrust(false);
    }
  };

  const handleSubmit = async () => {
    if (overallRating === 0) {
      toast.error('Please provide an overall rating');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/finabridge/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exporterUserId,
          tradeRequestId,
          overallRating,
          qualityRating: qualityRating || null,
          communicationRating: communicationRating || null,
          deliveryRating: deliveryRating || null,
          review: review || null,
        }),
      });

      if (response.ok) {
        toast.success('Rating submitted successfully');
        setSubmitted(true);
        onRatingSubmitted?.();
      } else {
        throw new Error('Failed to submit rating');
      }
    } catch (error) {
      toast.error('Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  const StarRating = ({ 
    value, 
    onChange, 
    label, 
    icon: Icon 
  }: { 
    value: number; 
    onChange: (val: number) => void; 
    label: string; 
    icon: React.ComponentType<{ className?: string }>;
  }) => (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm">{label}</span>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="p-0.5 hover:scale-110 transition-transform"
          >
            <Star 
              className={`w-5 h-5 ${
                star <= value 
                  ? 'fill-yellow-400 text-yellow-400' 
                  : 'text-gray-300'
              }`} 
            />
          </button>
        ))}
      </div>
    </div>
  );

  const getTrustBadgeColor = (level: string) => {
    switch (level) {
      case 'Verified': return 'bg-green-100 text-green-700';
      case 'Premium': return 'bg-purple-100 text-purple-700';
      case 'Basic': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (submitted) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-6 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h3 className="font-semibold text-green-800 mb-2">Thank You!</h3>
          <p className="text-sm text-green-700">Your rating has been submitted successfully.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50 border-b">
        <CardTitle className="flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500" />
          Rate Exporter
          {exporterName && <span className="text-muted-foreground font-normal">- {exporterName}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {trustScore && (
          <div className="mb-6 p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-600" />
                <span className="font-medium">Exporter Trust Score</span>
              </div>
              <Badge className={getTrustBadgeColor(trustScore.verificationLevel)}>
                {trustScore.verificationLevel}
              </Badge>
            </div>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div>
                <p className="text-2xl font-bold text-purple-600">{trustScore.trustScore}</p>
                <p className="text-xs text-muted-foreground">Trust Score</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{trustScore.completedTrades}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-2xl font-bold">{parseFloat(trustScore.averageRating).toFixed(1)}</span>
                </div>
                <p className="text-xs text-muted-foreground">Rating ({trustScore.totalRatings})</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-500">{trustScore.disputedTrades}</p>
                <p className="text-xs text-muted-foreground">Disputes</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="p-4 border rounded-lg">
            <p className="font-medium mb-3">Overall Rating *</p>
            <div className="flex gap-2 justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setOverallRating(star)}
                  className="p-1 hover:scale-125 transition-transform"
                >
                  <Star 
                    className={`w-8 h-8 ${
                      star <= overallRating 
                        ? 'fill-yellow-400 text-yellow-400' 
                        : 'text-gray-300 hover:text-yellow-200'
                    }`} 
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="border rounded-lg p-4 space-y-1">
            <p className="text-sm font-medium text-muted-foreground mb-2">Detailed Ratings (Optional)</p>
            <StarRating value={qualityRating} onChange={setQualityRating} label="Product Quality" icon={Package} />
            <StarRating value={communicationRating} onChange={setCommunicationRating} label="Communication" icon={MessageCircle} />
            <StarRating value={deliveryRating} onChange={setDeliveryRating} label="Delivery Speed" icon={Truck} />
          </div>

          <div>
            <label className="text-sm font-medium">Write a Review (Optional)</label>
            <Textarea
              placeholder="Share your experience with this exporter..."
              value={review}
              onChange={(e) => setReview(e.target.value)}
              className="mt-2"
              rows={3}
            />
          </div>

          <Button 
            onClick={handleSubmit} 
            disabled={submitting || overallRating === 0}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Star className="w-4 h-4 mr-2" />
                Submit Rating
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
