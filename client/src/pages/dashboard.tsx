import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import QuickStats from "@/components/dashboard/quick-stats";
import ActivityFeed from "@/components/dashboard/activity-feed";
import StationsTable from "@/components/dashboard/stations-table";
import AIAnalytics from "@/components/dashboard/ai-analytics";
import CommunicationCenter from "@/components/dashboard/communication-center";
import { useAuth } from "@/hooks/use-auth";

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="p-6 space-y-8 fade-in">
      {/* Page Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground">Electoral Observer Dashboard</h2>
        <p className="text-muted-foreground mt-1">
          Real-time monitoring and reporting for the 2025 General Election
        </p>
      </div>

      {/* Quick Stats */}
      <QuickStats />

      {/* Action Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quick Actions */}
        <Card className="government-card">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <button className="p-4 border-2 border-dashed border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200 rounded-lg text-center group">
                <i className="fas fa-map-pin text-2xl mb-2 group-hover:scale-110 transition-transform"></i>
                <p className="text-sm font-medium">Check In</p>
              </button>
              <button className="p-4 border-2 border-dashed border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground transition-all duration-200 rounded-lg text-center group">
                <i className="fas fa-camera text-2xl mb-2 group-hover:scale-110 transition-transform"></i>
                <p className="text-sm font-medium">Capture Document</p>
              </button>
              <button className="p-4 border-2 border-dashed border-yellow-500 text-yellow-600 hover:bg-yellow-500 hover:text-white transition-all duration-200 rounded-lg text-center group">
                <i className="fas fa-file-plus text-2xl mb-2 group-hover:scale-110 transition-transform"></i>
                <p className="text-sm font-medium">Submit Report</p>
              </button>
              <button className="p-4 border-2 border-dashed border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all duration-200 rounded-lg text-center group">
                <i className="fas fa-exclamation-circle text-2xl mb-2 group-hover:scale-110 transition-transform"></i>
                <p className="text-sm font-medium">Report Issue</p>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Live Activity Feed */}
        <ActivityFeed />
      </div>

      {/* Polling Stations Status Table */}
      <StationsTable />

      {/* AI Analytics & Communication Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <AIAnalytics />
        <CommunicationCenter />
      </div>
    </div>
  );
}
