import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Download, Filter } from "lucide-react";
import { formatTimeAgo, getStatusColor } from "@/lib/utils";

export default function StationsTable() {
  const { data: stations, isLoading } = useQuery({
    queryKey: ["/api/polling-stations"],
  });

  // Mock station status data - in real app this would come from API
  const stationData = stations?.slice(0, 5).map((station: any, index: number) => ({
    ...station,
    observer: ['John Smith', 'Maria Garcia', 'David Brown', 'Sarah Johnson', 'Michael Davis'][index],
    status: ['active', 'active', 'connection_issue', 'active', 'active'][index],
    lastCheckIn: new Date(Date.now() - (index + 1) * 5 * 60 * 1000).toISOString(),
    reportCount: [3, 1, 0, 5, 2][index]
  })) || [];

  if (isLoading) {
    return (
      <Card className="government-card">
        <CardHeader>
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="government-card">
      <CardHeader className="border-b border-border">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold">Polling Stations Status</CardTitle>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button className="btn-caffe-primary" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Station</th>
                <th>Parish</th>
                <th>Observer</th>
                <th>Status</th>
                <th>Last Check-in</th>
                <th>Reports</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {stationData.map((station: any) => (
                <tr key={station.id}>
                  <td className="font-medium">{station.stationCode}</td>
                  <td>{station.address.split(',')[0]}</td>
                  <td>{station.observer}</td>
                  <td>
                    <Badge className={`status-indicator ${getStatusColor(station.status)}`}>
                      <div className={`w-1.5 h-1.5 rounded-full mr-1 ${
                        station.status === 'active' ? 'bg-green-500' : 
                        station.status === 'connection_issue' ? 'bg-yellow-500' : 'bg-gray-500'
                      }`}></div>
                      {station.status === 'connection_issue' ? 'Connection Issue' : 
                       station.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="text-muted-foreground">
                    {formatTimeAgo(station.lastCheckIn)}
                  </td>
                  <td className="font-medium">{station.reportCount}</td>
                  <td>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                        View
                      </Button>
                      <Button variant="ghost" size="sm" className="caffe-secondary hover:text-secondary/80">
                        Contact
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {stationData.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">No polling stations found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
