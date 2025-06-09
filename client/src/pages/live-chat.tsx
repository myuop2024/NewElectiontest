import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/use-websocket";
import { useAuth } from "@/hooks/use-auth";
import { Send, Phone, Video, Paperclip, Users, MessageCircle } from "lucide-react";

export default function LiveChat() {
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { socket, sendMessage } = useWebSocket();

  const { data: chatRooms } = useQuery({
    queryKey: ["/api/messages"],
  });

  useEffect(() => {
    if (socket) {
      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'chat_message') {
          setMessages(prev => [...prev, {
            id: data.id,
            content: data.content,
            senderId: data.senderId,
            timestamp: data.timestamp,
            messageType: data.messageType
          }]);
        }
      };
    }
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (!message.trim() || !user) return;

    const newMessage = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'chat_message' as const,
      content: message,
      userId: user.id,
      timestamp: new Date(),
      senderId: user.id,
      recipientId: selectedChat === 'general' ? null : parseInt(selectedChat || '0'),
      roomId: selectedChat === 'general' ? 'general' : null,
      messageType: 'text'
    };

    sendMessage(newMessage);
    setMessage("");
  };

  const defaultRooms = [
    { id: 'general', name: 'General Discussion', type: 'room', participants: 45, unread: 3 },
    { id: 'emergency', name: 'Emergency Channel', type: 'room', participants: 12, unread: 0 },
    { id: 'coordinators', name: 'Parish Coordinators', type: 'room', participants: 8, unread: 1 },
    { id: 'support', name: 'Technical Support', type: 'direct', participants: 2, unread: 0 },
  ];

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
              {defaultRooms.map((room) => (
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
                          {room.participants} participant{room.participants !== 1 ? 's' : ''}
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
                        {defaultRooms.find(r => r.id === selectedChat)?.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {defaultRooms.find(r => r.id === selectedChat)?.participants} participants online
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline">
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline">
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
                  <Button size="sm" variant="outline">
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
    </div>
  );
}
