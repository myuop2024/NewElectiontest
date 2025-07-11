import { Bell, Vote, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import caffeLogo from "@assets/caffe-logo-1__2_-removebg-preview_1749433945433.png";

export default function Header() {
  const { user, logout } = useAuth();
  const { isConnected } = useWebSocket();
  const queryClient = useQueryClient();
  const markReadMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/notifications/mark-read', { method: 'PATCH' });
      if (!response.ok) throw new Error('Failed to mark as read');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });
  const { data: notifications = [] } = useQuery({
    queryKey: ['/api/notifications'],
    queryFn: async () => {
      const response = await fetch('/api/notifications');
      if (!response.ok) throw new Error('Failed to fetch notifications');
      return response.json();
    },
    enabled: !!user,
  });
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['/api/notifications/unread-count'],
    queryFn: async () => {
      const response = await fetch('/api/notifications/unread-count');
      if (!response.ok) throw new Error('Failed to fetch unread count');
      const data = await response.json();
      return data.count;
    },
    enabled: !!user,
  });

  return (
    <header className="government-header sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            {/* CAFFE Logo */}
            <div className="flex items-center space-x-3">
              <img 
                src={caffeLogo} 
                alt="CAFFE Logo" 
                className="w-10 h-10 object-contain"
              />
              <div>
                <h1 className="text-xl font-bold caffe-primary">CAFFE</h1>
                <p className="text-xs text-muted-foreground">Electoral Observer Platform</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            {/* Live Status Indicator */}
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 pulse-slow' : 'bg-red-500'}`}></div>
              <span className={`text-sm font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                {isConnected ? 'Live Monitoring' : 'Disconnected'}
              </span>
            </div>
            
            {/* Notifications */}
            <div className="relative">
              <DropdownMenu onOpenChange={(open) => { if (open && unreadCount > 0) markReadMutation.mutate(); }}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-2">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    {unreadCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                        {unreadCount}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notif) => (
                      <DropdownMenuItem key={notif.id} className="flex flex-col items-start gap-1 py-2">
                        <div className="font-medium">{notif.title}</div>
                        <div className="text-sm text-muted-foreground">{notif.message}</div>
                        <div className="text-xs text-muted-foreground">{new Date(notif.createdAt).toLocaleString()}</div>
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <DropdownMenuItem className="text-muted-foreground">No notifications</DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {/* User Profile */}
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-muted-foreground">
                  Observer ID: <span className="font-mono">{user?.observerId}</span>
                </p>
              </div>
              <Avatar className="w-10 h-10">
                <AvatarImage src="" alt="User profile" />
                <AvatarFallback>
                  <User className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              
              {/* Logout Button */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={logout}
                className="text-muted-foreground hover:text-destructive"
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
