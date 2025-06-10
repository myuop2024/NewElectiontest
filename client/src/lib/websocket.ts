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
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws?userId=${userId}`;
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log("WebSocket connected");
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