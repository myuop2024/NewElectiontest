import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { webSocketService, type WebSocketMessage } from "@/lib/websocket";
import { useAuth } from "./use-auth";

interface WebSocketContextType {
  socket: WebSocket | null;
  isConnected: boolean;
  sendMessage: (message: WebSocketMessage) => void;
  messages: WebSocketMessage[];
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      connectWebSocket();
    } else {
      disconnectWebSocket();
    }

    return () => {
      disconnectWebSocket();
    };
  }, [isAuthenticated, user]);

  const connectWebSocket = async () => {
    try {
      const ws = await webSocketService.connect();
      setSocket(ws);
      setIsConnected(true);

      // Set up event listeners
      webSocketService.on('authenticated', (data) => {
        console.log('WebSocket authenticated:', data);
      });

      webSocketService.on('new_message', (data) => {
        setMessages(prev => [...prev, data]);
      });

      webSocketService.on('new_report', (data) => {
        setMessages(prev => [...prev, data]);
      });

      webSocketService.on('notification', (data) => {
        setMessages(prev => [...prev, data]);
      });

      webSocketService.on('error', (data) => {
        console.error('WebSocket error:', data);
      });

    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      setIsConnected(false);
    }
  };

  const disconnectWebSocket = () => {
    webSocketService.disconnect();
    setSocket(null);
    setIsConnected(false);
  };

  const sendMessage = (message: WebSocketMessage) => {
    webSocketService.send(message);
  };

  const value: WebSocketContextType = {
    socket,
    isConnected,
    sendMessage,
    messages
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket(): WebSocketContextType {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
