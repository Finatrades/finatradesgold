import { useListWarehouses } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Box } from "lucide-react";

export default function Warehouses() {
  const { data: warehouses, isLoading } = useListWarehouses();

  if (isLoading) return <div className="p-8">Loading Hub Network...</div>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">African Hub Network</h1>
          <p className="text-muted-foreground">Explore our 14 interconnected commodity warehouses.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {warehouses && warehouses.length > 0 ? (
          warehouses.map((hub) => (
            <Card key={hub.id} className="bg-card border-border flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{hub.name}</CardTitle>
                  <Badge variant={hub.isActive ? "default" : "secondary"}>
                    {hub.isActive ? "Active" : "Offline"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3" /> {hub.city}, {hub.country}
                </p>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Capacity</span>
                    <span>{hub.availableCapacity.toLocaleString()} / {hub.totalCapacity.toLocaleString()} MT</span>
                  </div>
                  <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-primary h-full" 
                      style={{ width: `${(1 - (hub.availableCapacity / hub.totalCapacity)) * 100}%` }}
                    />
                  </div>
                </div>
                
                {hub.commodities && hub.commodities.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Accepted Commodities</span>
                    <div className="flex flex-wrap gap-2">
                      {hub.commodities.map((c, i) => (
                        <Badge key={i} variant="outline" className="text-xs bg-background/50 border-border">
                          {c}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full h-48 flex items-center justify-center text-muted-foreground border border-dashed border-border rounded-lg">
            Network data unavailable.
          </div>
        )}
      </div>
    </div>
  );
}
