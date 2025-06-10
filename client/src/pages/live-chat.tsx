import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/use-websocket";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import type { WebSocketMessage } from "@/lib/websocket";
import { Send, Phone, Video, Paperclip, Users, MessageCircle, PhoneOff, VideoOff } from "lucide-react";

export default function LiveChat() {
  const [selectedChat, setSelectedChat] = useState<string | null>('general');
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callType, setCallType] = useState<'voice' | 'video' | null>(null);
  const [showCallDialog, setShowCallDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const jitsiApi = useRef<any>(null);
  const { user } = useAuth();
  const { socket, sendMessage } = useWebSocket();
  const { toast } = useToast();

  const { data: chatRooms } = useQuery({
    queryKey: ["/api/chat/conversations"],
  });

  // Load message history for selected chat
  const { data: messageHistory } = useQuery({
    queryKey: ["/api/chat/messages"],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedChat) {
        params.append('roomId', selectedChat);
      }
      return fetch(`/api/chat/messages?${params.toString()}`, {
        credentials: 'include'
      }).then(res => res.json());
    },
    enabled: !!selectedChat,
  });

  // Load online users for selected room
  const { data: onlineUsers } = useQuery({
    queryKey: ["/api/chat/rooms", selectedChat, "online"],
    queryFn: () => {
      if (!selectedChat) return [];
      return fetch(`/api/chat/rooms/${selectedChat}/online`, {
        credentials: 'include'
      }).then(res => res.json());
    },
    enabled: !!selectedChat,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Update messages when history loads or selected chat changes
  useEffect(() => {
    if (messageHistory && Array.isArray(messageHistory)) {
      setMessages(messageHistory);
    } else {
      setMessages([]);
    }
  }, [messageHistory, selectedChat]);

  useEffect(() => {
    if (socket) {
      const handleMessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'chat_message' && 
              (data.roomId === selectedChat || (!data.roomId && !selectedChat))) {
            // Only add message if it's from another user to avoid duplicates
            if (data.senderId !== user?.id) {
              setMessages(prev => {
                // Check if message already exists to prevent duplicates
                const exists = prev.some(msg => msg.id === data.id);
                if (exists) return prev;
                
                return [...prev, {
                  id: data.id || Math.random().toString(36).substr(2, 9),
                  content: data.content,
                  senderId: data.senderId,
                  timestamp: data.timestamp || new Date().toISOString(),
                  messageType: data.messageType || 'text'
                }];
              });
            }
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      const handleError = (error) => {
        console.error('WebSocket error in chat component:', error);
      };

      socket.addEventListener('message', handleMessage);
      socket.addEventListener('error', handleError);
      
      return () => {
        socket.removeEventListener('message', handleMessage);
        socket.removeEventListener('error', handleError);
      };
    }
  }, [socket, selectedChat, user?.id]);

  // Load Jitsi Meet API
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://meet.jit.si/external_api.js';
    script.async = true;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  // Initialize Jitsi Meet call
  const initializeJitsiCall = (roomName: string, audioOnly: boolean = false) => {
    if (!(window as any).JitsiMeetExternalAPI) {
      toast({
        title: "Call Service Loading",
        description: "Please wait for the calling service to load and try again."
      });
      return;
    }

    const domain = 'meet.jit.si';
    const options = {
      roomName: `caffe-electoral-${roomName}-${Date.now()}`,
      width: '100%',
      height: '100%',
      parentNode: jitsiContainerRef.current,
      configOverwrite: {
        startWithAudioMuted: false,
        startWithVideoMuted: audioOnly,
        enableWelcomePage: false,
        prejoinPageEnabled: false,
        toolbarButtons: [
          'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
          'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
          'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
          'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
          'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone'
        ]
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        DEFAULT_BACKGROUND: '#1a1a1a',
        TOOLBAR_ALWAYS_VISIBLE: true
      },
      userInfo: {
        displayName: `${user?.firstName} ${user?.lastName}` || 'Observer'
      }
    };

    jitsiApi.current = new (window as any).JitsiMeetExternalAPI(domain, options);

    jitsiApi.current.addEventListener('readyToClose', () => {
      endCall();
    });

    jitsiApi.current.addEventListener('participantLeft', (participant: any) => {
      console.log('Participant left:', participant);
    });

    jitsiApi.current.addEventListener('participantJoined', (participant: any) => {
      console.log('Participant joined:', participant);
    });
  };

  const endCall = () => {
    if (jitsiApi.current) {
      jitsiApi.current.dispose();
      jitsiApi.current = null;
    }
    setIsCallActive(false);
    setCallType(null);
    setShowCallDialog(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!message.trim() || !user || !selectedChat) return;

    const messageContent = message;
    setMessage(""); // Clear input immediately

    try {
      // Send message to database via API
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          roomId: selectedChat,
          content: messageContent,
          messageType: 'text'
        })
      });

      if (response.ok) {
        const savedMessage = await response.json();
        
        // Only add to local state if not already added by WebSocket
        setMessages(prev => {
          const exists = prev.some(msg => msg.id === savedMessage.id);
          if (exists) return prev;
          
          return [...prev, {
            id: savedMessage.id,
            content: savedMessage.content,
            senderId: savedMessage.senderId,
            timestamp: savedMessage.createdAt,
            messageType: savedMessage.messageType || 'text'
          }];
        });

        // Message successfully sent and added to local state
      } else {
        toast({
          title: "Error",
          description: "Failed to send message",
          variant: "destructive"
        });
        // Restore message input on error
        setMessage(messageContent);
      }
    } catch (error) {
      console.error('Send message error:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
      // Restore message input on error
      setMessage(messageContent);
    }
  };

  const handleVoiceCall = () => {
    const currentRoom = roomsWithData.find(r => r.id === selectedChat);
    if (!currentRoom) return;

    // Add call message to chat
    const callMessage = {
      id: Math.random().toString(36).substr(2, 9),
      content: `📞 Voice call started by ${user?.firstName} ${user?.lastName}`,
      senderId: user?.id || 0,
      timestamp: new Date().toISOString(),
      messageType: 'call'
    };

    setMessages(prev => [...prev, callMessage]);

    // Send notification through WebSocket
    const wsMessage: WebSocketMessage = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'notification',
      content: `Voice call started by ${user?.firstName} ${user?.lastName}`,
      userId: user?.id || 0,
      timestamp: new Date(),
      senderId: user?.id || 0,
      recipientId: selectedChat === 'general' ? null : parseInt(selectedChat || '0'),
      roomId: selectedChat === 'general' ? 'general' : null,
      messageType: 'call'
    };

    sendMessage(wsMessage);

    // Start voice call
    setCallType('voice');
    setIsCallActive(true);
    setShowCallDialog(true);
    
    setTimeout(() => {
      initializeJitsiCall(selectedChat || 'general', true); // Audio only
    }, 500);
  };

  const handleVideoCall = () => {
    const currentRoom = roomsWithData.find(r => r.id === selectedChat);
    if (!currentRoom) return;

    // Add video call message to chat
    const callMessage = {
      id: Math.random().toString(36).substr(2, 9),
      content: `📹 Video call started by ${user?.firstName} ${user?.lastName}`,
      senderId: user?.id || 0,
      timestamp: new Date().toISOString(),
      messageType: 'video'
    };

    setMessages(prev => [...prev, callMessage]);

    // Send notification through WebSocket
    const wsMessage: WebSocketMessage = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'notification',
      content: `Video call started by ${user?.firstName} ${user?.lastName}`,
      userId: user?.id || 0,
      timestamp: new Date(),
      senderId: user?.id || 0,
      recipientId: selectedChat === 'general' ? null : parseInt(selectedChat || '0'),
      roomId: selectedChat === 'general' ? 'general' : null,
      messageType: 'video'
    };

    sendMessage(wsMessage);

    // Start video call
    setCallType('video');
    setIsCallActive(true);
    setShowCallDialog(true);
    
    setTimeout(() => {
      initializeJitsiCall(selectedChat || 'general', false); // Video enabled
    }, 500);
  };

  const handleFileAttachment = () => {
    toast({
      title: "File Attachment",
      description: "File upload functionality will be available soon."
    });
  };

  const defaultRooms = [
    { id: 'general', name: 'General Discussion', type: 'room', participants: 45, unread: 0 },
    { id: 'emergency', name: 'Emergency Channel', type: 'room', participants: 12, unread: 0 },
    { id: 'coordinators', name: 'Parish Coordinators', type: 'room', participants: 8, unread: 0 },
    { id: 'support', name: 'Technical Support', type: 'direct', participants: 2, unread: 0 },
  ];

  // Get actual room data with real participant counts
  const roomsWithData = defaultRooms.map(room => ({
    ...room,
    participants: onlineUsers?.length || 0
  }));

  return (
    <div className="p-6 h-screen flex flex-col fade-in">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Live Chat</h2>
        <p className="text-muted-foreground">Real-time communication with observers and coordinators</p>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
        {/* Chat Rooms/Contacts */}
        <Card className="government-card lg:col-span-1">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-lg font-semibold flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Channels & Contacts
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-1">
              {roomsWithData.map((room) => (
                <button
                  key={room.id}
                  onClick={() => setSelectedChat(room.id)}
                  className={`w-full p-4 text-left hover:bg-accent transition-colors ${
                    selectedChat === room.id ? 'bg-primary/10 border-r-2 border-primary' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        room.type === 'room' ? 'bg-secondary' : 'bg-primary'
                      }`}></div>
                      <div>
                        <p className="font-medium text-sm">{room.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {selectedChat === room.id && onlineUsers ? 
                            `${onlineUsers.length} online` : 
                            `${room.participants} participants`
                          }
                        </p>
                      </div>
                    </div>
                    {room.unread > 0 && (
                      <Badge className="bg-destructive text-destructive-foreground text-xs">
                        {room.unread}
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="government-card lg:col-span-3 flex flex-col">
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <CardHeader className="border-b border-border">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <MessageCircle className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-lg">
                        {roomsWithData.find(r => r.id === selectedChat)?.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {onlineUsers?.length || 0} participants online
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline" onClick={handleVoiceCall}>
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleVideoCall}>
                      <Video className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Messages */}
              <CardContent className="flex-1 overflow-y-auto custom-scrollbar p-6">
                <div className="space-y-4">
                  {messages.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  )}
                  
                  {messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          msg.senderId === user?.id
                            ? 'caffe-bg-primary text-white'
                            : 'bg-accent text-foreground'
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p className={`text-xs mt-1 ${
                          msg.senderId === user?.id ? 'text-white/70' : 'text-muted-foreground'
                        }`}>
                          {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </CardContent>

              {/* Message Input */}
              <div className="border-t border-border p-4">
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline" onClick={handleFileAttachment}>
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1"
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <Button onClick={handleSendMessage} className="btn-caffe-primary">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <CardContent className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Select a chat to start messaging</h3>
                <p>Choose from the channels or contacts on the left to begin</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Call Dialog */}
      <Dialog open={showCallDialog} onOpenChange={setShowCallDialog}>
        <DialogContent className="max-w-4xl w-full h-[80vh] p-0" aria-describedby="call-dialog-description">
          <div id="call-dialog-description" className="sr-only">
            {callType === 'voice' ? 'Voice call interface' : 'Video call interface'} for {roomsWithData.find(r => r.id === selectedChat)?.name}
          </div>
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                {callType === 'voice' ? <Phone className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                {callType === 'voice' ? 'Voice Call' : 'Video Call'} - {roomsWithData.find(r => r.id === selectedChat)?.name}
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={endCall}
                className="flex items-center gap-2"
              >
                {callType === 'voice' ? <PhoneOff className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                End Call
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 bg-gray-900" ref={jitsiContainerRef}>
            {!isCallActive && (
              <div className="flex items-center justify-center h-full text-white">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                  <p>Connecting to call...</p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
