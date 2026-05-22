import { useListInventory, useGetInventorySummary } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Layers } from "lucide-react";

export default function Inventory() {
  const { data: inventory, isLoading } = useListInventory();
  const { data: summary } = useGetInventorySummary();

  if (isLoading) return <div className="p-8">Loading inventory...</div>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Inventory</h1>
          <p className="text-muted-foreground">Warehouse holdings and FUSD valuation.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total FUSD Value</CardTitle>
            <Layers className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              ${summary?.totalFusdValue?.toLocaleString() || 0}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Available</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{summary?.available || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Ref</TableHead>
                <TableHead>Commodity</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Valuation</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory && inventory.length > 0 ? (
                inventory.map((item) => (
                  <TableRow key={item.id} className="border-border">
                    <TableCell className="font-medium text-foreground">{item.inventoryRef}</TableCell>
                    <TableCell>{item.commodityType}</TableCell>
                    <TableCell>{item.warehouseName}</TableCell>
                    <TableCell>{item.quantity} {item.unit}</TableCell>
                    <TableCell>${item.fusdValue?.toLocaleString()} FUSD</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/inventory/${item.id}`} className="text-accent hover:underline text-sm">
                        Details
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No inventory found.
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
