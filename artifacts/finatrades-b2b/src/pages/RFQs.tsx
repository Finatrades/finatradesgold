import { useListRfqs } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { format } from "date-fns";

export default function RFQs() {
  const { data: rfqs, isLoading } = useListRfqs();

  if (isLoading) return <div className="p-8">Loading RFQs...</div>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Request for Quotes</h1>
          <p className="text-muted-foreground">Manage your open requests and incoming offers.</p>
        </div>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>Ref</TableHead>
                <TableHead>Commodity</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Target Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rfqs && rfqs.length > 0 ? (
                rfqs.map((item) => (
                  <TableRow key={item.id} className="border-border">
                    <TableCell className="font-medium">{item.rfqRef}</TableCell>
                    <TableCell>{item.commodityType}</TableCell>
                    <TableCell>{item.quantity} {item.unit}</TableCell>
                    <TableCell>${item.targetPricePerUnit} {item.currency}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {item.status.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.expiresAt ? format(new Date(item.expiresAt), 'MMM d, yyyy') : 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/rfq/${item.id}`} className="text-accent hover:underline text-sm">
                        Manage
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No active RFQs.
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
