import { useListBarterRequests } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { format } from "date-fns";

export default function Barter() {
  const { data: barters, isLoading } = useListBarterRequests();

  if (isLoading) return <div className="p-8">Loading Barter Requests...</div>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Sovereign Barter</h1>
          <p className="text-muted-foreground">Manage government-to-government commodity exchanges.</p>
        </div>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>Reference</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Offered</TableHead>
                <TableHead>Required</TableHead>
                <TableHead>Valuation Gap</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {barters && barters.length > 0 ? (
                barters.map((item) => (
                  <TableRow key={item.id} className="border-border">
                    <TableCell className="font-medium">{item.barterRef}</TableCell>
                    <TableCell>{item.governmentEntity}</TableCell>
                    <TableCell>{item.offeredCommodity} ({item.offeredQuantity} {item.offeredUnit})</TableCell>
                    <TableCell>{item.requiredCommodity} ({item.requiredQuantity} {item.requiredUnit})</TableCell>
                    <TableCell>
                      {item.settlementGap ? `$${item.settlementGap.toLocaleString()} FUSD` : 'Pending Valuation'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {item.status.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/barter/${item.id}`} className="text-accent hover:underline text-sm">
                        Details
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No active barter requests.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
