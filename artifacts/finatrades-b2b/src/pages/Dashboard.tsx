import { useGetDashboardSummary, useGetDashboardActivity, useGetDashboardStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Box, ShoppingCart, MessageSquare, ShieldCheck, Activity } from "lucide-react";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: summary, isLoading: isSummaryLoading } = useGetDashboardSummary();
  const { data: activity, isLoading: isActivityLoading } = useGetDashboardActivity();
  const { data: stats, isLoading: isStatsLoading } = useGetDashboardStats();

  if (isSummaryLoading || isActivityLoading || isStatsLoading) {
    return <div className="p-8">Loading dashboard data...</div>;
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Command Center</h1>
        <div className="text-sm text-muted-foreground">Live Market Data Active</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Inventory Value</CardTitle>
            <ShieldCheck className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              ${summary?.inventoryValue?.toLocaleString() || 0} <span className="text-sm font-normal text-muted-foreground">FUSD</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{summary?.activeOrders || 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Consignments</CardTitle>
            <Box className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{summary?.totalConsignments || 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending RFQs</CardTitle>
            <MessageSquare className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{summary?.pendingRfqs || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-accent" />
            Recent Activity
          </h2>
          <Card className="bg-card border-border">
            <div className="divide-y divide-border">
              {activity && activity.length > 0 ? (
                activity.map((item) => (
                  <div key={item.id} className="p-4 flex items-start justify-between hover:bg-secondary/50 transition-colors">
                    <div className="space-y-1">
                      <p className="font-medium text-foreground text-sm">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(item.timestamp), "MMM d, HH:mm")}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-muted-foreground">No recent activity</div>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Network Stats</h2>
          <Card className="bg-card border-border">
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                <div className="p-4 flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Active Hubs</span>
                  <span className="font-bold">{stats?.totalHubs || 0}</span>
                </div>
                <div className="p-4 flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Deals Matched</span>
                  <span className="font-bold">{stats?.dealsMatched || 0}</span>
                </div>
                <div className="p-4 flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Verified Sellers</span>
                  <span className="font-bold">{stats?.verifiedSellers || 0}</span>
                </div>
                <div className="p-4 flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Active Buyers</span>
                  <span className="font-bold">{stats?.activeBuyers || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
