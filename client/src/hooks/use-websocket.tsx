import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
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
      let reconnectAttempts = 0;
      const maxReconnectAttempts = 5;
      const reconnectDelay = 3000;

      const connectWebSocket = () => {
        const ws = webSocketService.connect(user.id.toString());
        setSocket(ws);

        ws.onopen = () => {
          setIsConnected(true);
          reconnectAttempts = 0;
          console.log("WebSocket connected");
        };

        ws.onclose = (event) => {
          setIsConnected(false);
          console.log("WebSocket disconnected");
          
          // Attempt to reconnect if not manually closed
          if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            console.log(`Attempting to reconnect... (${reconnectAttempts}/${maxReconnectAttempts})`);
            setTimeout(connectWebSocket, reconnectDelay);
          }
        };

        ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            setMessages(prev => [...prev, message]);
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
          }
        };

        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          setIsConnected(false);
        };
      };

      connectWebSocket();

      return () => {
        if (socket) {
          socket.close(1000); // Normal closure
          setSocket(null);
          setIsConnected(false);
        }
      };
    } else {
      setSocket(null);
      setIsConnected(false);
      setMessages([]);
    }
  }, [isAuthenticated, user]);

  const sendMessage = (message: WebSocketMessage) => {
    if (socket && isConnected) {
      socket.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket not connected");
    }
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
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
}