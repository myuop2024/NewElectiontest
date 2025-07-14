import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/use-websocket";
import { 
  LayoutDashboard, 
  MapPin, 
  FileText, 
  MessageCircle, 
  Camera, 
  Route, 
  Car,
  GraduationCap, 
  BarChart3, 
  QrCode, 
  Settings,
  Shield,
  Phone,
  Circle,
  AlertTriangle,
  BookOpen,
  Users,
  Activity,
  Brain,
  Edit3,
  FileSpreadsheet,
  Navigation,
  Cloud,
  Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import caffeLogo from "@assets/caffe-logo-1__2_-removebg-preview_1749433945433.png";

// Observer Navigation - Essential daily functions
const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Report Incident', href: '/incident-reporting', icon: AlertTriangle },
  { name: 'My Reports', href: '/reports', icon: FileText },
  { name: 'Polling Stations', href: '/polling-stations', icon: MapPin },
  { name: 'Weather Conditions', href: '/weather-dashboard', icon: Cloud },
  { name: 'Training Hub', href: '/training-center', icon: GraduationCap },
  { name: 'Training Analytics', href: '/training-analytics', icon: BarChart3 },
  { name: 'QR Tools', href: '/qr-scanner', icon: QrCode },
  { name: 'Support', href: '/live-chat', icon: MessageCircle },
  { name: 'Settings', href: '/settings', icon: Settings },
];

// Admin Navigation - Grouped by function
const adminNavigationGroups = [
  {
    title: "Management",
    items: [
      { name: 'Admin Dashboard', href: '/admin', icon: Shield },
      { name: 'Observer Management', href: '/observer-assignments', icon: Users },
      { name: 'Station Management', href: '/polling-station-management', icon: MapPin },
    ]
  },
  {
    title: "Incidents & Emergencies", 
    items: [
      { name: 'Incident Management', href: '/incident-management', icon: AlertTriangle },
      { name: 'Emergency System', href: '/emergency-management', icon: AlertTriangle },
    ]
  },
  {
    title: "Analytics & Intelligence",
    items: [
      { name: 'Analytics Hub', href: '/analytics', icon: BarChart3 },
      { name: 'Parish Heat Map', href: '/parish-heat-map', icon: Layers },
      { name: 'AI Intelligence', href: '/ai-analytics', icon: Brain },
      { name: 'Central AI Hub', href: '/central-ai-intelligence', icon: Brain },
    ]
  },
  {
    title: "Configuration",
    items: [
      { name: 'Google Classroom', href: '/training-center', icon: BookOpen },
      { name: 'Form Builder', href: '/form-builder', icon: Edit3 },
      { name: 'System Settings', href: '/admin/didit-settings', icon: Settings },
      { name: 'Data Integration', href: '/sheets-integration', icon: FileSpreadsheet },
    ]
  },
  {
    title: "Field Tools",
    items: [
      { name: 'Field Navigation', href: '/route-navigation', icon: Route },
      { name: 'Document Capture', href: '/document-capture', icon: Camera },
      { name: 'Traffic Monitoring', href: '/traffic-monitoring', icon: Car },
    ]
  }
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { data: appSettings } = useQuery<{ value: string }[]>({ queryKey: ["/api/settings/app"] });
  useWebSocket(); // Initialize WebSocket connection

  const isActive = (href: string) => {
    if (href === '/') {
      return location === '/';
    }
    return location.startsWith(href);
  };

  const canAccessAdmin = user?.role === 'admin' || user?.role === 'coordinator';

  const getAppSetting = (key: string) => {
    return appSettings?.find((s: any) => s.key === key)?.value || '';
  };

  return (
    <aside className="w-64 government-sidebar">
      <div className="flex flex-col items-center p-4 border-b border-border">
        <h2 className="text-lg font-bold caffe-primary">Navigation</h2>
        <p className="text-xs text-muted-foreground text-center">Electoral Observer Platform</p>
      </div>
      <nav className="mt-6 px-3">
        <div className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.name} href={item.href}>
                <div 
                  className={cn(
                  "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer",
                  isActive(item.href)
                    ? "caffe-bg-primary text-white"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}>
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </div>
              </Link>
            );
          })}

          {canAccessAdmin && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">
                Admin Panel
              </div>
              {adminNavigationGroups.map((group) => (
                <div key={group.title} className="mb-4">
                  <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1 px-3">
                    {group.title}
                  </div>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link key={item.name} href={item.href}>
                        <div 
                          className={cn(
                          "group flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors cursor-pointer ml-2",
                          isActive(item.href)
                            ? "caffe-bg-primary text-white"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        )}>
                          <Icon className="mr-3 h-4 w-4" />
                          {item.name}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Emergency Contact */}
        <div className="mt-8 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <h4 className="text-sm font-semibold text-destructive mb-2">Emergency Contact</h4>
          <Button 
            className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => window.open('tel:+1876-CAFFE-01', '_self')}
          >
            <Phone className="h-4 w-4 mr-2" />
            Call Election Center
          </Button>
        </div>

        {/* Current Election Info */}
        <div className="mt-4 p-4 bg-secondary/10 border border-secondary/20 rounded-lg">
          <h4 className="text-sm font-semibold caffe-secondary mb-2">Active Election</h4>
          <p className="text-xs text-muted-foreground">2025 General Election</p>
          <p className="text-xs text-muted-foreground">Jamaica</p>
          <div className="mt-2 flex items-center text-xs text-green-600">
            <Circle className="w-2 h-2 fill-current mr-2 pulse-slow" />
            Monitoring Active
          </div>
        </div>
      </nav>
    </aside>
  );
}