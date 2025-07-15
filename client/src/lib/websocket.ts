export interface WebSocketMessage {
  id: string;
  type: 'chat' | 'notification' | 'alert' | 'system' | 'chat_message' | 'join_room' | 'leave_room';
  content: string;
  userId: number;
  timestamp: Date;
  metadata?: Record<string, any>;
  senderId?: number;
  recipientId?: number | null;
  roomId?: string | null;
  messageType?: string;
}

class WebSocketService {
  private ws: WebSocket | null = null;

  connect(userId: string): WebSocket {
    // Handle different environments
    let wsUrl: string;
    
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      // Local development
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      wsUrl = `${protocol}//${window.location.host}/ws?userId=${userId}`;
    } else {
      // Cloud environment (Replit, etc.)
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host || window.location.hostname;
      wsUrl = `${protocol}//${host}/ws?userId=${userId}`;
    }
    
    console.log("Connecting to WebSocket:", wsUrl);
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log("WebSocket connected successfully");
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket connection error:", error);
    };

    return this.ws;
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(message: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }
}

export const webSocketService = new WebSocketService();