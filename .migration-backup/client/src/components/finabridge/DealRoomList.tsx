import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, MessageCircle, Users, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';

interface DealRoomSummary {
  id: string;
  tradeRequestId: string;
  acceptedProposalId: string;
  importerUserId: string;
  exporterUserId: string;
  assignedAdminId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  tradeRequest?: {
    tradeRefId: string;
    goodsName: string;
    tradeValueUsd: string;
    status: string;
  };
  importer?: { id: string; finatradesId: string | null; email: string } | null;
  exporter?: { id: string; finatradesId: string | null; email: string } | null;
  unreadCount?: number;
}

interface DealRoomListProps {
  onOpenDealRoom: (dealRoomId: string, userRole: 'importer' | 'exporter' | 'admin') => void;
}

export default function DealRoomList({ onOpenDealRoom }: DealRoomListProps) {
  const { user } = useAuth();
  const [dealRooms, setDealRooms] = useState<DealRoomSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDealRooms = async () => {
      if (!user) return;
      
      try {
        const response = await apiRequest('GET', `/api/deal-rooms/user/${user.id}`);
        if (response.ok) {
          const data = await response.json();
          setDealRooms(data.rooms);
        }
      } catch (error) {
        console.error('Failed to fetch deal rooms:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDealRooms();
  }, [user]);

  const getUserRole = (room: DealRoomSummary): 'importer' | 'exporter' | 'admin' => {
    if (room.importerUserId === user?.id) return 'importer';
    if (room.exporterUserId === user?.id) return 'exporter';
    return 'admin';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (dealRooms.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="font-medium mb-2">No Active Deal Rooms</h3>
          <p className="text-sm text-muted-foreground">
            Deal rooms are created automatically when a trade proposal is accepted.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-testid="deal-room-list">
      {dealRooms.map((room) => {
        const userRole = getUserRole(room);
        const hasUnread = (room.unreadCount || 0) > 0;
        
        return (
          <Card 
            key={room.id} 
            className={`cursor-pointer transition-colors hover:bg-muted/50 ${hasUnread ? 'ring-2 ring-purple-500' : ''}`}
            onClick={() => onOpenDealRoom(room.id, userRole)}
            data-testid={`deal-room-card-${room.id}`}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageCircle className="w-4 h-4 text-purple-500" />
                    <span className="font-medium">{room.tradeRequest?.tradeRefId || 'Trade Case'}</span>
                    {hasUnread && (
                      <Badge variant="destructive" className="ml-2 text-xs">
                        {room.unreadCount} new
                      </Badge>
                    )}
                  </div>
                  
                  {room.tradeRequest && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {room.tradeRequest.goodsName} - ${parseFloat(room.tradeRequest.tradeValueUsd).toLocaleString()}
                    </p>
                  )}
                  
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      Your role: {userRole}
                    </Badge>
                    <Badge variant={room.status === 'active' ? 'default' : 'secondary'}>
                      {room.status}
                    </Badge>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mt-2">
                    Last activity: {format(new Date(room.updatedAt), 'MMM d, yyyy HH:mm')}
                  </p>
                </div>
                
                <Button variant="ghost" size="icon" data-testid={`button-open-dealroom-${room.id}`}>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
