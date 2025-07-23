import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Paperclip, Users, ChevronDown, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { useQuery } from "@tanstack/react-query";

export default function LiveChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState("support");
  const [showRoomSelector, setShowRoomSelector] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [chatMode, setChatMode] = useState<'room' | 'direct'>('room');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { sendMessage, isConnected } = useWebSocket();

  // Search users for direct messaging
  const { data: searchResults } = useQuery({
    queryKey: ['/api/chat/users/search', searchQuery],
    enabled: searchQuery.length > 2
  });

  // Get recent conversations
  const { data: conversations } = useQuery({
    queryKey: ['/api/chat/conversations'],
    enabled: !!user
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle room join/leave when selectedRoom changes
  useEffect(() => {
    if (sendMessage && selectedRoom && chatMode === 'room') {
      // Join the new room
      sendMessage({
        type: 'join_room',
        roomId: selectedRoom,
        userId: user?.id || 0,
        content: '',
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date()
      });

      // Leave the room when component unmounts or room changes
      return () => {
        sendMessage({
          type: 'leave_room',
          roomId: selectedRoom,
          userId: user?.id || 0,
          content: '',
          id: Math.random().toString(36).substr(2, 9),
          timestamp: new Date()
        });
      };
    }
  }, [sendMessage, selectedRoom, chatMode, user?.id]);

  const handleSendMessage = () => {
    if (!message.trim() || !user) return;

    if (chatMode === 'direct' && selectedUser) {
      // Send direct message
      const directMessage = {
        type: 'chat_message' as const,
        id: Math.random().toString(36).substr(2, 9),
        senderId: user.id,
        userId: user.id,
        recipientId: (selectedUser as any).id || (selectedUser as any).userId,
        content: message.trim(),
        messageType: 'text',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, directMessage]);
      sendMessage(directMessage);
    } else {
      // Send room message
      const newMessage = {
        type: 'chat_message' as const,
        id: Math.random().toString(36).substr(2, 9),
        senderId: user.id,
        userId: user.id,
        roomId: selectedRoom,
        content: message,
        messageType: 'text',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, newMessage]);
      sendMessage(newMessage);
    }
    setMessage("");
  };

  const availableRooms = [
    { id: 'support', name: 'Technical Support', icon: '🛠️', participants: 2 },
    { id: 'general', name: 'General Discussion', icon: '💬', participants: 45 },
    { id: 'emergency', name: 'Emergency Channel', icon: '🚨', participants: 12 },
    { id: 'coordinators', name: 'Parish Coordinators', icon: '👥', participants: 8 },
  ];

  const currentRoom = availableRooms.find(room => room.id === selectedRoom);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Chat Widget */}
      {isOpen && (
        <Card className="fixed bottom-24 left-6 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-40 fade-in">
          {/* Room Selector */}
          {showRoomSelector && (
            <div className="absolute -top-2 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 space-y-1">
              {availableRooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => {
                    setSelectedRoom(room.id);
                    setShowRoomSelector(false);
                    setMessages([]); // Clear messages when switching rooms
                  }}
                  className={`w-full p-2 text-left rounded hover:bg-gray-100 flex items-center justify-between ${
                    selectedRoom === room.id ? 'bg-primary/10' : ''
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span>{room.icon}</span>
                    <span className="text-sm font-medium">{room.name}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">{room.participants}</Badge>
                </button>
              ))}
            </div>
          )}

          <CardHeader className="caffe-bg-primary text-white rounded-t-lg p-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowRoomSelector(!showRoomSelector)}
                className="flex items-center space-x-2 hover:bg-white/10 rounded p-1 transition-colors"
              >
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span className="text-sm font-medium">
                  {chatMode === 'room' ? `${currentRoom?.icon} ${currentRoom?.name}` : `💬 ${selectedUser?.firstName || ''} ${selectedUser?.lastName || ''}`}
                </span>
                <ChevronDown className="h-3 w-3" />
              </button>
              <div className="flex items-center space-x-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-white hover:text-gray-200 p-1"
                  onClick={() => setShowUserSearch(!showUserSearch)}
                >
                  <Search className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-white hover:text-gray-200 p-1"
                  onClick={toggleChat}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {/* User Search Panel */}
            {showUserSearch && (
              <div className="border-b border-gray-200 p-3 bg-white">
                <div className="space-y-2">
                  <Input
                    placeholder="Search users to chat with..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="text-sm"
                  />
                  
                  {/* Recent Conversations */}
                  {Array.isArray(conversations) && conversations.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Recent Conversations</p>
                      <div className="space-y-1">
                        {conversations.slice(0, 3).map((conv: any) => (
                          <button
                            key={conv.userId}
                            onClick={() => {
                              setSelectedUser(conv);
                              setChatMode('direct');
                              setShowUserSearch(false);
                              setMessages([]);
                            }}
                            className="w-full p-2 text-left rounded hover:bg-gray-100 flex items-center justify-between"
                          >
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">{conv.firstName} {conv.lastName}</span>
                              {conv.online && <div className="w-2 h-2 bg-green-400 rounded-full"></div>}
                            </div>
                            {conv.unreadCount > 0 && (
                              <Badge variant="destructive" className="text-xs">{conv.unreadCount}</Badge>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Search Results */}
                  {Array.isArray(searchResults) && searchResults.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Search Results</p>
                      <div className="space-y-1">
                        {searchResults.map((userResult: any) => (
                          <button
                            key={userResult.id}
                            onClick={() => {
                              setSelectedUser(userResult);
                              setChatMode('direct');
                              setShowUserSearch(false);
                              setMessages([]);
                            }}
                            className="w-full p-2 text-left rounded hover:bg-gray-100 flex items-center justify-between"
                          >
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4 text-gray-400" />
                              <div>
                                <span className="text-sm font-medium">{userResult.firstName} {userResult.lastName}</span>
                                <p className="text-xs text-gray-500">{userResult.role}</p>
                              </div>
                              {userResult.online && <div className="w-2 h-2 bg-green-400 rounded-full"></div>}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setChatMode('room');
                      setShowUserSearch(false);
                      setSelectedUser(null);
                    }}
                    className="w-full text-xs"
                  >
                    Back to Rooms
                  </Button>
                </div>
              </div>
            )}

            {/* Messages Area */}
            <div className="h-64 overflow-y-auto bg-gray-50 p-4 custom-scrollbar">
              {messages.length === 0 && (
                <div className="flex items-start space-x-2">
                  <div className="w-6 h-6 caffe-bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="h-3 w-3 text-white" />
                  </div>
                  <div className="bg-white p-2 rounded-lg text-sm shadow-sm">
                    <p>Hello! I'm here to help you with any questions about the electoral observation process.</p>
                  </div>
                </div>
              )}
              
              {messages.map((msg, index) => (
                <div 
                  key={index} 
                  className={`flex items-start space-x-2 mb-3 ${
                    msg.senderId === user?.id ? 'flex-row-reverse space-x-reverse' : ''
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.senderId === user?.id ? 'caffe-bg-primary' : 'caffe-bg-secondary'
                  }`}>
                    <MessageCircle className="h-3 w-3 text-white" />
                  </div>
                  <div className={`p-2 rounded-lg text-sm max-w-[70%] ${
                    msg.senderId === user?.id 
                      ? 'caffe-bg-primary text-white' 
                      : 'bg-white shadow-sm'
                  }`}>
                    <p>{msg.content}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Input Area */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" className="p-2">
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 text-sm"
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <Button 
                  onClick={handleSendMessage}
                  className="btn-caffe-primary p-2"
                  disabled={!message.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chat Toggle Button */}
      <Button
        onClick={toggleChat}
        className="fixed bottom-24 left-6 w-12 h-12 caffe-bg-secondary text-white rounded-full shadow-lg hover:bg-secondary/90 z-30"
      >
        <MessageCircle className="h-5 w-5" />
        {messages.length > 0 && (
          <Badge className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
            {messages.length}
          </Badge>
        )}
      </Button>
    </>
  );
}
