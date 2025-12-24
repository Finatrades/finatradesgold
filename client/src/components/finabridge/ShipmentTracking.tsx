import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Package, Truck, Ship, Plane, CheckCircle, Clock, MapPin, 
  AlertTriangle, RefreshCw, FileText, Anchor
} from 'lucide-react';

interface ShipmentMilestone {
  id: string;
  milestone: string;
  status: 'pending' | 'in_progress' | 'completed';
  location?: string;
  description?: string;
  completedAt?: string;
}

interface ShipmentData {
  id: string;
  tradeRequestId: string;
  trackingNumber?: string;
  courierName?: string;
  status: string;
  estimatedShipDate?: string;
  actualShipDate?: string;
  estimatedArrivalDate?: string;
  actualArrivalDate?: string;
  originPort?: string;
  destinationPort?: string;
  currentLocation?: string;
  customsStatus?: string;
  milestones?: ShipmentMilestone[];
}

interface ShipmentTrackingProps {
  tradeRequestId: string;
  shipment?: ShipmentData;
  onRefresh?: () => void;
}

const SHIPMENT_STAGES = [
  { key: 'Pending', label: 'Order Confirmed', icon: FileText },
  { key: 'Preparing', label: 'Preparing', icon: Package },
  { key: 'Shipped', label: 'Shipped', icon: Ship },
  { key: 'In Transit', label: 'In Transit', icon: Truck },
  { key: 'Customs Clearance', label: 'Customs', icon: Anchor },
  { key: 'Out for Delivery', label: 'Out for Delivery', icon: Truck },
  { key: 'Delivered', label: 'Delivered', icon: CheckCircle },
];

export default function ShipmentTracking({ tradeRequestId, shipment, onRefresh }: ShipmentTrackingProps) {
  const [loading, setLoading] = useState(false);
  const [shipmentData, setShipmentData] = useState<ShipmentData | null>(shipment || null);

  useEffect(() => {
    if (!shipment) {
      fetchShipment();
    }
  }, [tradeRequestId]);

  const fetchShipment = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/finabridge/shipments/${tradeRequestId}`);
      if (response.ok) {
        const data = await response.json();
        setShipmentData(data.shipment);
      }
    } catch (error) {
      console.error('Failed to fetch shipment:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStageIndex = () => {
    if (!shipmentData) return 0;
    const index = SHIPMENT_STAGES.findIndex(s => s.key === shipmentData.status);
    return index >= 0 ? index : 0;
  };

  const getProgress = () => {
    const currentIndex = getCurrentStageIndex();
    return ((currentIndex + 1) / SHIPMENT_STAGES.length) * 100;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Delivered': return 'bg-green-500';
      case 'In Transit': case 'Shipped': return 'bg-blue-500';
      case 'Customs Clearance': return 'bg-orange-500';
      case 'Delayed': return 'bg-red-500';
      case 'Cancelled': return 'bg-gray-500';
      default: return 'bg-purple-500';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!shipmentData) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center text-muted-foreground">
          <Truck className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">No shipment information available yet</p>
          <p className="text-sm mt-1">Shipment tracking will appear once the goods are dispatched.</p>
        </CardContent>
      </Card>
    );
  }

  const currentStageIndex = getCurrentStageIndex();

  return (
    <Card>
      <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-purple-600" />
            Shipment Tracking
          </CardTitle>
          <div className="flex items-center gap-2">
            {shipmentData.trackingNumber && (
              <Badge variant="outline" className="font-mono">
                {shipmentData.trackingNumber}
              </Badge>
            )}
            <Badge className={getStatusColor(shipmentData.status)}>
              {shipmentData.status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>Shipment Progress</span>
            <span>{Math.round(getProgress())}% Complete</span>
          </div>
          <Progress value={getProgress()} className="h-2" />
        </div>

        <div className="relative">
          <div className="flex justify-between">
            {SHIPMENT_STAGES.map((stage, index) => {
              const Icon = stage.icon;
              const isCompleted = index < currentStageIndex;
              const isCurrent = index === currentStageIndex;
              const isPending = index > currentStageIndex;
              
              return (
                <div 
                  key={stage.key} 
                  className={`flex flex-col items-center flex-1 ${index < SHIPMENT_STAGES.length - 1 ? 'relative' : ''}`}
                >
                  {index < SHIPMENT_STAGES.length - 1 && (
                    <div 
                      className={`absolute top-5 left-1/2 w-full h-0.5 ${
                        isCompleted ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  )}
                  <div 
                    className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                      isCompleted 
                        ? 'bg-green-500 border-green-500 text-white' 
                        : isCurrent 
                          ? 'bg-purple-600 border-purple-600 text-white animate-pulse' 
                          : 'bg-white border-gray-200 text-gray-400'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <span className={`text-xs mt-2 text-center ${
                    isCompleted || isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground'
                  }`}>
                    {stage.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {(shipmentData.originPort || shipmentData.destinationPort || shipmentData.currentLocation) && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              {shipmentData.originPort && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-muted-foreground">Origin</p>
                    <p className="font-medium">{shipmentData.originPort}</p>
                  </div>
                </div>
              )}
              {shipmentData.currentLocation && (
                <div className="flex items-start gap-2">
                  <Truck className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-muted-foreground">Current Location</p>
                    <p className="font-medium">{shipmentData.currentLocation}</p>
                  </div>
                </div>
              )}
              {shipmentData.destinationPort && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-purple-600 mt-0.5" />
                  <div>
                    <p className="text-muted-foreground">Destination</p>
                    <p className="font-medium">{shipmentData.destinationPort}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {(shipmentData.estimatedArrivalDate || shipmentData.actualShipDate) && (
          <div className="mt-4 grid grid-cols-2 gap-4">
            {shipmentData.actualShipDate && (
              <div className="p-3 border rounded-lg">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  Shipped On
                </div>
                <p className="font-semibold mt-1">
                  {new Date(shipmentData.actualShipDate).toLocaleDateString()}
                </p>
              </div>
            )}
            {shipmentData.estimatedArrivalDate && (
              <div className="p-3 border rounded-lg">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  Est. Arrival
                </div>
                <p className="font-semibold mt-1">
                  {new Date(shipmentData.estimatedArrivalDate).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        )}

        {shipmentData.customsStatus && (
          <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-800">Customs Status</span>
            </div>
            <p className="text-sm text-orange-700 mt-1">{shipmentData.customsStatus}</p>
          </div>
        )}

        {onRefresh && (
          <div className="mt-4 flex justify-end">
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Status
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
