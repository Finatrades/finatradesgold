import { useListMarketplaceListings } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

export default function Marketplace() {
  const { data: listings, isLoading } = useListMarketplaceListings();

  if (isLoading) return <div className="p-8">Loading marketplace...</div>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Marketplace</h1>
          <p className="text-muted-foreground">Live commodity listings across 14 African trade hubs.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {listings && listings.length > 0 ? (
          listings.map((item) => (
            <Card key={item.id} className="bg-card border-border hover:border-accent transition-colors flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{item.commodityType}</CardTitle>
                  <Badge variant="secondary">{item.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{item.hubName}, {item.hubCountry}</p>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Volume</p>
                  <p className="font-semibold">{item.quantity} {item.unit}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Price / {item.unit}</p>
                  <p className="text-xl font-bold text-primary">${item.pricePerUnit?.toLocaleString()} {item.currency}</p>
                </div>
              </CardContent>
              <CardFooter className="pt-4 border-t border-border">
                <Link href={`/marketplace/${item.id}`} className="w-full">
                  <Button variant="outline" className="w-full">View Details & Request</Button>
                </Link>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-full h-48 flex items-center justify-center text-muted-foreground border border-dashed border-border rounded-lg">
            No live listings available matching your criteria.
          </div>
        )}
      </div>
    </div>
  );
}
