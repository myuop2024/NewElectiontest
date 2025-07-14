import { pgTable, text, serial, integer, boolean, timestamp, json, decimal, varchar, real } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod"; // Added createSelectSchema
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

// Messages for real-time communication (assuming this is for direct messages)
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull(),
  recipientId: integer("recipient_id"), // Nullable for now, but should be notNull for DMs
  roomId: text("room_id"), // For group chats, if this table is also used for that
  messageType: text("message_type").notNull().default("text"),
  content: text("content").notNull(),
  metadata: json("metadata"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Training Platform Schemas
export const courses = pgTable("courses", { // Referred to as trainingPrograms in routes
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  target_audience: text("target_audience"), // Changed from role to match typical naming
  content: json("content"), // General course content (overview, etc.)
  duration: integer("duration"), // in minutes (total estimated for the course)
  passingScore: integer("passing_score").notNull().default(80),
  isActive: boolean("is_active").notNull().default(true),
  difficulty: text("difficulty").default("beginner"),
  prerequisites: json("prerequisites"), // Array of course IDs or specific requirements
  learningObjectives: json("learning_objectives"), // Array of strings
  tags: json("tags"), // Array of strings
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const courseModules = pgTable("course_modules", { // Referred to as trainingModules
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  content: json("content"), // Rich content including lessons
  moduleOrder: integer("module_order").notNull(),
  duration: integer("duration"),
  isRequired: boolean("is_required").default(true),
  type: text("module_type").default("lesson"), // lesson, video, reading, quiz, assignment
  resources: json("resources"), // External links, files, etc.
  completionCriteria: json("completion_criteria"), // How to mark as complete
  status: text("status").default("draft"), // draft, published, archived
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Individual lessons within modules
export const courseLessons = pgTable("course_lessons", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id").notNull().references(() => courseModules.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  content: json("content").notNull(), // Rich text content, videos, images
  lessonOrder: integer("lesson_order").notNull(),
  duration: integer("duration"), // minutes
  type: text("type").notNull().default("text"), // text, video, interactive, document
  videoUrl: text("video_url"),
  attachments: json("attachments"), // Files, images, PDFs
  isRequired: boolean("is_required").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const courseQuizzes = pgTable("course_quizzes", { // Referred to as trainingQuizzes
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  moduleId: integer("module_id").references(() => courseModules.id, { onDelete: "cascade" }), // Can be nullable if quiz is course-wide
  title: text("title").notNull(),
  description: text("description"),
  questions: json("questions").notNull(),
  timeLimit: integer("time_limit"),
  maxAttempts: integer("max_attempts").default(3),
  passingScore: integer("passing_score").default(80),
  isActive: boolean("is_active").default(true),
  quizType: text("quiz_type").default("assessment"),
  status: text("status").default("draft"), // Added status
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(), // Added updatedAt
});

// NEW: Course Assignments Table
export const courseAssignments = pgTable("course_assignments", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").references(() => courses.id, { onDelete: 'cascade' }),
  moduleId: integer("module_id").references(() => courseModules.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  description: text("description"),
  submissionTypes: json("submission_types").notNull(), // e.g., ['file', 'online_text']
  dueDate: timestamp("due_date"),
  pointsPossible: integer("points_possible"),
  config: json("config"), // e.g., { allowedFileTypes: ["pdf", "doc"], maxFileSizeMB: 10, wordLimit: 500 }
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// NEW: Assignment Submissions Table
export const assignmentSubmissions = pgTable("assignment_submissions", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").references(() => courseAssignments.id, { onDelete: 'cascade' }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  submissionDate: timestamp("submission_date").notNull().defaultNow(),
  content: json("content"), // For 'online_text' (rich text), or metadata for files
  submittedFiles: json("submitted_files"), // Array of objects: {fileName: string, filePath: string, size: number, type: string}
  grade: integer("grade"),
  graderFeedback: text("grader_feedback"),
  gradedDate: timestamp("graded_date"),
  status: text("status").notNull().default('submitted'), // e.g., 'submitted', 'late', 'graded', 'resubmitted'
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});


export const quizAttempts = pgTable("quiz_attempts", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").notNull().references(() => courseQuizzes.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  answers: json("answers").notNull(),
  score: integer("score"),
  timeSpent: integer("time_spent"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  isSubmitted: boolean("is_submitted").default(false),
});

export const courseMedia = pgTable("course_media", { // Referred to as trainingMedia
  id: serial("id").primaryKey(),
  courseId: integer("course_id").references(() => courses.id, { onDelete: "cascade" }),
  moduleId: integer("module_id").references(() => courseModules.id, { onDelete: "cascade" }),
  title: text("title"), // Added title as it's useful
  description: text("description"),
  fileName: text("file_name").notNull(),
  originalName: text("original_name"), // Made nullable
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  mediaType: text("media_type"), // Made nullable, can be inferred from mimeType
  duration: integer("duration"),
  thumbnail: text("thumbnail"),
  uploaderId: integer("uploader_id").references(() => users.id), // Renamed from uploadedBy
  status: text("status").default("uploaded"), // Added status
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(), // Added updatedAt
});

export const courseContests = pgTable("course_contests", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  contestType: text("contest_type").notNull(),
  rules: json("rules"),
  prizes: json("prizes"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  maxParticipants: integer("max_participants"),
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

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

export const enrollments = pgTable("enrollments", { // Referred to as trainingEnrollments
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  courseId: integer("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("enrolled"),
  progress: integer("progress").notNull().default(0),
  score: integer("score"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  certificateId: text("certificate_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(), // Added
});

// User progress within modules
export const trainingProgress = pgTable("training_progress", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    courseId: integer("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    moduleId: integer("module_id").notNull().references(() => courseModules.id, { onDelete: "cascade" }),
    enrollmentId: integer("enrollment_id").notNull().references(() => enrollments.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("in_progress"), // in_progress, completed
    progressDetail: json("progress_detail"), // e.g., video watch time, pages viewed
    lastAccessedAt: timestamp("last_accessed_at").notNull().defaultNow(),
});

// User progress tracking for individual lessons
export const userLessonProgress = pgTable("user_lesson_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lessonId: integer("lesson_id").notNull().references(() => courseLessons.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("not_started"), // not_started, in_progress, completed
  timeSpent: integer("time_spent").default(0), // minutes
  lastPosition: integer("last_position").default(0), // for videos, reading position
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});


// FAQ knowledge base, System Audit Logs, Settings, etc. remain the same as before...
// (Assuming the rest of the file from the input is here)
export const faqs = pgTable("faqs", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  category: text("category").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

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

export const devices = pgTable("devices", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  deviceFingerprint: text("device_fingerprint").notNull().unique(),
  deviceName: text("device_name").notNull(),
  deviceType: text("device_type").notNull(),
  osVersion: text("os_version"),
  browserInfo: text("browser_info"),
  ipAddress: text("ip_address"),
  isActive: boolean("is_active").notNull().default(true),
  lastSeen: timestamp("last_seen").notNull().defaultNow(),
  registeredAt: timestamp("registered_at").notNull().defaultNow(),
});

export const securityLogs = pgTable("security_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  action: text("action").notNull(),
  deviceFingerprint: text("device_fingerprint"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  riskLevel: text("risk_level").notNull().default("low"),
  details: json("details"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const kycVerifications = pgTable("kyc_verifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  verificationType: text("verification_type").notNull(),
  status: text("status").notNull(),
  verificationData: json("verification_data"),
  documentUploads: json("document_uploads"),
  verifiedBy: integer("verified_by"),
  verifiedAt: timestamp("verified_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("info"),
  priority: text("priority").notNull().default("normal"),
  isRead: boolean("is_read").notNull().default(false),
  sentVia: text("sent_via"),
  metadata: json("metadata"),
  scheduledFor: timestamp("scheduled_for"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const forms = pgTable("forms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  formData: json("form_data").notNull(),
  version: integer("version").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  isPublished: boolean("is_published").notNull().default(false),
  permissions: json("permissions"),
  analyticsEnabled: boolean("analytics_enabled").notNull().default(true),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

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

export const routes = pgTable("routes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  routeName: text("route_name").notNull(),
  startLocation: json("start_location").notNull(),
  endLocation: json("end_location").notNull(),
  waypoints: json("waypoints"),
  totalDistance: decimal("total_distance", { precision: 10, scale: 2 }),
  estimatedDuration: integer("estimated_duration"),
  actualDuration: integer("actual_duration"),
  mileageRate: decimal("mileage_rate", { precision: 5, scale: 2 }),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }),
  status: text("status").notNull().default("planned"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

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

export const calls = pgTable("calls", {
  id: serial("id").primaryKey(),
  callerId: integer("caller_id").notNull(),
  recipientId: integer("recipient_id"),
  roomId: text("room_id"),
  callType: text("call_type").notNull(),
  status: text("status").notNull(),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  duration: integer("duration"),
  quality: text("quality"),
  recordingUrl: text("recording_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const smsMessages = pgTable("sms_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  phoneNumber: text("phone_number").notNull(),
  message: text("message").notNull(),
  direction: text("direction").notNull(),
  provider: text("provider").notNull(),
  status: text("status").notNull(),
  providerId: text("provider_id"),
  cost: decimal("cost", { precision: 5, scale: 4 }),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

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
  status: text("status").notNull().default("pending"),
  templateId: integer("template_id"),
  scheduledFor: timestamp("scheduled_for"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const emailTemplates = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  bodyHtml: text("body_html").notNull(),
  bodyText: text("body_text"),
  variables: json("variables"),
  category: text("category").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const integrations = pgTable("integrations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  config: json("config").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  lastSync: timestamp("last_sync"),
  syncStatus: text("sync_status"),
  errorLog: text("error_log"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const syncLogs = pgTable("sync_logs", {
  id: serial("id").primaryKey(),
  integrationId: integer("integration_id").notNull(),
  operation: text("operation").notNull(),
  recordsProcessed: integer("records_processed").notNull().default(0),
  recordsSuccess: integer("records_success").notNull().default(0),
  recordsError: integer("records_error").notNull().default(0),
  details: json("details"),
  errorLog: text("error_log"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const chatRooms = pgTable("chat_rooms", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(),
  createdBy: integer("created_by").notNull(),
  maxParticipants: integer("max_participants"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: text("id").primaryKey(),
  roomId: text("room_id"),
  senderId: integer("sender_id").notNull(),
  recipientId: integer("recipient_id"),
  content: text("content").notNull(),
  messageType: text("message_type").notNull().default("text"),
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const onlineUsers = pgTable("online_users", {
  userId: integer("user_id").primaryKey(),
  socketId: text("socket_id"),
  lastSeen: timestamp("last_seen").notNull().defaultNow(),
  status: text("status").notNull().default("online"),
  currentRoom: text("current_room"),
});

export const certificateTemplates = pgTable("certificate_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  templateType: text("template_type").notNull().default("basic"),
  templateData: json("template_data").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: integer("created_by").notNull(), // Assuming reference to users table
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
  quizAttempts: many(quizAttempts)
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
  modules: many(courseModules),
  quizzes: many(courseQuizzes),
  media: many(courseMedia),
  contests: many(courseContests)
}));

export const courseModulesRelations = relations(courseModules, ({ one, many }) => ({
  course: one(courses, {
    fields: [courseModules.courseId],
    references: [courses.id],
  }),
  quizzes: many(courseQuizzes),
  media: many(courseMedia)
}));

export const courseQuizzesRelations = relations(courseQuizzes, ({ one, many }) => ({
    course: one(courses, { fields: [courseQuizzes.courseId], references: [courses.id] }),
    module: one(courseModules, { fields: [courseQuizzes.moduleId], references: [courseModules.id] }),
    attempts: many(quizAttempts),
}));

export const quizAttemptsRelations = relations(quizAttempts, ({ one }) => ({
    quiz: one(courseQuizzes, { fields: [quizAttempts.quizId], references: [courseQuizzes.id] }),
    user: one(users, { fields: [quizAttempts.userId], references: [users.id] }),
}));

export const courseMediaRelations = relations(courseMedia, ({ one }) => ({
    course: one(courses, { fields: [courseMedia.courseId], references: [courses.id] }),
    module: one(courseModules, { fields: [courseMedia.moduleId], references: [courseModules.id] }),
    uploader: one(users, { fields: [courseMedia.uploaderId], references: [users.id] }),
}));

export const courseContestsRelations = relations(courseContests, ({ one, many }) => ({
    course: one(courses, { fields: [courseContests.courseId], references: [courses.id] }),
    creator: one(users, { fields: [courseContests.createdBy], references: [users.id] }),
    participants: many(contestParticipants),
}));

export const contestParticipantsRelations = relations(contestParticipants, ({ one }) => ({
    contest: one(courseContests, { fields: [contestParticipants.contestId], references: [courseContests.id] }),
    user: one(users, { fields: [contestParticipants.userId], references: [users.id] }),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  user: one(users, { fields: [enrollments.userId], references: [users.id] }),
  course: one(courses, { fields: [enrollments.courseId], references: [courses.id] })
}));

// Relations removed for undefined tables


// Insert schemas
export const insertUserSchema = createInsertSchema(users);
export const insertParishSchema = createInsertSchema(parishes);
export const insertPollingStationSchema = createInsertSchema(pollingStations);
export const insertAssignmentSchema = createInsertSchema(assignments);
export const insertCheckInSchema = createInsertSchema(checkIns);
export const insertReportSchema = createInsertSchema(reports);
export const insertDocumentSchema = createInsertSchema(documents);
export const insertMessageSchema = createInsertSchema(messages);
export const insertCourseSchema = createInsertSchema(courses);
export const insertCourseModuleSchema = createInsertSchema(courseModules);
export const insertCourseQuizSchema = createInsertSchema(courseQuizzes);
export const insertQuizAttemptSchema = createInsertSchema(quizAttempts);
export const insertCourseMediaSchema = createInsertSchema(courseMedia);
export const insertCourseContestSchema = createInsertSchema(courseContests);
export const insertContestParticipantSchema = createInsertSchema(contestParticipants);
export const insertEnrollmentSchema = createInsertSchema(enrollments);
export const insertTrainingProgressSchema = createInsertSchema(trainingProgress);
export const insertCourseLessonSchema = createInsertSchema(courseLessons);
export const insertUserLessonProgressSchema = createInsertSchema(userLessonProgress);
export const insertFaqSchema = createInsertSchema(faqs);
export const insertNewsSchema = createInsertSchema(news);
export const insertAuditLogSchema = createInsertSchema(auditLogs);
export const insertSettingSchema = createInsertSchema(settings);
export const insertChatRoomSchema = createInsertSchema(chatRooms);
export const insertChatMessageSchema = createInsertSchema(chatMessages);
export const insertOnlineUserSchema = createInsertSchema(onlineUsers);
export const insertCertificateTemplateSchema = createInsertSchema(certificateTemplates);
export const insertDeviceSchema = createInsertSchema(devices);
export const insertSecurityLogSchema = createInsertSchema(securityLogs);
export const insertKycVerificationSchema = createInsertSchema(kycVerifications);
export const insertNotificationSchema = createInsertSchema(notifications);
export const insertFormSchema = createInsertSchema(forms);
export const insertFormSubmissionSchema = createInsertSchema(formSubmissions);
export const insertRouteSchema = createInsertSchema(routes);
export const insertGpsTrackingSchema = createInsertSchema(gpsTracking);
export const insertCallSchema = createInsertSchema(calls);
export const insertSmsMessageSchema = createInsertSchema(smsMessages);
export const insertEmailSchema = createInsertSchema(emails);
export const insertEmailTemplateSchema = createInsertSchema(emailTemplates);
export const insertIntegrationSchema = createInsertSchema(integrations);
export const insertSyncLogSchema = createInsertSchema(syncLogs);

// NEW Zod schemas for Assignments
export const insertCourseAssignmentSchema = createInsertSchema(courseAssignments);
export const selectCourseAssignmentSchema = createSelectSchema(courseAssignments); // Added select
export const insertAssignmentSubmissionSchema = createInsertSchema(assignmentSubmissions);
export const selectAssignmentSubmissionSchema = createSelectSchema(assignmentSubmissions); // Added select


// Select Schemas (Types)
export type User = typeof users.$inferSelect;
export type Parish = typeof parishes.$inferSelect;
export type PollingStation = typeof pollingStations.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;
export type CheckIn = typeof checkIns.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type CourseModule = typeof courseModules.$inferSelect;
export type CourseQuiz = typeof courseQuizzes.$inferSelect;
export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type CourseMedia = typeof courseMedia.$inferSelect;
export type CourseContest = typeof courseContests.$inferSelect;
export type ContestParticipant = typeof contestParticipants.$inferSelect;
export type Enrollment = typeof enrollments.$inferSelect;
export type TrainingProgress = typeof trainingProgress.$inferSelect;
export type CourseLesson = typeof courseLessons.$inferSelect;
export type UserLessonProgress = typeof userLessonProgress.$inferSelect;
export type FAQ = typeof faqs.$inferSelect;
export type News = typeof news.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type Setting = typeof settings.$inferSelect;
export type Device = typeof devices.$inferSelect;
export type SecurityLog = typeof securityLogs.$inferSelect;
export type KycVerification = typeof kycVerifications.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Form = typeof forms.$inferSelect;
export type FormSubmission = typeof formSubmissions.$inferSelect;
export type Route = typeof routes.$inferSelect;
export type GpsTracking = typeof gpsTracking.$inferSelect;
export type Call = typeof calls.$inferSelect;
export type SmsMessage = typeof smsMessages.$inferSelect;
export type Email = typeof emails.$inferSelect;
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type Integration = typeof integrations.$inferSelect;
export type SyncLog = typeof syncLogs.$inferSelect;
export type ChatRoom = typeof chatRooms.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type OnlineUser = typeof onlineUsers.$inferSelect;
export type CertificateTemplate = typeof certificateTemplates.$inferSelect;

// NEW Select types for Assignments
export type CourseAssignment = typeof courseAssignments.$inferSelect;
export type AssignmentSubmission = typeof assignmentSubmissions.$inferSelect;


// Google Classroom integration tables
export const googleClassroomTokens = pgTable("google_classroom_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => users.id),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  tokenType: text("token_type").default("Bearer"),
  expiryDate: timestamp("expiry_date"),
  scope: text("scope"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull()
});

export const classroomCourses = pgTable("classroom_courses", {
  id: serial("id").primaryKey(),
  classroomId: text("classroom_id").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  section: text("section"),
  room: text("room"),
  ownerId: text("owner_id"),
  courseState: text("course_state").default("ACTIVE"),
  alternateLink: text("alternate_link"),
  teacherGroupEmail: text("teacher_group_email"),
  courseGroupEmail: text("course_group_email"),
  guardiansEnabled: boolean("guardians_enabled").default(false),
  calendarId: text("calendar_id"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull()
});

// Training completion tracking based on Google Classroom data
export const trainingCompletions = pgTable("training_completions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  classroomCourseId: text("classroom_course_id").notNull(),
  courseName: text("course_name").notNull(),
  completionDate: timestamp("completion_date").notNull(),
  finalGrade: decimal("final_grade", { precision: 5, scale: 2 }),
  totalAssignments: integer("total_assignments").notNull().default(0),
  completedAssignments: integer("completed_assignments").notNull().default(0),
  submissionQuality: text("submission_quality"), // excellent, good, satisfactory, needs_improvement
  certificateGenerated: boolean("certificate_generated").notNull().default(false),
  certificateNumber: text("certificate_number").unique(),
  competencyLevel: text("competency_level"), // basic, intermediate, advanced, expert
  skillsAcquired: json("skills_acquired"), // Array of skills/competencies earned
  instructorNotes: text("instructor_notes"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull()
});

// Digital certificates with blockchain-style verification
export const certificates = pgTable("certificates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  trainingCompletionId: integer("training_completion_id").references(() => trainingCompletions.id),
  certificateNumber: text("certificate_number").notNull().unique(),
  certificateType: text("certificate_type").notNull(), // course_completion, competency, excellence, master_observer
  title: text("title").notNull(),
  description: text("description").notNull(),
  issueDate: timestamp("issue_date").notNull(),
  expiryDate: timestamp("expiry_date"),
  verificationHash: text("verification_hash").notNull().unique(),
  qrCodeData: text("qr_code_data").notNull(),
  certificateTemplate: text("certificate_template").notNull(), // Template ID/name
  metadata: json("metadata"), // Course details, grades, instructor info
  isActive: boolean("is_active").notNull().default(true),
  downloadCount: integer("download_count").notNull().default(0),
  lastDownloaded: timestamp("last_downloaded"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull()
});

// Real-time Google Classroom training progress tracking
export const classroomProgress = pgTable("classroom_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  classroomCourseId: text("classroom_course_id").notNull(),
  assignmentId: text("assignment_id"),
  progressType: text("progress_type").notNull(), // assignment_submitted, assignment_graded, course_milestone
  progressValue: decimal("progress_value", { precision: 5, scale: 2 }), // 0-100 percentage
  details: json("details"), // Assignment details, grades, feedback
  lastSyncDate: timestamp("last_sync_date").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull()
});

// Training analytics and insights
export const trainingAnalytics = pgTable("training_analytics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  analysisDate: timestamp("analysis_date").notNull(),
  totalCoursesEnrolled: integer("total_courses_enrolled").notNull().default(0),
  totalCoursesCompleted: integer("total_courses_completed").notNull().default(0),
  averageGrade: decimal("average_grade", { precision: 5, scale: 2 }),
  totalStudyHours: decimal("total_study_hours", { precision: 8, scale: 2 }),
  competencyScore: decimal("competency_score", { precision: 5, scale: 2 }), // 0-100 overall competency
  trainingEfficiency: decimal("training_efficiency", { precision: 5, scale: 2 }), // completion rate vs time
  strongAreas: json("strong_areas"), // Areas of excellence
  improvementAreas: json("improvement_areas"), // Areas needing attention
  recommendedCourses: json("recommended_courses"), // AI-suggested next courses
  readinessLevel: text("readiness_level").notNull(), // not_ready, basic_ready, field_ready, expert_ready
  lastUpdated: timestamp("last_updated").default(sql`CURRENT_TIMESTAMP`).notNull()
});

// Google Classroom schemas
export const insertGoogleClassroomTokenSchema = createInsertSchema(googleClassroomTokens).omit({ id: true, createdAt: true, updatedAt: true });
export const insertClassroomCourseSchema = createInsertSchema(classroomCourses).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTrainingCompletionSchema = createInsertSchema(trainingCompletions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCertificateSchema = createInsertSchema(certificates).omit({ id: true, createdAt: true });
export const insertClassroomProgressSchema = createInsertSchema(classroomProgress).omit({ id: true, createdAt: true });
export const insertTrainingAnalyticsSchema = createInsertSchema(trainingAnalytics).omit({ id: true, lastUpdated: true });

// Google Classroom types
export type GoogleClassroomToken = typeof googleClassroomTokens.$inferSelect;
export type ClassroomCourse = typeof classroomCourses.$inferSelect;
export type TrainingCompletion = typeof trainingCompletions.$inferSelect;
export type Certificate = typeof certificates.$inferSelect;
export type ClassroomProgress = typeof classroomProgress.$inferSelect;
export type TrainingAnalytics = typeof trainingAnalytics.$inferSelect;

// Social Media Posts table for storing X/Twitter posts
export const socialMediaPosts = pgTable('social_media_posts', {
  id: serial('id').primaryKey(),
  platform: text('platform').notNull().default('twitter'), // 'twitter', 'facebook', 'instagram', etc.
  postId: text('post_id').notNull().unique(), // Original post ID from the platform
  author: text('author').notNull(), // Username or handle
  content: text('content').notNull(), // Post content/text
  location: text('location'), // Geographic location if available
  mediaUrls: text('media_urls').array(), // URLs to images/videos
  hashtags: text('hashtags').array(), // Hashtags used
  mentions: text('mentions').array(), // User mentions
  retweets: integer('retweets').default(0),
  likes: integer('likes').default(0),
  replies: integer('replies').default(0),
  createdAt: timestamp('created_at').notNull(), // Original post timestamp
  updatedAt: timestamp('updated_at').defaultNow().notNull() // When we last updated this record
});

// Sentiment Analysis table for storing Grok API 4 analysis results
export const sentimentAnalysis = pgTable('sentiment_analysis', {
  id: serial('id').primaryKey(),
  postId: text('post_id').notNull().references(() => socialMediaPosts.postId, { onDelete: 'cascade' }),
  sentiment: text('sentiment').notNull(), // 'positive', 'negative', 'neutral'
  confidence: real('confidence').notNull(), // 0.0 to 1.0
  relevanceScore: real('relevance_score').notNull(), // 0.0 to 10.0
  topics: text('topics').array(), // Extracted topics/themes
  parish: text('parish'), // Jamaica parish if detected
  riskLevel: text('risk_level').notNull(), // 'low', 'medium', 'high'
  summary: text('summary'), // AI-generated summary
  keyPoints: text('key_points').array(), // Key points from analysis
  isActionable: boolean('is_actionable').default(false), // Whether this requires action
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Social Media schemas
export const insertSocialMediaPostSchema = createInsertSchema(socialMediaPosts).omit({ id: true, updatedAt: true });
export const insertSentimentAnalysisSchema = createInsertSchema(sentimentAnalysis).omit({ id: true, createdAt: true, updatedAt: true });

// Social Media types
export type SocialMediaPost = typeof socialMediaPosts.$inferSelect;
export type SentimentAnalysis = typeof sentimentAnalysis.$inferSelect;

// Re-exporting Zod for use in other files if needed, or can be imported directly
export { z as zod };
