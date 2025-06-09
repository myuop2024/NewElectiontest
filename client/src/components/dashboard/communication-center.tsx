import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Radio, Video, MessageSquare, AlertTriangle } from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";
import { useLocation } from "wouter";

export default function CommunicationCenter() {
  const [, setLocation] = useLocation();

  const handleCommunicationAction = (action: string) => {
    switch (action) {
      case 'broadcast':
        setLocation('/live-chat');
        break;
      case 'video':
        setLocation('/live-chat');
        break;
      case 'whatsapp':
        setLocation('/live-chat');
        break;
      case 'sms':
        setLocation('/live-chat');
        break;
      case 'emergency':
        setLocation('/emergency-alert');
        break;
    }
  };

  // Mock recent messages - in real app this would come from WebSocket/API
  const recentMessages = [
    {
      id: 1,
      user: 'John Smith',
      message: 'Station setup complete',
      timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
      type: 'status'
    },
    {
      id: 2,
      user: 'Maria Garcia',
      message: 'Need technical support',
      timestamp: new Date(Date.now() - 7 * 60 * 1000).toISOString(),
      type: 'help'
    }
  ];

  const communicationOptions = [
    { icon: Radio, label: 'Broadcast', color: 'border-primary text-primary hover:bg-primary hover:text-white', action: 'broadcast' },
    { icon: Video, label: 'Video Call', color: 'border-secondary text-secondary hover:bg-secondary hover:text-white', action: 'video' },
    { icon: MessageSquare, label: 'WhatsApp', color: 'border-green-500 text-green-600 hover:bg-green-500 hover:text-white', action: 'whatsapp' },
    { icon: MessageSquare, label: 'SMS Alert', color: 'border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white', action: 'sms' }
  ];

  return (
    <Card className="government-card">
      <CardHeader className="border-b border-border">
        <CardTitle className="text-lg font-semibold">Communication Center</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Recent Messages */}
          <div className="border border-border rounded-lg p-4">
            <h4 className="text-sm font-semibold text-foreground mb-3">Recent Messages</h4>
            <div className="space-y-3">
              {recentMessages.map((msg) => (
                <div key={msg.id} className="flex items-start space-x-3">
                  <div className="w-8 h-8 caffe-bg-primary rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-foreground">
                      <span className="font-medium">{msg.user}:</span> {msg.message}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTimeAgo(msg.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Quick Communication */}
          <div className="grid grid-cols-2 gap-3">
            {communicationOptions.map((option, index) => {
              const Icon = option.icon;
              return (
                <Button
                  key={index}
                  variant="outline"
                  className={`p-3 ${option.color} transition-colors text-sm`}
                  onClick={() => handleCommunicationAction(option.action)}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {option.label}
                </Button>
              );
            })}
          </div>
          
          {/* Emergency Protocol */}
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-destructive mb-2">Emergency Protocol</h4>
            <p className="text-xs text-muted-foreground mb-3">
              For immediate assistance or serious incidents
            </p>
            <Button 
              className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => handleCommunicationAction('emergency')}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Activate Emergency Response
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
