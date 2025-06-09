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
  GraduationCap, 
  BarChart3, 
  QrCode, 
  Settings,
  Shield,
  Phone,
  Circle,
  AlertTriangle,
  Users,
  Activity,
  Brain
} from "lucide-react";
import { Button } from "@/components/ui/button";
import caffeLogo from "@assets/caffe-logo-1__2_-removebg-preview_1749433945433.png";

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Polling Stations', href: '/polling-stations', icon: MapPin },
  { name: 'Incident Reporting', href: '/incident-reporting', icon: AlertTriangle },
  { name: 'Observer Assignments', href: '/observer-assignments', icon: Users },
  { name: 'Real-Time Analytics', href: '/real-time-analytics', icon: Activity },
  { name: 'AI Analytics', href: '/ai-analytics', icon: Brain },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'Live Chat', href: '/live-chat', icon: MessageCircle },
  { name: 'Document Capture', href: '/document-capture', icon: Camera },
  { name: 'Route Navigation', href: '/route-navigation', icon: Route },
  { name: 'Training Center', href: '/training-center', icon: GraduationCap },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'QR Scanner', href: '/qr-scanner', icon: QrCode },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const adminNavigation = [
  { name: 'Admin Panel', href: '/admin', icon: Shield },
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
        <img 
          src={caffeLogo} 
          alt="CAFFE Logo" 
          className="w-16 h-16 object-contain mb-2"
        />
        <h2 className="text-lg font-bold caffe-primary">CAFFE</h2>
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

          {canAccessAdmin && adminNavigation.map((item) => {
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
        </div>

        {/* Emergency Contact */}
        <div className="mt-8 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <h4 className="text-sm font-semibold text-destructive mb-2">Emergency Contact</h4>
          <Button className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90">
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