import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, FileText, Camera, AlertTriangle } from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";

export default function ActivityFeed() {
  // Mock activity data - in real app this would come from API
  const activities = [
    {
      id: 1,
      type: 'check_in',
      user: 'John Smith',
      action: 'checked in at Polling Station 45A',
      timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      id: 2,
      type: 'report',
      user: 'Maria Garcia',
      action: 'submitted incident report',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      icon: FileText,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      id: 3,
      type: 'document',
      user: 'David Brown',
      action: 'captured ballot document',
      timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
      icon: Camera,
      color: 'caffe-primary',
      bgColor: 'bg-primary/10'
    },
    {
      id: 4,
      type: 'alert',
      user: 'System Alert',
      action: 'Connectivity issue at Station 12B',
      timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
      icon: AlertTriangle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10'
    }
  ];

  return (
    <Card className="government-card">
      <CardHeader className="border-b border-border">
        <CardTitle className="text-lg font-semibold">Live Activity Feed</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = activity.icon;
            return (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className={`flex-shrink-0 w-8 h-8 ${activity.bgColor} rounded-full flex items-center justify-center`}>
                  <Icon className={`${activity.color} h-4 w-4`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{activity.user}</span> {activity.action}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatTimeAgo(activity.timestamp)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-6">
          <Button variant="ghost" className="w-full text-primary hover:text-primary/80">
            View All Activities
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
