export interface ChatRoom {
  id: string;
  name: string;
  description: string;
  type: 'public' | 'private' | 'emergency';
  createdBy: number;
  participants: number[];
  maxParticipants?: number;
  isActive: boolean;
  createdAt: Date;
}

export interface ChatParticipant {
  userId: number;
  roomId: string;
  role: 'member' | 'moderator' | 'admin';
  joinedAt: Date;
  lastSeen?: Date;
}

export interface DirectMessage {
  id: string;
  senderId: number;
  recipientId: number;
  content: string;
  messageType: 'text' | 'file' | 'image';
  isRead: boolean;
  sentAt: Date;
}

export class ChatService {
  
  // Admin assigns users to rooms
  static async assignUsersToRoom(roomId: string, userIds: number[], assignedBy: number) {
    const assignments = userIds.map(userId => ({
      userId,
      roomId,
      role: 'member' as const,
      joinedAt: new Date()
    }));

    // Store assignments in database
    console.log(`Admin ${assignedBy} assigned users ${userIds.join(', ')} to room ${roomId}`);
    return assignments;
  }

  // Remove users from room
  static async removeUsersFromRoom(roomId: string, userIds: number[], removedBy: number) {
    console.log(`Admin ${removedBy} removed users ${userIds.join(', ')} from room ${roomId}`);
    return { success: true };
  }

  // Get user's accessible rooms
  static async getUserRooms(userId: number): Promise<ChatRoom[]> {
    // Default rooms everyone can access
    const defaultRooms: ChatRoom[] = [
      {
        id: 'general',
        name: 'General Discussion',
        description: 'Open discussion for all observers',
        type: 'public',
        createdBy: 1,
        participants: [],
        isActive: true,
        createdAt: new Date()
      }
    ];

    // Add assigned private rooms based on user's assignments
    return defaultRooms;
  }

  // Search for users to start direct chat
  static async searchUsers(query: string, currentUserId: number) {
    // Mock search - in real implementation, query database
    const users = [
      { id: 2, username: 'admin', firstName: 'CAFFE', lastName: 'Administrator', role: 'admin', online: true },
      { id: 3, username: 'observer1', firstName: 'John', lastName: 'Smith', role: 'observer', online: false },
      { id: 4, username: 'coordinator1', firstName: 'Mary', lastName: 'Johnson', role: 'supervisor', online: true }
    ];

    return users
      .filter(user => 
        user.id !== currentUserId && 
        (user.username.toLowerCase().includes(query.toLowerCase()) ||
         user.firstName.toLowerCase().includes(query.toLowerCase()) ||
         user.lastName.toLowerCase().includes(query.toLowerCase()))
      )
      .slice(0, 10);
  }

  // Get direct message conversation
  static async getDirectMessages(userId1: number, userId2: number): Promise<DirectMessage[]> {
    // Mock conversation - in real implementation, query database
    return [];
  }

  // Send direct message
  static async sendDirectMessage(senderId: number, recipientId: number, content: string, messageType: string = 'text') {
    const message: DirectMessage = {
      id: `dm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      senderId,
      recipientId,
      content,
      messageType: messageType as any,
      isRead: false,
      sentAt: new Date()
    };

    console.log('Direct message sent:', message);
    return message;
  }

  // Mark messages as read
  static async markMessagesAsRead(userId: number, conversationWith: number) {
    console.log(`User ${userId} marked messages from ${conversationWith} as read`);
    return { success: true };
  }

  // Get user's recent conversations
  static async getRecentConversations(userId: number) {
    // Mock recent conversations
    return [
      {
        userId: 2,
        username: 'admin',
        firstName: 'CAFFE',
        lastName: 'Administrator',
        lastMessage: 'Welcome to the platform!',
        lastMessageAt: new Date(Date.now() - 300000), // 5 minutes ago
        unreadCount: 0,
        online: true
      },
      {
        userId: 4,
        username: 'coordinator1',
        firstName: 'Mary',
        lastName: 'Johnson',
        lastMessage: 'Please check your assignment',
        lastMessageAt: new Date(Date.now() - 1800000), // 30 minutes ago
        unreadCount: 2,
        online: true
      }
    ];
  }

  // Create private room
  static async createPrivateRoom(name: string, description: string, createdBy: number, participants: number[]) {
    const room: ChatRoom = {
      id: `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      type: 'private',
      createdBy,
      participants,
      isActive: true,
      createdAt: new Date()
    };

    console.log('Private room created:', room);
    return room;
  }

  // Get room participants
  static async getRoomParticipants(roomId: string) {
    // Mock participants
    return [
      { userId: 1, username: 'damionjm', firstName: 'Damion', lastName: 'Miller', role: 'member', online: true },
      { userId: 2, username: 'admin', firstName: 'CAFFE', lastName: 'Administrator', role: 'admin', online: true }
    ];
  }
}