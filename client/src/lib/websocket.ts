import { authService } from "./auth";

export type WebSocketEventType = 
  | 'authenticate'
  | 'chat_message'
  | 'new_message'
  | 'new_report'
  | 'status_update'
  | 'notification'
  | 'error'
  | 'authenticated';

export interface WebSocketMessage {
  type: WebSocketEventType;
  data?: any;
  token?: string;
  senderId?: number;
  recipientId?: number;
  roomId?: string;
  content?: string;
  messageType?: string;
  metadata?: any;
  userId?: number;
  message?: any;
  report?: any;
  error?: string;
}

class WebSocketService {
  private static instance: WebSocketService;
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private eventListeners: Map<WebSocketEventType, Set<(data: any) => void>> = new Map();

  private constructor() {}

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  connect(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      try {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          
          // Authenticate immediately after connection
          const token = authService.getToken();
          if (token) {
            this.send({
              type: 'authenticate',
              token
            });
          }

          resolve(this.socket!);
        };

        this.socket.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.socket.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          this.socket = null;
          
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            setTimeout(() => {
              this.reconnectAttempts++;
              console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
              this.connect();
            }, this.reconnectDelay * this.reconnectAttempts);
          }
        };

        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(message: WebSocketMessage): void {
    const listeners = this.eventListeners.get(message.type);
    if (listeners) {
      listeners.forEach(listener => listener(message));
    }
  }

  send(message: WebSocketMessage): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected. Message not sent:', message);
    }
  }

  on(eventType: WebSocketEventType, listener: (data: any) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType)!.add(listener);
  }

  off(eventType: WebSocketEventType, listener: (data: any) => void): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  getSocket(): WebSocket | null {
    return this.socket;
  }
}

export const webSocketService = WebSocketService.getInstance();
