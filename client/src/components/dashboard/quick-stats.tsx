import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Building2, Users, FileText, AlertTriangle, TrendingUp } from "lucide-react";

export default function QuickStats() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const statCards = [
    {
      title: "Total Stations",
      value: stats?.totalStations || 0,
      icon: Building2,
      color: "caffe-primary",
      bgColor: "bg-primary/10",
      change: "+12% from last election",
      changeType: "positive"
    },
    {
      title: "Active Observers",
      value: stats?.activeObservers || 0,
      icon: Users,
      color: "caffe-secondary",
      bgColor: "bg-secondary/10",
      change: "Real-time monitoring active",
      changeType: "positive"
    },
    {
      title: "Reports Submitted",
      value: stats?.reportsSubmitted || 0,
      icon: FileText,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      change: "Last updated 2 mins ago",
      changeType: "neutral"
    },
    {
      title: "Alerts",
      value: stats?.pendingAlerts || 0,
      icon: AlertTriangle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      change: "Requires immediate attention",
      changeType: "alert"
    }
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="government-card">
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="government-card hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className={`text-3xl font-bold ${stat.color}`}>
                    {stat.value.toLocaleString()}
                  </p>
                </div>
                <div className={`p-3 ${stat.bgColor} rounded-lg`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
              <div className="mt-4">
                <span className={`text-sm flex items-center ${
                  stat.changeType === 'positive' 
                    ? 'text-green-600' 
                    : stat.changeType === 'alert' 
                    ? 'text-destructive' 
                    : 'text-muted-foreground'
                }`}>
                  {stat.changeType === 'positive' && <TrendingUp className="h-4 w-4 mr-1" />}
                  {stat.changeType === 'alert' && <AlertTriangle className="h-4 w-4 mr-1" />}
                  {stat.change}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
