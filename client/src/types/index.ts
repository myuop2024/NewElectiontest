export interface User {
  id: number;
  username: string;
  email: string;
  observerId: string;
  firstName: string;
  lastName: string;
  phone?: string;
  trn?: string;
  role: string;
  status: string;
  deviceId?: string;
  lastLogin?: string;
  kycStatus: string;
  trainingStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface Parish {
  id: number;
  name: string;
  code: string;
  createdAt: string;
}

export interface PollingStation {
  id: number;
  stationCode: string;
  name: string;
  address: string;
  parishId: number;
  latitude?: string;
  longitude?: string;
  capacity?: number;
  isActive: boolean;
  createdAt: string;
}

export interface Assignment {
  id: number;
  userId: number;
  stationId: number;
  assignmentType: string;
  startDate: string;
  endDate?: string;
  status: string;
  createdAt: string;
}

export interface CheckIn {
  id: number;
  userId: number;
  stationId: number;
  latitude: string;
  longitude: string;
  timestamp: string;
  notes?: string;
}

export interface Report {
  id: number;
  userId: number;
  stationId: number;
  type: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  metadata?: any;
  attachments?: any;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: number;
}

export interface Document {
  id: number;
  userId: number;
  reportId?: number;
  fileName: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  ocrText?: string;
  aiAnalysis?: any;
  isProcessed: boolean;
  createdAt: string;
}

export interface Message {
  id: number;
  senderId: number;
  recipientId?: number;
  roomId?: string;
  messageType: string;
  content: string;
  metadata?: any;
  isRead: boolean;
  createdAt: string;
}

export interface Course {
  id: number;
  title: string;
  description: string;
  role: string;
  content?: any;
  duration?: number;
  passingScore: number;
  isActive: boolean;
  createdAt: string;
}

export interface Enrollment {
  id: number;
  userId: number;
  courseId: number;
  status: string;
  progress: number;
  score?: number;
  startedAt?: string;
  completedAt?: string;
  certificateId?: string;
  createdAt: string;
}

export interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface News {
  id: number;
  title: string;
  content: string;
  excerpt?: string;
  author: string;
  publishedAt?: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: number;
  userId?: number;
  action: string;
  entityType: string;
  entityId?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface Setting {
  id: number;
  key: string;
  value: string;
  description?: string;
  category: string;
  isPublic: boolean;
  updatedBy?: number;
  updatedAt: string;
}

export interface DashboardStats {
  totalStations: number;
  activeObservers: number;
  reportsSubmitted: number;
  pendingAlerts: number;
}

export interface GeolocationPosition {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

export interface QRCodeData {
  observerId: string;
  timestamp: string;
  signature: string;
}

export interface WebSocketMessage {
  type: string;
  data?: any;
  userId?: number;
  error?: string;
}

export interface ChatRoom {
  id: string;
  name: string;
  type: 'room' | 'direct';
  participants: number;
  unread: number;
  lastMessage?: Message;
}

export interface ActivityItem {
  id: string;
  type: 'check_in' | 'report' | 'document' | 'alert';
  user: string;
  action: string;
  timestamp: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
}

export interface AIAnalysis {
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
  voterTurnoutPrediction: number;
  keyInsights: string[];
  lastUpdated: string;
}

export interface FormField {
  id: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'file' | 'date' | 'number';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: { value: string; label: string; }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface DynamicForm {
  id: string;
  title: string;
  description: string;
  fields: FormField[];
  isActive: boolean;
  createdBy: number;
  createdAt: string;
}
