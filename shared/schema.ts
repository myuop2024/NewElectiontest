import { pgTable, text, serial, integer, boolean, timestamp, json, decimal, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table for authentication and observer management
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  observerId: varchar("observer_id", { length: 6 }).notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone").notNull().unique(),
  trn: text("trn"), // Tax Registration Number (Jamaica) - encrypted
  parishId: integer("parish_id").notNull(),
  nationalId: text("national_id").unique(),
  address: text("address"), // Full Jamaican address
  community: text("community"), // Community/District within parish
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  role: text("role").notNull().default("Observer"), // observer, admin, coordinator
  status: text("status").notNull().default("pending"), // pending, active, suspended
  deviceId: text("device_id"),
  deviceFingerprint: text("device_fingerprint"), // Unique device identifier
  deviceInfo: json("device_info"), // Device details and capabilities
  bankingDetails: text("banking_details"), // Encrypted banking information
  kycData: json("kyc_data"), // DidIT KYC verification data
  lastKnownLocation: json("last_known_location"), // GPS coordinates with timestamp
  pushNotificationToken: text("push_notification_token"), // For mobile notifications
  smsEnabled: boolean("sms_enabled").notNull().default(true),
  whatsappEnabled: boolean("whatsapp_enabled").notNull().default(false),
  lastLogin: timestamp("last_login"),
  kycStatus: text("kyc_status").notNull().default("pending"), // pending, verified, rejected
  trainingStatus: text("training_status").notNull().default("incomplete"), // incomplete, completed, certified
  certificationLevel: text("certification_level"), // basic, advanced, expert
  securityLevel: integer("security_level").notNull().default(1), // 1-5 security clearance
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Parishes and constituencies
export const parishes = pgTable("parishes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Polling stations
export const pollingStations = pgTable("polling_stations", {
  id: serial("id").primaryKey(),
  stationCode: text("station_code").notNull().unique(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  parishId: integer("parish_id").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  capacity: integer("capacity"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Observer assignments to polling stations
export const assignments = pgTable("assignments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  stationId: integer("station_id").notNull(),
  assignmentType: text("assignment_type").notNull(), // indoor, roving
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  status: text("status").notNull().default("active"), // active, completed, cancelled
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Check-ins for geo-location tracking
export const checkIns = pgTable("check_ins", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  stationId: integer("station_id").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  notes: text("notes"),
});

// Reports submitted by observers
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  stationId: integer("station_id").notNull(),
  type: text("type").notNull(), // incident, routine, final
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: text("priority").notNull().default("normal"), // low, normal, high, critical
  status: text("status").notNull().default("submitted"), // submitted, reviewed, resolved
  metadata: json("metadata"), // AI analysis results, OCR data, etc.
  attachments: json("attachments"), // file paths and metadata
  createdAt: timestamp("created_at").notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: integer("reviewed_by"),
});

// Documents uploaded by observers
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  reportId: integer("report_id"),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  filePath: text("file_path").notNull(),
  documentType: text("document_type").notNull().default("other"), // ballot_form, results_sheet, incident_report, etc.
  ocrText: text("ocr_text"), // Extracted text from OCR
  aiAnalysis: json("ai_analysis"), // AI processing results
  processingStatus: text("processing_status").notNull().default("pending"), // pending, processing, completed, failed
  uploadedBy: integer("uploaded_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Messages for real-time communication
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull(),
  recipientId: integer("recipient_id"),
  roomId: text("room_id"), // For group chats
  messageType: text("message_type").notNull().default("text"), // text, image, file, voice, video
  content: text("content").notNull(),
  metadata: json("metadata"), // file info, location, etc.
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Enhanced training courses schema
export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  role: text("role").notNull(), // indoor_agent, roving_observer, parish_coordinator
  content: json("content"), // Course modules and materials
  duration: integer("duration"), // in minutes
  passingScore: integer("passing_score").notNull().default(80),
  isActive: boolean("is_active").notNull().default(true),
  difficulty: text("difficulty").default("beginner"), // beginner, intermediate, advanced
  prerequisites: json("prerequisites"),
  learningObjectives: json("learning_objectives"),
  tags: json("tags"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Course modules for detailed content structure
export const courseModules = pgTable("course_modules", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  content: json("content"), // Rich content including text, videos, documents
  moduleOrder: integer("module_order").notNull(),
  duration: integer("duration"), // in minutes
  isRequired: boolean("is_required").default(true),
  moduleType: text("module_type").default("lesson"), // lesson, quiz, assignment, video, document
  resources: json("resources"), // Associated media and documents
  completionCriteria: json("completion_criteria"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Course quizzes and assessments
export const courseQuizzes = pgTable("course_quizzes", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  moduleId: integer("module_id").references(() => courseModules.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  questions: json("questions").notNull(), // Array of question objects
  timeLimit: integer("time_limit"), // in minutes
  maxAttempts: integer("max_attempts").default(3),
  passingScore: integer("passing_score").default(80),
  isActive: boolean("is_active").default(true),
  quizType: text("quiz_type").default("assessment"), // assessment, practice, final
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Quiz attempt tracking
export const quizAttempts = pgTable("quiz_attempts", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").notNull().references(() => courseQuizzes.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  answers: json("answers").notNull(),
  score: integer("score"),
  timeSpent: integer("time_spent"), // in seconds
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  isSubmitted: boolean("is_submitted").default(false),
});

// Course media library
export const courseMedia = pgTable("course_media", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").references(() => courses.id, { onDelete: "cascade" }),
  moduleId: integer("module_id").references(() => courseModules.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  mediaType: text("media_type").notNull(), // video, audio, document, image, presentation
  duration: integer("duration"), // for video/audio in seconds
  thumbnail: text("thumbnail"),
  description: text("description"),
  uploadedBy: integer("uploaded_by").notNull().references(() => users.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Course contests and competitions
export const courseContests = pgTable("course_contests", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  contestType: text("contest_type").notNull(), // quiz_competition, case_study, scenario_simulation
  rules: json("rules"),
  prizes: json("prizes"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  maxParticipants: integer("max_participants"),
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Contest participation tracking
export const contestParticipants = pgTable("contest_participants", {
  id: serial("id").primaryKey(),
  contestId: integer("contest_id").notNull().references(() => courseContests.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  score: integer("score").default(0),
  rank: integer("rank"),
  submission: json("submission"),
  submittedAt: timestamp("submitted_at"),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

// User course enrollments and progress
export const enrollments = pgTable("enrollments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  courseId: integer("course_id").notNull(),
  status: text("status").notNull().default("enrolled"), // enrolled, in_progress, completed, failed
  progress: integer("progress").notNull().default(0), // percentage
  score: integer("score"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  certificateId: text("certificate_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// FAQ knowledge base
export const faqs = pgTable("faqs", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  category: text("category").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// News articles
export const news = pgTable("news", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  excerpt: text("excerpt"),
  author: text("author").notNull(),
  publishedAt: timestamp("published_at"),
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// System audit logs
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  oldValues: json("old_values"),
  newValues: json("new_values"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// System settings
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  isPublic: boolean("is_public").notNull().default(false),
  updatedBy: integer("updated_by"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Device management for security binding
export const devices = pgTable("devices", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  deviceFingerprint: text("device_fingerprint").notNull().unique(),
  deviceName: text("device_name").notNull(),
  deviceType: text("device_type").notNull(), // mobile, tablet, desktop
  osVersion: text("os_version"),
  browserInfo: text("browser_info"),
  ipAddress: text("ip_address"),
  isActive: boolean("is_active").notNull().default(true),
  lastSeen: timestamp("last_seen").notNull().defaultNow(),
  registeredAt: timestamp("registered_at").notNull().defaultNow(),
});

// Security audit logs
export const securityLogs = pgTable("security_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  action: text("action").notNull(),
  deviceFingerprint: text("device_fingerprint"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  riskLevel: text("risk_level").notNull().default("low"), // low, medium, high, critical
  details: json("details"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// KYC verification records
export const kycVerifications = pgTable("kyc_verifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  verificationType: text("verification_type").notNull(), // didit, manual
  status: text("status").notNull(), // pending, approved, rejected
  verificationData: json("verification_data"),
  documentUploads: json("document_uploads"),
  verifiedBy: integer("verified_by"),
  verifiedAt: timestamp("verified_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Push notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("info"), // info, warning, alert, success
  priority: text("priority").notNull().default("normal"), // low, normal, high, urgent
  isRead: boolean("is_read").notNull().default(false),
  sentVia: text("sent_via"), // push, sms, whatsapp, email
  metadata: json("metadata"),
  scheduledFor: timestamp("scheduled_for"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Forms builder
export const forms = pgTable("forms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  formData: json("form_data").notNull(), // Drag-and-drop form structure
  version: integer("version").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  isPublished: boolean("is_published").notNull().default(false),
  permissions: json("permissions"), // Role-based access
  analyticsEnabled: boolean("analytics_enabled").notNull().default(true),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Form submissions
export const formSubmissions = pgTable("form_submissions", {
  id: serial("id").primaryKey(),
  formId: integer("form_id").notNull(),
  userId: integer("user_id").notNull(),
  submissionData: json("submission_data").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  gpsLocation: json("gps_location"),
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
});

// Route tracking for roving observers
export const routes = pgTable("routes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  routeName: text("route_name").notNull(),
  startLocation: json("start_location").notNull(),
  endLocation: json("end_location").notNull(),
  waypoints: json("waypoints"), // Array of GPS coordinates
  totalDistance: decimal("total_distance", { precision: 10, scale: 2 }),
  estimatedDuration: integer("estimated_duration"), // minutes
  actualDuration: integer("actual_duration"), // minutes
  mileageRate: decimal("mileage_rate", { precision: 5, scale: 2 }),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }),
  status: text("status").notNull().default("planned"), // planned, active, completed
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// GPS tracking points
export const gpsTracking = pgTable("gps_tracking", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  routeId: integer("route_id"),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  accuracy: decimal("accuracy", { precision: 5, scale: 2 }),
  altitude: decimal("altitude", { precision: 8, scale: 2 }),
  speed: decimal("speed", { precision: 5, scale: 2 }),
  heading: decimal("heading", { precision: 5, scale: 2 }),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

// Voice/video calls
export const calls = pgTable("calls", {
  id: serial("id").primaryKey(),
  callerId: integer("caller_id").notNull(),
  recipientId: integer("recipient_id"),
  roomId: text("room_id"), // For group calls
  callType: text("call_type").notNull(), // voice, video
  status: text("status").notNull(), // ringing, active, ended, missed
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  duration: integer("duration"), // seconds
  quality: text("quality"), // poor, fair, good, excellent
  recordingUrl: text("recording_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// SMS and WhatsApp integration
export const smsMessages = pgTable("sms_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  phoneNumber: text("phone_number").notNull(),
  message: text("message").notNull(),
  direction: text("direction").notNull(), // inbound, outbound
  provider: text("provider").notNull(), // sms, whatsapp
  status: text("status").notNull(), // pending, sent, delivered, failed
  providerId: text("provider_id"), // External provider message ID
  cost: decimal("cost", { precision: 5, scale: 4 }),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Email integration
export const emails = pgTable("emails", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  fromEmail: text("from_email").notNull(),
  toEmail: text("to_email").notNull(),
  ccEmails: json("cc_emails"),
  bccEmails: json("bcc_emails"),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  isHtml: boolean("is_html").notNull().default(false),
  attachments: json("attachments"),
  status: text("status").notNull().default("pending"), // pending, sent, delivered, failed
  templateId: integer("template_id"),
  scheduledFor: timestamp("scheduled_for"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Email templates
export const emailTemplates = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  bodyHtml: text("body_html").notNull(),
  bodyText: text("body_text"),
  variables: json("variables"), // Template variables
  category: text("category").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// External integrations
export const integrations = pgTable("integrations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // googlesheets, bigquery, didit, whatsapp, sms
  config: json("config").notNull(), // API keys, endpoints, settings
  isActive: boolean("is_active").notNull().default(true),
  lastSync: timestamp("last_sync"),
  syncStatus: text("sync_status"), // success, error, pending
  errorLog: text("error_log"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Data synchronization logs
export const syncLogs = pgTable("sync_logs", {
  id: serial("id").primaryKey(),
  integrationId: integer("integration_id").notNull(),
  operation: text("operation").notNull(), // import, export, sync
  recordsProcessed: integer("records_processed").notNull().default(0),
  recordsSuccess: integer("records_success").notNull().default(0),
  recordsError: integer("records_error").notNull().default(0),
  details: json("details"),
  errorLog: text("error_log"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Chat rooms for group messaging
export const chatRooms = pgTable("chat_rooms", {
  id: text("id").primaryKey(), // 'general', 'emergency', etc.
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // public, private, emergency
  createdBy: integer("created_by").notNull(),
  maxParticipants: integer("max_participants"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Chat messages for rooms and direct messages
export const chatMessages = pgTable("chat_messages", {
  id: text("id").primaryKey(),
  roomId: text("room_id"), // null for direct messages
  senderId: integer("sender_id").notNull(),
  recipientId: integer("recipient_id"), // null for room messages
  content: text("content").notNull(),
  messageType: text("message_type").notNull().default("text"), // text, file, image, call, video
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Online users tracking
export const onlineUsers = pgTable("online_users", {
  userId: integer("user_id").primaryKey(),
  socketId: text("socket_id"),
  lastSeen: timestamp("last_seen").notNull().defaultNow(),
  status: text("status").notNull().default("online"), // online, away, busy
  currentRoom: text("current_room"),
});

// Certificate templates
export const certificateTemplates = pgTable("certificate_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  templateType: text("template_type").notNull().default("basic"), // basic, professional, modern, elegant, minimal
  templateData: json("template_data").notNull(), // Template configuration and styling
  isDefault: boolean("is_default").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  assignments: many(assignments),
  checkIns: many(checkIns),
  reports: many(reports),
  documents: many(documents),
  sentMessages: many(messages, { relationName: "sender" }),
  receivedMessages: many(messages, { relationName: "recipient" }),
  chatMessages: many(chatMessages),
  enrollments: many(enrollments),
  auditLogs: many(auditLogs),
}));

export const parishesRelations = relations(parishes, ({ many }) => ({
  pollingStations: many(pollingStations),
}));

export const pollingStationsRelations = relations(pollingStations, ({ one, many }) => ({
  parish: one(parishes, { fields: [pollingStations.parishId], references: [parishes.id] }),
  assignments: many(assignments),
  checkIns: many(checkIns),
  reports: many(reports),
}));

export const assignmentsRelations = relations(assignments, ({ one }) => ({
  user: one(users, { fields: [assignments.userId], references: [users.id] }),
  station: one(pollingStations, { fields: [assignments.stationId], references: [pollingStations.id] }),
}));

export const checkInsRelations = relations(checkIns, ({ one }) => ({
  user: one(users, { fields: [checkIns.userId], references: [users.id] }),
  station: one(pollingStations, { fields: [checkIns.stationId], references: [pollingStations.id] }),
}));

export const reportsRelations = relations(reports, ({ one, many }) => ({
  user: one(users, { fields: [reports.userId], references: [users.id] }),
  station: one(pollingStations, { fields: [reports.stationId], references: [pollingStations.id] }),
  reviewer: one(users, { fields: [reports.reviewedBy], references: [users.id] }),
  documents: many(documents),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  user: one(users, { fields: [documents.userId], references: [users.id] }),
  report: one(reports, { fields: [documents.reportId], references: [reports.id] }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, { fields: [messages.senderId], references: [users.id], relationName: "sender" }),
  recipient: one(users, { fields: [messages.recipientId], references: [users.id], relationName: "recipient" }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  sender: one(users, { fields: [chatMessages.senderId], references: [users.id] }),
  recipient: one(users, { fields: [chatMessages.recipientId], references: [users.id] }),
  room: one(chatRooms, { fields: [chatMessages.roomId], references: [chatRooms.id] }),
}));

export const chatRoomsRelations = relations(chatRooms, ({ one, many }) => ({
  creator: one(users, { fields: [chatRooms.createdBy], references: [users.id] }),
  messages: many(chatMessages),
}));

export const coursesRelations = relations(courses, ({ many }) => ({
  enrollments: many(enrollments),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  user: one(users, { fields: [enrollments.userId], references: [users.id] }),
  course: one(courses, { fields: [enrollments.courseId], references: [courses.id] }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  observerId: true,
  createdAt: true,
  updatedAt: true,
  lastLogin: true,
});

export const insertParishSchema = createInsertSchema(parishes).omit({
  id: true,
  createdAt: true,
});

export const insertPollingStationSchema = createInsertSchema(pollingStations).omit({
  id: true,
  createdAt: true,
});

export const insertAssignmentSchema = createInsertSchema(assignments).omit({
  id: true,
  createdAt: true,
});

export const insertCheckInSchema = createInsertSchema(checkIns).omit({
  id: true,
  timestamp: true,
});

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  createdAt: true,
  reviewedAt: true,
  reviewedBy: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
  isRead: true,
});

export const insertCourseSchema = createInsertSchema(courses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCourseModuleSchema = createInsertSchema(courseModules).omit({
  id: true,
  createdAt: true,
});

export const insertCourseQuizSchema = createInsertSchema(courseQuizzes).omit({
  id: true,
  createdAt: true,
});

export const insertQuizAttemptSchema = createInsertSchema(quizAttempts).omit({
  id: true,
  startedAt: true,
  completedAt: true,
});

export const insertCourseMediaSchema = createInsertSchema(courseMedia).omit({
  id: true,
  createdAt: true,
});

export const insertCourseContestSchema = createInsertSchema(courseContests).omit({
  id: true,
  createdAt: true,
});

export const insertContestParticipantSchema = createInsertSchema(contestParticipants).omit({
  id: true,
  joinedAt: true,
  submittedAt: true,
});

export const insertEnrollmentSchema = createInsertSchema(enrollments).omit({
  id: true,
  createdAt: true,
  startedAt: true,
  completedAt: true,
  certificateId: true,
});

export const insertFaqSchema = createInsertSchema(faqs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNewsSchema = createInsertSchema(news).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export const insertSettingSchema = createInsertSchema(settings).omit({
  id: true,
  updatedAt: true,
});

export const insertChatRoomSchema = createInsertSchema(chatRooms).omit({
  createdAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  createdAt: true,
});

export const insertOnlineUserSchema = createInsertSchema(onlineUsers).omit({
  lastSeen: true,
});

// Certificate templates schema
export const insertCertificateTemplateSchema = createInsertSchema(certificateTemplates);
export type CertificateTemplate = typeof certificateTemplates.$inferSelect;
export type InsertCertificateTemplate = z.infer<typeof insertCertificateTemplateSchema>;

// Additional insert schemas for new tables
export const insertDeviceSchema = createInsertSchema(devices).omit({
  id: true,
  lastSeen: true,
  registeredAt: true,
});

export const insertSecurityLogSchema = createInsertSchema(securityLogs).omit({
  id: true,
  createdAt: true,
});

export const insertKycVerificationSchema = createInsertSchema(kycVerifications).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertFormSchema = createInsertSchema(forms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFormSubmissionSchema = createInsertSchema(formSubmissions).omit({
  id: true,
  submittedAt: true,
});

export const insertRouteSchema = createInsertSchema(routes).omit({
  id: true,
  createdAt: true,
});

export const insertGpsTrackingSchema = createInsertSchema(gpsTracking).omit({
  id: true,
  timestamp: true,
});

export const insertCallSchema = createInsertSchema(calls).omit({
  id: true,
  createdAt: true,
});

export const insertSmsMessageSchema = createInsertSchema(smsMessages).omit({
  id: true,
  createdAt: true,
});

export const insertEmailSchema = createInsertSchema(emails).omit({
  id: true,
  createdAt: true,
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertIntegrationSchema = createInsertSchema(integrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSyncLogSchema = createInsertSchema(syncLogs).omit({
  id: true,
  startedAt: true,
});

// Additional types
export type Device = typeof devices.$inferSelect;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type SecurityLog = typeof securityLogs.$inferSelect;
export type InsertSecurityLog = z.infer<typeof insertSecurityLogSchema>;
export type KycVerification = typeof kycVerifications.$inferSelect;
export type InsertKycVerification = z.infer<typeof insertKycVerificationSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Form = typeof forms.$inferSelect;
export type InsertForm = z.infer<typeof insertFormSchema>;
export type FormSubmission = typeof formSubmissions.$inferSelect;
export type InsertFormSubmission = z.infer<typeof insertFormSubmissionSchema>;
export type Route = typeof routes.$inferSelect;
export type InsertRoute = z.infer<typeof insertRouteSchema>;
export type GpsTracking = typeof gpsTracking.$inferSelect;
export type InsertGpsTracking = z.infer<typeof insertGpsTrackingSchema>;
export type Call = typeof calls.$inferSelect;
export type InsertCall = z.infer<typeof insertCallSchema>;
export type SmsMessage = typeof smsMessages.$inferSelect;
export type InsertSmsMessage = z.infer<typeof insertSmsMessageSchema>;
export type Email = typeof emails.$inferSelect;
export type InsertEmail = z.infer<typeof insertEmailSchema>;
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type Integration = typeof integrations.$inferSelect;
export type InsertIntegration = z.infer<typeof insertIntegrationSchema>;
export type SyncLog = typeof syncLogs.$inferSelect;
export type InsertSyncLog = z.infer<typeof insertSyncLogSchema>;

// Core types that were missing
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Parish = typeof parishes.$inferSelect;
export type InsertParish = z.infer<typeof insertParishSchema>;
export type PollingStation = typeof pollingStations.$inferSelect;
export type InsertPollingStation = z.infer<typeof insertPollingStationSchema>;
export type Assignment = typeof assignments.$inferSelect;
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type CheckIn = typeof checkIns.$inferSelect;
export type InsertCheckIn = z.infer<typeof insertCheckInSchema>;
export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Course = typeof courses.$inferSelect;
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type CourseModule = typeof courseModules.$inferSelect;
export type InsertCourseModule = z.infer<typeof insertCourseModuleSchema>;
export type CourseQuiz = typeof courseQuizzes.$inferSelect;
export type InsertCourseQuiz = z.infer<typeof insertCourseQuizSchema>;
export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type InsertQuizAttempt = z.infer<typeof insertQuizAttemptSchema>;
export type CourseMedia = typeof courseMedia.$inferSelect;
export type InsertCourseMedia = z.infer<typeof insertCourseMediaSchema>;
export type CourseContest = typeof courseContests.$inferSelect;
export type InsertCourseContest = z.infer<typeof insertCourseContestSchema>;
export type ContestParticipant = typeof contestParticipants.$inferSelect;
export type InsertContestParticipant = z.infer<typeof insertContestParticipantSchema>;
export type Enrollment = typeof enrollments.$inferSelect;
export type InsertEnrollment = z.infer<typeof insertEnrollmentSchema>;
export type FAQ = typeof faqs.$inferSelect;
export type InsertFAQ = z.infer<typeof insertFaqSchema>;
export type News = typeof news.$inferSelect;
export type InsertNews = z.infer<typeof insertNewsSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type ChatRoom = typeof chatRooms.$inferSelect;
export type InsertChatRoom = z.infer<typeof insertChatRoomSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type OnlineUser = typeof onlineUsers.$inferSelect;
export type InsertOnlineUser = z.infer<typeof insertOnlineUserSchema>;
