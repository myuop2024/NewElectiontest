import { WebSocket } from 'ws';

export interface CallSession {
  roomId: string;
  callerId: number;
  recipientId?: number;
  callType: 'audio' | 'video' | 'screen_share';
  status: 'initiating' | 'ringing' | 'connected' | 'ended';
  startedAt?: Date;
  endedAt?: Date;
  participants: CallParticipant[];
  recordingEnabled: boolean;
  recordingUrl?: string;
}

export interface CallParticipant {
  userId: number;
  socketId: string;
  role: 'caller' | 'recipient';
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenSharing: boolean;
  joinedAt: Date;
  leftAt?: Date;
}

export interface WebRTCSignaling {
  type: 'offer' | 'answer' | 'ice-candidate' | 'join' | 'leave' | 'mute' | 'unmute';
  roomId: string;
  userId: number;
  data: any;
}

export class CommunicationService {
  private static activeCalls = new Map<string, CallSession>();
  private static userSockets = new Map<number, WebSocket>();

  // Initialize WebRTC signaling
  static handleWebSocketConnection(ws: WebSocket, userId: number) {
    this.userSockets.set(userId, ws);

    ws.on('message', (message: string) => {
      try {
        const signaling: WebRTCSignaling = JSON.parse(message);
        this.handleSignalingMessage(signaling, ws);
      } catch (error) {
        console.error('WebRTC signaling error:', error);
      }
    });

    ws.on('close', () => {
      this.userSockets.delete(userId);
      this.handleUserDisconnect(userId);
    });
  }

  // Initiate call session
  static async initiateCall(callerId: number, recipientId: number, callType: 'audio' | 'video'): Promise<CallSession> {
    const roomId = this.generateRoomId();
    
    const session: CallSession = {
      roomId,
      callerId,
      recipientId,
      callType,
      status: 'initiating',
      participants: [],
      recordingEnabled: false
    };

    this.activeCalls.set(roomId, session);

    // Notify recipient
    await this.notifyCallRecipient(recipientId, session);

    return session;
  }

  // Handle emergency broadcast
  static async initiateEmergencyBroadcast(initiatorId: number, message: string, targetUsers: number[]) {
    const roomId = this.generateRoomId();
    
    const broadcastSession: CallSession = {
      roomId,
      callerId: initiatorId,
      callType: 'audio',
      status: 'connected',
      participants: [],
      recordingEnabled: true,
      startedAt: new Date()
    };

    this.activeCalls.set(roomId, broadcastSession);

    // Send emergency notifications to all target users
    for (const userId of targetUsers) {
      await this.sendEmergencyNotification(userId, {
        type: 'emergency_broadcast',
        roomId,
        message,
        priority: 'urgent'
      });
    }

    return broadcastSession;
  }

  // Conference call management
  static async createConferenceCall(organizerId: number, participants: number[], topic: string) {
    const roomId = this.generateRoomId();
    
    const conference: CallSession = {
      roomId,
      callerId: organizerId,
      callType: 'video',
      status: 'initiating',
      participants: [],
      recordingEnabled: true
    };

    this.activeCalls.set(roomId, conference);

    // Invite all participants
    for (const participantId of participants) {
      await this.inviteToConference(participantId, conference, topic);
    }

    return conference;
  }

  // Screen sharing functionality
  static async startScreenShare(userId: number, roomId: string) {
    const session = this.activeCalls.get(roomId);
    if (!session) throw new Error('Call session not found');

    const participant = session.participants.find(p => p.userId === userId);
    if (!participant) throw new Error('User not in call');

    participant.screenSharing = true;

    // Notify other participants
    this.broadcastToRoom(roomId, {
      type: 'screen_share_started',
      userId,
      timestamp: new Date()
    });

    return { success: true, screenSharing: true };
  }

  // Call recording
  static async startCallRecording(roomId: string, userId: number) {
    const session = this.activeCalls.get(roomId);
    if (!session) throw new Error('Call session not found');

    // Verify user has permission to record
    if (session.callerId !== userId) {
      throw new Error('Only call initiator can start recording');
    }

    session.recordingEnabled = true;
    session.recordingUrl = `recordings/${roomId}_${Date.now()}.webm`;

    this.broadcastToRoom(roomId, {
      type: 'recording_started',
      message: 'This call is now being recorded'
    });

    return { success: true, recordingUrl: session.recordingUrl };
  }

  // Call quality monitoring
  static async monitorCallQuality(roomId: string, qualityMetrics: any) {
    const session = this.activeCalls.get(roomId);
    if (!session) return;

    const qualityData = {
      roomId,
      timestamp: new Date(),
      metrics: {
        audioQuality: qualityMetrics.audio,
        videoQuality: qualityMetrics.video,
        connectionStability: qualityMetrics.stability,
        latency: qualityMetrics.latency,
        packetLoss: qualityMetrics.packetLoss
      }
    };

    // Store quality data for analytics
    await this.storeCallQualityData(qualityData);

    // Auto-adjust quality if issues detected
    if (qualityMetrics.packetLoss > 5 || qualityMetrics.latency > 200) {
      await this.suggestQualityAdjustment(roomId, qualityMetrics);
    }
  }

  // End call session
  static async endCall(roomId: string, userId: number) {
    const session = this.activeCalls.get(roomId);
    if (!session) throw new Error('Call session not found');

    session.status = 'ended';
    session.endedAt = new Date();

    // Calculate call duration
    const duration = session.startedAt && session.endedAt ? 
      Math.floor((session.endedAt.getTime() - session.startedAt.getTime()) / 1000) : 0;

    // Notify all participants
    this.broadcastToRoom(roomId, {
      type: 'call_ended',
      duration,
      endedBy: userId
    });

    // Cleanup
    this.activeCalls.delete(roomId);

    return { success: true, duration };
  }

  // Private methods
  private static handleSignalingMessage(signaling: WebRTCSignaling, ws: WebSocket) {
    const { type, roomId, userId, data } = signaling;

    switch (type) {
      case 'join':
        this.handleUserJoinRoom(roomId, userId, ws);
        break;
      case 'offer':
      case 'answer':
      case 'ice-candidate':
        this.forwardSignalingToRoom(roomId, signaling, userId);
        break;
      case 'leave':
        this.handleUserLeaveRoom(roomId, userId);
        break;
      case 'mute':
      case 'unmute':
        this.handleAudioToggle(roomId, userId, type === 'mute');
        break;
    }
  }

  private static handleUserJoinRoom(roomId: string, userId: number, ws: WebSocket) {
    const session = this.activeCalls.get(roomId);
    if (!session) return;

    const participant: CallParticipant = {
      userId,
      socketId: Math.random().toString(36),
      role: userId === session.callerId ? 'caller' : 'recipient',
      audioEnabled: true,
      videoEnabled: session.callType === 'video',
      screenSharing: false,
      joinedAt: new Date()
    };

    session.participants.push(participant);

    if (session.status === 'initiating') {
      session.status = 'connected';
      session.startedAt = new Date();
    }
  }

  private static handleUserLeaveRoom(roomId: string, userId: number) {
    const session = this.activeCalls.get(roomId);
    if (!session) return;

    const participantIndex = session.participants.findIndex(p => p.userId === userId);
    if (participantIndex >= 0) {
      session.participants[participantIndex].leftAt = new Date();
    }

    // End call if no participants remain
    if (session.participants.filter(p => !p.leftAt).length === 0) {
      this.endCall(roomId, userId);
    }
  }

  private static handleUserDisconnect(userId: number) {
    // Find and handle disconnection from any active calls
    for (const [roomId, session] of this.activeCalls) {
      const participant = session.participants.find(p => p.userId === userId);
      if (participant && !participant.leftAt) {
        this.handleUserLeaveRoom(roomId, userId);
      }
    }
  }

  private static handleAudioToggle(roomId: string, userId: number, muted: boolean) {
    const session = this.activeCalls.get(roomId);
    if (!session) return;

    const participant = session.participants.find(p => p.userId === userId);
    if (participant) {
      participant.audioEnabled = !muted;
    }

    this.broadcastToRoom(roomId, {
      type: muted ? 'user_muted' : 'user_unmuted',
      userId
    });
  }

  private static forwardSignalingToRoom(roomId: string, signaling: WebRTCSignaling, senderId: number) {
    const session = this.activeCalls.get(roomId);
    if (!session) return;

    // Forward to all other participants in the room
    session.participants.forEach(participant => {
      if (participant.userId !== senderId) {
        const ws = this.userSockets.get(participant.userId);
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(signaling));
        }
      }
    });
  }

  private static broadcastToRoom(roomId: string, message: any) {
    const session = this.activeCalls.get(roomId);
    if (!session) return;

    session.participants.forEach(participant => {
      const ws = this.userSockets.get(participant.userId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'room_broadcast',
          roomId,
          ...message
        }));
      }
    });
  }

  private static generateRoomId(): string {
    return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static async notifyCallRecipient(recipientId: number, session: CallSession) {
    const ws = this.userSockets.get(recipientId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'incoming_call',
        roomId: session.roomId,
        callerId: session.callerId,
        callType: session.callType
      }));
    }
  }

  private static async sendEmergencyNotification(userId: number, notification: any) {
    const ws = this.userSockets.get(userId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'emergency_notification',
        ...notification
      }));
    }
  }

  private static async inviteToConference(participantId: number, conference: CallSession, topic: string) {
    const ws = this.userSockets.get(participantId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'conference_invitation',
        roomId: conference.roomId,
        organizerId: conference.callerId,
        topic,
        callType: conference.callType
      }));
    }
  }

  private static async storeCallQualityData(qualityData: any) {
    // Store in database for analytics
    console.log('Storing call quality data:', qualityData);
  }

  private static async suggestQualityAdjustment(roomId: string, metrics: any) {
    this.broadcastToRoom(roomId, {
      type: 'quality_adjustment_suggestion',
      suggestion: metrics.packetLoss > 5 ? 'Consider switching to audio-only mode' : 'Reduce video quality',
      metrics
    });
  }
}