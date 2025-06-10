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
      const maxReconnectAttempts = 10;
      const reconnectDelay = 2000;
      let reconnectTimeout: NodeJS.Timeout;

      const connectWebSocket = () => {
        try {
          const ws = webSocketService.connect(user.id.toString());
          setSocket(ws);

          ws.onopen = () => {
            setIsConnected(true);
            reconnectAttempts = 0;
            console.log("WebSocket connected");
          };

          ws.onclose = (event) => {
            console.log("WebSocket disconnected", event.code, event.reason);
            setSocket(null);
            setIsConnected(false);

            // Only attempt to reconnect if the connection was not closed intentionally
            // and we haven't exceeded max attempts
            if (event.code !== 1000 && event.code !== 1001 && reconnectAttempts < maxReconnectAttempts) {
              reconnectAttempts++;
              console.log(`Attempting to reconnect... (${reconnectAttempts}/${maxReconnectAttempts})`);
              // Use exponential backoff with jitter to prevent thundering herd
              const delay = Math.min(reconnectDelay * Math.pow(2, reconnectAttempts - 1), 30000) + Math.random() * 1000;
              reconnectTimeout = setTimeout(connectWebSocket, delay);
            }
          };

          ws.onmessage = (event) => {
            try {
              const message: WebSocketMessage = JSON.parse(event.data);
              // Only add unique messages
              setMessages(prev => {
                const exists = prev.some(msg => 
                  msg.id === message.id || 
                  (msg.content === message.content && 
                   msg.senderId === message.senderId && 
                   Math.abs(new Date(msg.timestamp).getTime() - new Date(message.timestamp).getTime()) < 5000)
                );
                return exists ? prev : [...prev, message];
              });
            } catch (error) {
              console.error("Error parsing WebSocket message:", error);
            }
          };

          ws.onerror = (error) => {
            console.error("WebSocket error:", error);
            setIsConnected(false);
          };
        } catch (error) {
          console.error("Error creating WebSocket connection:", error);
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            reconnectTimeout = setTimeout(connectWebSocket, reconnectDelay * reconnectAttempts);
          }
        }
      };

      connectWebSocket();

      return () => {
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
        }
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