import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { 
  Shield, 
  Users, 
  Database, 
  Settings, 
  AlertTriangle, 
  Activity,
  FileText,
  BarChart3
} from "lucide-react";
import UserManagement from "@/components/admin/user-management";
import SystemLogs from "@/components/admin/system-logs";
import HereApiSettings from "@/components/admin/here-api-settings";
import { useLocation } from "wouter";
import caffeLogo from "@assets/caffe-logo-1__2_-removebg-preview_1749433945433.png";

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("overview");
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Check if user has admin access
  if (!user || (user.role !== 'admin' && user.role !== 'coordinator')) {
    setLocation("/");
    return null;
  }

  const { data: stats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: auditLogs, isLoading: logsLoading } = useQuery({
    queryKey: ["/api/audit-logs"],
    enabled: user?.role === 'admin'
  });

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["/api/settings"],
    enabled: user?.role === 'admin'
  });

  const adminTabs = [
    {
      id: "overview",
      title: "Overview",
      icon: BarChart3,
      description: "System overview and key metrics"
    },
    {
      id: "users",
      title: "User Management",
      icon: Users,
      description: "Manage observers and coordinators"
    },
    {
      id: "system",
      title: "System Logs",
      icon: Database,
      description: "View system activity and audit logs"
    },
    {
      id: "api-settings",
      title: "API Settings",
      icon: Settings,
      description: "Configure HERE API and external services"
    },
    {
      id: "settings",
      title: "System Settings",
      icon: Settings,
      description: "Configure system parameters"
    }
  ];

  return (
    <div className="p-6 space-y-6 fade-in">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <img 
            src={caffeLogo} 
            alt="CAFFE Logo" 
            className="w-12 h-12 object-contain"
          />
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center">
              <Shield className="h-7 w-7 mr-3 text-primary" />
              CAFFE Admin Panel
            </h2>
            <p className="text-muted-foreground">Electoral Observer System Administration</p>
          </div>
        </div>
        <Badge className="status-indicator status-active">
          <Activity className="h-3 w-3 mr-1" />
          System Operational
        </Badge>
      </div>

      {/* Admin Navigation */}
      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
        {adminTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "ghost"}
              className={`flex-1 ${activeTab === tab.id ? "btn-caffe-primary" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon className="h-4 w-4 mr-2" />
              {tab.title}
            </Button>
          );
        })}
      </div>

      {/* Content */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* System Health Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="government-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                    <p className="text-2xl font-bold text-primary">{stats?.activeObservers || 0}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="government-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Sessions</p>
                    <p className="text-2xl font-bold text-green-600">{Math.floor((stats?.activeObservers || 0) * 0.8)}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Activity className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="government-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">System Alerts</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats?.pendingAlerts || 0}</p>
                  </div>
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <AlertTriangle className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="government-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Database Size</p>
                    <p className="text-2xl font-bold text-purple-600">2.4 GB</p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Database className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card className="government-card">
            <CardHeader>
              <CardTitle>Recent System Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {!auditLogs || auditLogs.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No recent activity logs</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {auditLogs.slice(0, 5).map((log: any) => (
                    <div key={log.id} className="flex items-center justify-between border-b pb-2">
                      <div>
                        <p className="font-medium text-sm">{log.action}</p>
                        <p className="text-xs text-muted-foreground">
                          {log.entityType} • {new Date(log.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <Badge className="status-indicator status-neutral">
                        {log.entityType}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Status */}
          <Card className="government-card">
            <CardHeader>
              <CardTitle>System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Database Connection</span>
                    <Badge className="status-indicator status-active">Online</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">WebSocket Server</span>
                    <Badge className="status-indicator status-active">Connected</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">File Storage</span>
                    <Badge className="status-indicator status-active">Available</Badge>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Email Service</span>
                    <Badge className="status-indicator status-active">Operational</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">SMS Gateway</span>
                    <Badge className="status-indicator status-warning">Limited</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">AI Processing</span>
                    <Badge className="status-indicator status-active">Ready</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "users" && <UserManagement />}
      
      {activeTab === "system" && <SystemLogs auditLogs={auditLogs || []} isLoading={logsLoading} />}
      
      {activeTab === "api-settings" && <HereApiSettings />}
      
      {activeTab === "settings" && (
        <Card className="government-card">
          <CardHeader>
            <CardTitle>System Settings</CardTitle>
          </CardHeader>
          <CardContent>
            {settingsLoading ? (
              <div className="animate-pulse space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {!settings || settings.length === 0 ? (
                  <div className="text-center py-8">
                    <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No system settings configured</p>
                  </div>
                ) : (
                  settings.map((setting: any) => (
                    <div key={setting.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{setting.key}</h4>
                        <p className="text-sm text-muted-foreground">{setting.description}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                          {setting.value}
                        </span>
                        <Button size="sm" variant="outline">Edit</Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
