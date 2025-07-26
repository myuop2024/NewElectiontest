import { pgTable, text, serial, integer, boolean, timestamp, json, decimal, varchar } from "drizzle-orm/pg-core";
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
  parish: text("parish"), // Parish name for easier querying
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  capacity: integer("capacity"),
  isActive: boolean("is_active").notNull().default(true),
  isTestData: boolean("is_test_data").notNull().default(false), // Mark as removable test data
  dataSource: text("data_source"), // ECJ_2024, manual, etc.
  extractedFrom: text("extracted_from"), // Document source
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

// X (Twitter) Social Media Posts for Sentiment Analysis
export const xSocialPosts = pgTable("x_social_posts", {
  id: serial("id").primaryKey(),
  postId: text("post_id").notNull().unique(), // X/Twitter post ID
  userId: text("user_id").notNull(), // X/Twitter user ID
  username: text("username").notNull(),
  displayName: text("display_name").notNull(),
  content: text("content").notNull(),
  url: text("url"),
  publishedAt: timestamp("published_at").notNull(),
  metrics: json("metrics"), // likes, retweets, replies, views
  location: text("location"), // Geo location if available
  parish: text("parish"), // Jamaica parish if detected
  pollingStationId: integer("polling_station_id"), // Reference to polling station if relevant
  platform: text("platform").notNull().default("x"), // x, twitter, threads
  language: text("language").default("en"),
  isVerified: boolean("is_verified").default(false),
  followerCount: integer("follower_count"),
  sourceCredibility: decimal("source_credibility", { precision: 3, scale: 2 }).default('0.50'), // 0-1 credibility score
  processingStatus: text("processing_status").notNull().default("pending"), // pending, processed, failed
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// X Social Media Sentiment Analysis Results
export const xSentimentAnalysis = pgTable("x_sentiment_analysis", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => xSocialPosts.id, { onDelete: "cascade" }),
  overallSentiment: text("overall_sentiment").notNull(), // positive, negative, neutral
  sentimentScore: decimal("sentiment_score", { precision: 4, scale: 3 }).notNull(), // -1.0 to 1.0
  confidence: decimal("confidence", { precision: 4, scale: 3 }).notNull(), // 0.0 to 1.0
  emotions: json("emotions"), // fear, anger, joy, trust, anticipation, disgust, sadness, surprise
  politicalTopics: json("political_topics"), // election, voting, democracy, corruption, candidates
  mentionedParties: json("mentioned_parties"), // JLP, PNP, other political parties
  mentionedPoliticians: json("mentioned_politicians"), // Names of politicians mentioned
  electionKeywords: json("election_keywords"), // voting, ballot, polling station, etc.
  threatLevel: text("threat_level").notNull().default("low"), // low, medium, high, critical
  riskFactors: json("risk_factors"), // violence threats, misinformation, fraud allegations
  credibilityAssessment: json("credibility_assessment"), // source verification, fact-check status
  parishRelevance: decimal("parish_relevance", { precision: 3, scale: 2 }), // 0-1 relevance to parish
  stationRelevance: decimal("station_relevance", { precision: 3, scale: 2 }), // 0-1 relevance to polling station
  aiModel: text("ai_model").notNull().default("grok-4"), // AI model used for analysis
  analysisMetadata: json("analysis_metadata"), // processing details, context, reasoning
  qualityScore: decimal("quality_score", { precision: 3, scale: 2 }), // 0-1 analysis quality
  reviewStatus: text("review_status").notNull().default("auto"), // auto, manual_review, verified
  analyzedAt: timestamp("analyzed_at").notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: integer("reviewed_by"), // Reference to users table
});

// X Social Media Monitoring Configuration
export const xMonitoringConfig = pgTable("x_monitoring_config", {
  id: serial("id").primaryKey(),
  configName: text("config_name").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  monitoringFrequency: integer("monitoring_frequency").notNull().default(15), // minutes
  maxPostsPerSession: integer("max_posts_per_session").notNull().default(100),
  keywords: json("keywords").notNull(), // Array of keywords to monitor
  locations: json("locations").notNull(), // Array of Jamaica parishes/locations
  excludeWords: json("exclude_words"), // Words to exclude from monitoring
  credibilityThreshold: decimal("credibility_threshold", { precision: 3, scale: 2 }).default('0.30'),
  sentimentThreshold: decimal("sentiment_threshold", { precision: 3, scale: 2 }).default('0.75'),
  alertCriteria: json("alert_criteria"), // Conditions that trigger alerts
  parishes: json("parishes"), // Specific parishes to monitor
  pollingStations: json("polling_stations"), // Specific polling stations to monitor
  apiRateLimit: integer("api_rate_limit").default(300), // API calls per 15 minutes
  lastExecuted: timestamp("last_executed"),
  nextExecution: timestamp("next_execution"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// X Social Media Monitoring Alerts
export const xMonitoringAlerts = pgTable("x_monitoring_alerts", {
  id: serial("id").primaryKey(),
  alertType: text("alert_type").notNull(), // sentiment_shift, viral_content, threat_detected, misinformation
  severity: text("severity").notNull(), // low, medium, high, critical
  title: text("title").notNull(),
  description: text("description").notNull(),
  parish: text("parish"),
  pollingStationId: integer("polling_station_id"),
  relatedPostIds: json("related_post_ids"), // Array of post IDs that triggered alert
  sentimentData: json("sentiment_data"), // Aggregated sentiment information
  recommendations: json("recommendations"), // Array of recommended actions
  triggerConditions: json("trigger_conditions"), // What caused the alert
  isResolved: boolean("is_resolved").notNull().default(false),
  resolvedBy: integer("resolved_by"),
  resolvedAt: timestamp("resolved_at"),
  notificationsSent: json("notifications_sent"), // Track which notifications were sent
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// General Real-time Alerts System - For comprehensive alert management
export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: text("severity").notNull(), // 'low', 'medium', 'high', 'critical'
  category: text("category").notNull(), // 'traffic', 'emergency', 'incident', 'weather', 'security'
  status: text("status").notNull().default("active"), // 'active', 'acknowledged', 'resolved', 'escalated'
  
  // Location information
  parish: text("parish"),
  pollingStationId: integer("polling_station_id"),
  coordinates: json("coordinates"), // { lat: number, lng: number }
  
  // Alert metadata
  channels: json("channels").notNull(), // ['sms', 'email', 'push', 'call']
  recipients: json("recipients").notNull(), // Array of user IDs or phone numbers
  
  // Tracking fields
  createdBy: integer("created_by").notNull(),
  acknowledgedBy: integer("acknowledged_by"),
  acknowledgedAt: timestamp("acknowledged_at"),
  resolvedBy: integer("resolved_by"),
  resolvedAt: timestamp("resolved_at"),
  
  // Response metrics
  escalationLevel: integer("escalation_level").notNull().default(1), // 1-5 escalation levels
  responseTime: integer("response_time"), // Minutes from creation to acknowledgment
  impactRadius: integer("impact_radius"), // Meters of impact area
  
  // Additional metadata
  relatedReportId: integer("related_report_id"), // Link to incident report if applicable
  notificationsSent: json("notifications_sent"), // Track which notifications were sent
  alertData: json("alert_data"), // Additional alert-specific data
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
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

export const jamaicaMonitoringConfig = pgTable('jamaica_monitoring_config', {
  id: serial('id').primaryKey(),
  configName: text('config_name').notNull(),
  category: text('category').notNull(), // 'politicians', 'parties', 'commentators', 'constituencies', 'electionKeywords', 'socialIssues', 'customKeywords'
  keywords: text('keywords').array().notNull(),
  isEnabled: boolean('is_enabled').default(true),
  description: text('description'),
  lastUpdated: timestamp('last_updated').defaultNow(),
  createdBy: text('created_by').default('system'),
  priority: integer('priority').default(1) // 1=high, 2=medium, 3=low
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

// X API Connection Status and Health Monitoring for Real Data Verification
export const xApiStatus = pgTable("x_api_status", {
  id: serial("id").primaryKey(),
  isConnected: boolean("is_connected").notNull().default(false),
  connectionType: text("connection_type").notNull().default('demo'), // 'real', 'demo', 'offline'
  lastSuccessfulRequest: timestamp("last_successful_request"),
  lastFailedRequest: timestamp("last_failed_request"),
  dailyRequestCount: integer("daily_request_count").notNull().default(0),
  rateLimitRemaining: integer("rate_limit_remaining"),
  errorMessage: text("error_message"),
  grokApiConnected: boolean("grok_api_connected").notNull().default(false),
  jamaicaContentFiltered: boolean("jamaica_content_filtered").notNull().default(true),
  realDataConfirmed: boolean("real_data_confirmed").notNull().default(false),
  lastHealthCheck: timestamp("last_health_check").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Traffic Analytics History - Store historical traffic data for analysis and prediction
export const trafficAnalyticsHistory = pgTable("traffic_analytics_history", {
  id: serial("id").primaryKey(),
  pollingStationId: integer("polling_station_id").notNull().references(() => pollingStations.id, { onDelete: "cascade" }),
  routeOriginType: text("route_origin_type").notNull(), // 'major_center', 'nearby_area', 'emergency_service'
  routeOriginName: text("route_origin_name").notNull(), // Kingston, Spanish Town, etc.
  routeOriginLat: decimal("route_origin_lat", { precision: 10, scale: 8 }).notNull(),
  routeOriginLng: decimal("route_origin_lng", { precision: 11, scale: 8 }).notNull(),
  routeDestinationLat: decimal("route_destination_lat", { precision: 10, scale: 8 }).notNull(),
  routeDestinationLng: decimal("route_destination_lng", { precision: 11, scale: 8 }).notNull(),
  distance: text("distance").notNull(), // "15.2 km"
  normalDuration: text("normal_duration").notNull(), // "22 mins"
  trafficDuration: text("traffic_duration").notNull(), // "34 mins"
  delayMinutes: integer("delay_minutes").notNull(), // 12
  trafficSeverity: text("traffic_severity").notNull(), // 'light', 'moderate', 'heavy', 'severe'
  averageSpeed: decimal("average_speed", { precision: 5, scale: 2 }), // km/h
  congestionLevel: integer("congestion_level").notNull(), // 1-10 scale
  weatherConditions: text("weather_conditions"), // 'clear', 'rain', 'storm'
  timeOfDay: text("time_of_day").notNull(), // 'morning_rush', 'midday', 'evening_rush', 'night'
  dayOfWeek: text("day_of_week").notNull(), // 'monday', 'tuesday', etc.
  specialEvent: text("special_event"), // 'election_day', 'holiday', 'emergency'
  alternativeRoutesCount: integer("alternative_routes_count").default(0),
  incidentReported: boolean("incident_reported").default(false),
  dataSource: text("data_source").notNull().default('google_maps'), // 'google_maps', 'here_maps', 'manual'
  dataQuality: decimal("data_quality", { precision: 3, scale: 2 }).default('1.00'), // 0-1 quality score
  recordedAt: timestamp("recorded_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Historical Election Data - Store comprehensive Jamaica election data from ECJ AI analysis
export const historicalElectionData = pgTable("historical_election_data", {
  id: serial("id").primaryKey(),
  electionDate: timestamp("election_date").notNull(),
  electionType: text("election_type").notNull(), // 'local_government', 'general', 'by_election'
  parish: text("parish").notNull(),
  constituency: text("constituency"),
  baseTrafficLevel: text("base_traffic_level").notNull(), // 'light', 'moderate', 'heavy', 'severe'
  peakHours: json("peak_hours").notNull(), // Array of time ranges like ['07:00-09:00', '17:00-19:00']
  voterTurnout: decimal("voter_turnout", { precision: 3, scale: 2 }).notNull(), // 0-1
  publicTransportDensity: text("public_transport_density").notNull(), // 'very_low', 'low', 'moderate', 'high', 'very_high'
  roadInfrastructure: text("road_infrastructure").notNull(), // 'rural_limited', 'suburban', 'urban_mixed', 'urban_congested'
  weatherConditions: text("weather_conditions"), // 'clear', 'rainy', 'stormy', 'cloudy'
  specialEvents: json("special_events"), // Array of concurrent events affecting traffic
  observedTrafficPatterns: json("observed_traffic_patterns"), // Detailed traffic observations
  dataSource: text("data_source").notNull(), // 'official_records', 'observer_reports', 'traffic_analysis'
  dataQuality: text("data_quality").notNull().default('high'), // 'low', 'medium', 'high', 'verified'
  notes: text("notes"),
  
  // Enhanced fields for comprehensive ECJ historical data
  registeredVoters: integer("registered_voters"),
  totalVotesCast: integer("total_votes_cast"),
  totalPollingStations: integer("total_polling_stations"),
  electionOfficials: integer("election_officials"),
  validVotes: integer("valid_votes"),
  rejectedBallots: integer("rejected_ballots"),
  spoiltBallots: integer("spoilt_ballots"),
  pollingStationDetails: json("polling_station_details"), // Detailed station data from AI analysis
  electionMetadata: json("election_metadata"), // Election-specific information
  candidateResults: json("candidate_results"), // Candidate and party results
  ecjDocumentSource: text("ecj_document_source"), // Original ECJ PDF URL
  verificationDate: timestamp("verification_date"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

// Comprehensive Historical Elections - Store detailed data from all ECJ documents (1947-2024)
export const comprehensiveElectionData = pgTable("comprehensive_election_data", {
  id: serial("id").primaryKey(),
  electionDate: timestamp("election_date").notNull(),
  electionType: text("election_type").notNull(), // 'Parish Council', 'General Election', 'Municipal', 'By-Election'
  electionTitle: text("election_title").notNull(),
  electionYear: integer("election_year").notNull(),
  
  // Complete election statistics
  totalRegisteredVoters: integer("total_registered_voters"),
  totalVotesCast: integer("total_votes_cast"),
  overallTurnout: decimal("overall_turnout", { precision: 5, scale: 4 }),
  totalPollingStations: integer("total_polling_stations"),
  totalElectionOfficials: integer("total_election_officials"),
  
  // Parish-level breakdown
  parishResults: json("parish_results"), // Array of all parish results
  candidateResults: json("candidate_results"), // Complete candidate data
  partyPerformance: json("party_performance"), // JLP/PNP performance analysis
  
  // Polling station consolidation
  pollingStationConsolidation: json("polling_station_consolidation"), // Stations with same numbers across elections
  
  // Document and analysis metadata
  originalDocuments: json("original_documents"), // ECJ PDF URLs and titles
  analysisMethod: text("analysis_method").notNull().default('AI_comprehensive_extraction'),
  dataQuality: text("data_quality").notNull().default('ECJ_official_verified'),
  extractionDate: timestamp("extraction_date").notNull().defaultNow(),
  aiModel: text("ai_model").notNull().default('gemini-1.5-flash'),
  
  // Historical context
  historicalSignificance: text("historical_significance"), // Notes about this election's importance
  politicalContext: json("political_context"), // Political climate and key issues
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Polling Station Historical Tracking - Track individual stations across all elections
export const pollingStationHistory = pgTable("polling_station_history", {
  id: serial("id").primaryKey(),
  stationNumber: text("station_number").notNull(),
  currentName: text("current_name").notNull(),
  parish: text("parish").notNull(),
  constituency: text("constituency"),
  address: text("address"),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  
  // Historical tracking
  historicalNames: json("historical_names"), // Array of previous names
  electionsParticipated: json("elections_participated"), // Array of election records
  voterRegistrationHistory: json("voter_registration_history"), // Registration trends
  turnoutHistory: json("turnout_history"), // Turnout patterns over time
  infrastructureChanges: json("infrastructure_changes"), // Location/facility changes
  
  // Performance metrics
  firstElectionDate: timestamp("first_election_date"),
  lastElectionDate: timestamp("last_election_date"),
  totalElections: integer("total_elections").default(0),
  averageTurnout: decimal("average_turnout", { precision: 5, scale: 4 }),
  averageRegistration: integer("average_registration"),
  peakTurnoutElection: text("peak_turnout_election"),
  lowestTurnoutElection: text("lowest_turnout_election"),
  
  // AI-generated insights
  performanceTrends: json("performance_trends"), // AI analysis of trends
  riskFactors: json("risk_factors"), // Historical risk patterns
  recommendations: json("recommendations"), // AI recommendations for this station
  
  dataSource: text("data_source").notNull().default('ECJ_AI_comprehensive'),
  lastAnalyzed: timestamp("last_analyzed").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Traffic Predictions - AI-powered traffic forecasting for election day planning
export const trafficPredictions = pgTable("traffic_predictions", {
  id: serial("id").primaryKey(),
  pollingStationId: integer("polling_station_id").notNull().references(() => pollingStations.id, { onDelete: "cascade" }),
  predictionType: text("prediction_type").notNull(), // 'election_day', 'peak_hours', 'emergency_scenario'
  targetDate: timestamp("target_date").notNull(),
  timeSlot: text("time_slot").notNull(), // '06:00-09:00', '09:00-12:00', etc.
  routeOriginType: text("route_origin_type").notNull(),
  routeOriginName: text("route_origin_name").notNull(),
  predictedDelayMinutes: integer("predicted_delay_minutes").notNull(),
  predictedTrafficSeverity: text("predicted_traffic_severity").notNull(),
  confidenceScore: decimal("confidence_score", { precision: 3, scale: 2 }).notNull(), // 0-1
  voterTurnoutImpact: text("voter_turnout_impact"), // 'low', 'medium', 'high'
  alternativeRouteRecommended: boolean("alternative_route_recommended").default(false),
  emergencyAccessRisk: text("emergency_access_risk"), // 'low', 'medium', 'high', 'critical'
  aiModel: text("ai_model").notNull().default('gemini-1.5-flash'),
  trainingDataPoints: integer("training_data_points").notNull(),
  baselineComparison: json("baseline_comparison"), // Historical comparison data
  factorsConsidered: json("factors_considered"), // Weather, events, historical patterns
  recommendations: json("recommendations"), // Array of recommended actions
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Traffic Alerts - Real-time alert system for traffic disruptions and incidents
export const trafficAlerts = pgTable("traffic_alerts", {
  id: serial("id").primaryKey(),
  alertType: text("alert_type").notNull(), // 'heavy_traffic', 'road_closure', 'accident', 'flooding', 'emergency'
  severity: text("severity").notNull(), // 'low', 'medium', 'high', 'critical'
  title: text("title").notNull(),
  description: text("description").notNull(),
  affectedPollingStations: json("affected_polling_stations").notNull(), // Array of station IDs
  affectedRoutes: json("affected_routes").notNull(), // Array of route descriptions
  location: json("location").notNull(), // { lat, lng, address, parish }
  estimatedDuration: text("estimated_duration"), // "30 minutes", "2 hours", "unknown"
  trafficImpact: text("traffic_impact").notNull(), // 'minor_delays', 'major_delays', 'route_blocked', 'area_inaccessible'
  alternativeRoutes: json("alternative_routes"), // Array of suggested routes
  emergencyServicesNotified: boolean("emergency_services_notified").default(false),
  observersNotified: boolean("observers_notified").default(false),
  voterTransportImpact: text("voter_transport_impact"), // 'none', 'minor', 'significant', 'severe'
  recommendedActions: json("recommended_actions"), // Array of action items
  dataSource: text("data_source").notNull(), // 'google_maps', 'manual_report', 'observer_report'
  reportedBy: integer("reported_by"), // User ID if manually reported
  verifiedBy: integer("verified_by"), // User ID who verified the alert
  isActive: boolean("is_active").notNull().default(true),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: integer("resolved_by"),
  resolutionNotes: text("resolution_notes"),
  notificationsSent: json("notifications_sent"), // Track SMS/WhatsApp/Email notifications
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Observer Route Optimization - Dynamic route assignment for field observers
export const observerRouteOptimization = pgTable("observer_route_optimization", {
  id: serial("id").primaryKey(),
  observerId: integer("observer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  routeType: text("route_type").notNull(), // 'daily_patrol', 'station_to_station', 'emergency_response', 'transport_voters'
  startLocationLat: decimal("start_location_lat", { precision: 10, scale: 8 }).notNull(),
  startLocationLng: decimal("start_location_lng", { precision: 11, scale: 8 }).notNull(),
  endLocationLat: decimal("end_location_lat", { precision: 10, scale: 8 }).notNull(),
  endLocationLng: decimal("end_location_lng", { precision: 11, scale: 8 }).notNull(),
  waypoints: json("waypoints"), // Array of intermediate polling stations
  optimizedRoute: json("optimized_route"), // Google Maps route data
  estimatedDuration: text("estimated_duration").notNull(),
  estimatedDistance: text("estimated_distance").notNull(),
  trafficAwareness: boolean("traffic_awareness").notNull().default(true),
  avoidTolls: boolean("avoid_tolls").notNull().default(true),
  avoidHighways: boolean("avoid_highways").notNull().default(false),
  priorityLevel: text("priority_level").notNull().default('normal'), // 'low', 'normal', 'high', 'emergency'
  assignmentDate: timestamp("assignment_date").notNull(),
  scheduledStartTime: timestamp("scheduled_start_time").notNull(),
  actualStartTime: timestamp("actual_start_time"),
  actualEndTime: timestamp("actual_end_time"),
  routeStatus: text("route_status").notNull().default('planned'), // 'planned', 'active', 'completed', 'cancelled'
  completionNotes: text("completion_notes"),
  fuelEstimate: decimal("fuel_estimate", { precision: 6, scale: 2 }), // Liters
  mileageRate: decimal("mileage_rate", { precision: 5, scale: 2 }), // JMD per km
  totalCostEstimate: decimal("total_cost_estimate", { precision: 8, scale: 2 }), // JMD
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Emergency Route Planning - Critical path analysis for emergency services
export const emergencyRoutePlanning = pgTable("emergency_route_planning", {
  id: serial("id").primaryKey(),
  emergencyType: text("emergency_type").notNull(), // 'medical', 'security', 'fire', 'evacuation', 'ballot_transport'
  sourceLocationLat: decimal("source_location_lat", { precision: 10, scale: 8 }).notNull(),
  sourceLocationLng: decimal("source_location_lng", { precision: 11, scale: 8 }).notNull(),
  destinationPollingStationId: integer("destination_polling_station_id").references(() => pollingStations.id),
  destinationLat: decimal("destination_lat", { precision: 10, scale: 8 }).notNull(),
  destinationLng: decimal("destination_lng", { precision: 11, scale: 8 }).notNull(),
  primaryRoute: json("primary_route").notNull(), // Main emergency route
  backupRoute1: json("backup_route1"), // First alternative
  backupRoute2: json("backup_route2"), // Second alternative
  accessibilityRequirements: json("accessibility_requirements"), // Wheelchair, stretcher, large vehicle
  responseTimeTarget: integer("response_time_target"), // Minutes
  currentTrafficConditions: json("current_traffic_conditions"),
  roadClosureAwareness: json("road_closure_awareness"),
  emergencyServiceType: text("emergency_service_type"), // 'ambulance', 'police', 'fire_department', 'jdf'
  priorityLevel: text("priority_level").notNull().default('high'), // 'medium', 'high', 'critical'
  routeValidatedBy: integer("route_validated_by"), // Emergency coordinator
  lastTrafficUpdate: timestamp("last_traffic_update"),
  routeStatus: text("route_status").notNull().default('active'), // 'active', 'completed', 'blocked', 'rerouted'
  incidentReported: boolean("incident_reported").default(false),
  estimatedArrival: timestamp("estimated_arrival"),
  actualArrival: timestamp("actual_arrival"),
  responseEffectiveness: text("response_effectiveness"), // 'excellent', 'good', 'adequate', 'poor'
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Traffic Heat Map Data - Real-time visualization data for heat map overlays
export const trafficHeatMapData = pgTable("traffic_heat_map_data", {
  id: serial("id").primaryKey(),
  pollingStationId: integer("polling_station_id").notNull().references(() => pollingStations.id, { onDelete: "cascade" }),
  gridLat: decimal("grid_lat", { precision: 10, scale: 8 }).notNull(), // Grid cell latitude
  gridLng: decimal("grid_lng", { precision: 11, scale: 8 }).notNull(), // Grid cell longitude
  intensity: decimal("intensity", { precision: 3, scale: 2 }).notNull(), // 0-1 intensity for heat map
  trafficDensity: integer("traffic_density").notNull(), // 1-10 density scale
  averageSpeed: decimal("average_speed", { precision: 5, scale: 2 }), // km/h
  congestionLevel: text("congestion_level").notNull(), // 'free_flow', 'light', 'moderate', 'heavy', 'stop_and_go'
  roadType: text("road_type"), // 'highway', 'arterial', 'collector', 'local'
  directionality: text("directionality"), // 'toward_station', 'away_from_station', 'bidirectional'
  timeWindow: text("time_window").notNull(), // '06:00-07:00', etc.
  dataPoints: integer("data_points").notNull(), // Number of measurements
  confidenceLevel: decimal("confidence_level", { precision: 3, scale: 2 }).default('1.00'),
  weatherImpact: text("weather_impact"), // 'none', 'light', 'moderate', 'severe'
  specialEventImpact: boolean("special_event_impact").default(false),
  lastCalculated: timestamp("last_calculated").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(), // When this data becomes stale
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Critical Path Analysis - Identify most vulnerable polling stations
export const criticalPathAnalysis = pgTable("critical_path_analysis", {
  id: serial("id").primaryKey(),
  pollingStationId: integer("polling_station_id").notNull().references(() => pollingStations.id, { onDelete: "cascade" }),
  vulnerabilityScore: decimal("vulnerability_score", { precision: 4, scale: 3 }).notNull(), // 0-1
  accessibilityRating: text("accessibility_rating").notNull(), // 'excellent', 'good', 'fair', 'poor', 'critical'
  primaryAccessRoutes: json("primary_access_routes").notNull(), // Main routes to station
  backupAccessRoutes: json("backup_access_routes"), // Alternative routes
  emergencyAccessRoutes: json("emergency_access_routes"), // Emergency service routes
  chokePoints: json("choke_points"), // Traffic bottlenecks
  riskFactors: json("risk_factors"), // Weather, events, infrastructure
  voterAccessibilityImpact: text("voter_accessibility_impact"), // 'minimal', 'moderate', 'significant', 'severe'
  emergencyResponseCapability: text("emergency_response_capability"), // 'excellent', 'good', 'limited', 'poor'
  transportationOptions: json("transportation_options"), // Public transport, parking, etc.
  mitigationStrategies: json("mitigation_strategies"), // Recommended actions
  monitoringPriority: text("monitoring_priority").notNull(), // 'low', 'medium', 'high', 'critical'
  lastAssessment: timestamp("last_assessment").notNull().defaultNow(),
  nextReviewDate: timestamp("next_review_date"),
  assessedBy: integer("assessed_by").notNull(),
  approvedBy: integer("approved_by"),
  implementationStatus: json("implementation_status"), // Track mitigation progress
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

// Historical Election Data relations
export const historicalElectionDataRelations = relations(historicalElectionData, ({ one }) => ({
  // No direct relations to other tables - standalone historical data
}));

// Traffic table relations
export const trafficAnalyticsHistoryRelations = relations(trafficAnalyticsHistory, ({ one }) => ({
  pollingStation: one(pollingStations, { fields: [trafficAnalyticsHistory.pollingStationId], references: [pollingStations.id] }),
}));

export const trafficPredictionsRelations = relations(trafficPredictions, ({ one }) => ({
  pollingStation: one(pollingStations, { fields: [trafficPredictions.pollingStationId], references: [pollingStations.id] }),
}));

export const trafficAlertsRelations = relations(trafficAlerts, ({ one }) => ({
  reportedByUser: one(users, { fields: [trafficAlerts.reportedBy], references: [users.id] }),
  verifiedByUser: one(users, { fields: [trafficAlerts.verifiedBy], references: [users.id] }),
  resolvedByUser: one(users, { fields: [trafficAlerts.resolvedBy], references: [users.id] }),
}));

export const observerRouteOptimizationRelations = relations(observerRouteOptimization, ({ one }) => ({
  observer: one(users, { fields: [observerRouteOptimization.observerId], references: [users.id] }),
  createdByUser: one(users, { fields: [observerRouteOptimization.createdBy], references: [users.id] }),
}));

export const emergencyRoutePlanningRelations = relations(emergencyRoutePlanning, ({ one }) => ({
  destinationStation: one(pollingStations, { fields: [emergencyRoutePlanning.destinationPollingStationId], references: [pollingStations.id] }),
  validatedByUser: one(users, { fields: [emergencyRoutePlanning.routeValidatedBy], references: [users.id] }),
}));

export const trafficHeatMapDataRelations = relations(trafficHeatMapData, ({ one }) => ({
  pollingStation: one(pollingStations, { fields: [trafficHeatMapData.pollingStationId], references: [pollingStations.id] }),
}));

export const criticalPathAnalysisRelations = relations(criticalPathAnalysis, ({ one }) => ({
  pollingStation: one(pollingStations, { fields: [criticalPathAnalysis.pollingStationId], references: [pollingStations.id] }),
  assessedByUser: one(users, { fields: [criticalPathAnalysis.assessedBy], references: [users.id] }),
  approvedByUser: one(users, { fields: [criticalPathAnalysis.approvedBy], references: [users.id] }),
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

export const alertsRelations = relations(alerts, ({ one }) => ({
  creator: one(users, { fields: [alerts.createdBy], references: [users.id] }),
  acknowledger: one(users, { fields: [alerts.acknowledgedBy], references: [users.id] }),
  resolver: one(users, { fields: [alerts.resolvedBy], references: [users.id] }),
  pollingStation: one(pollingStations, { fields: [alerts.pollingStationId], references: [pollingStations.id] }),
  relatedReport: one(reports, { fields: [alerts.relatedReportId], references: [reports.id] }),
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

// X Social Media Insert Schemas
export const insertXSocialPostSchema = createInsertSchema(xSocialPosts);
export const insertXSentimentAnalysisSchema = createInsertSchema(xSentimentAnalysis);
export const insertXMonitoringConfigSchema = createInsertSchema(xMonitoringConfig);
export const insertXMonitoringAlertSchema = createInsertSchema(xMonitoringAlerts);

// General Alerts Insert Schema
export const insertAlertSchema = createInsertSchema(alerts);

// Traffic Monitoring Insert Schemas
export const insertTrafficAnalyticsHistorySchema = createInsertSchema(trafficAnalyticsHistory);
export const insertTrafficPredictionSchema = createInsertSchema(trafficPredictions);
export const insertTrafficAlertSchema = createInsertSchema(trafficAlerts);
export const insertObserverRouteOptimizationSchema = createInsertSchema(observerRouteOptimization);
export const insertEmergencyRoutePlanningSchema = createInsertSchema(emergencyRoutePlanning);
export const insertTrafficHeatMapDataSchema = createInsertSchema(trafficHeatMapData);
export const insertCriticalPathAnalysisSchema = createInsertSchema(criticalPathAnalysis);

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

// X Social Media Types
export type XSocialPost = typeof xSocialPosts.$inferSelect;
export type XSentimentAnalysis = typeof xSentimentAnalysis.$inferSelect;
export type XMonitoringConfig = typeof xMonitoringConfig.$inferSelect;
export type XMonitoringAlert = typeof xMonitoringAlerts.$inferSelect;

// General Alert Type
export type Alert = typeof alerts.$inferSelect;

export type ChatRoom = typeof chatRooms.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type OnlineUser = typeof onlineUsers.$inferSelect;
export type CertificateTemplate = typeof certificateTemplates.$inferSelect;

// Traffic Monitoring Types
export type TrafficAnalyticsHistory = typeof trafficAnalyticsHistory.$inferSelect;
export type TrafficPrediction = typeof trafficPredictions.$inferSelect;
export type TrafficAlert = typeof trafficAlerts.$inferSelect;
export type ObserverRouteOptimization = typeof observerRouteOptimization.$inferSelect;
export type EmergencyRoutePlanning = typeof emergencyRoutePlanning.$inferSelect;
export type TrafficHeatMapData = typeof trafficHeatMapData.$inferSelect;
export type CriticalPathAnalysis = typeof criticalPathAnalysis.$inferSelect;

// Insert Types
export type InsertUser = typeof users.$inferInsert;
export type InsertParish = typeof parishes.$inferInsert;
export type InsertPollingStation = typeof pollingStations.$inferInsert;
export type InsertAssignment = typeof assignments.$inferInsert;
export type InsertCheckIn = typeof checkIns.$inferInsert;
export type InsertReport = typeof reports.$inferInsert;
export type InsertDocument = typeof documents.$inferInsert;
export type InsertMessage = typeof messages.$inferInsert;
export type InsertCourse = typeof courses.$inferInsert;
export type InsertCourseModule = typeof courseModules.$inferInsert;
export type InsertCourseQuiz = typeof courseQuizzes.$inferInsert;
export type InsertCourseContest = typeof courseContests.$inferInsert;
export type InsertCourseMedia = typeof courseMedia.$inferInsert;
export type InsertCourseLesson = typeof courseLessons.$inferInsert;
export type InsertUserLessonProgress = typeof userLessonProgress.$inferInsert;
export type InsertEnrollment = typeof enrollments.$inferInsert;
export type InsertFAQ = typeof faqs.$inferInsert;
export type InsertNews = typeof news.$inferInsert;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
export type InsertSetting = typeof settings.$inferInsert;
export type InsertChatRoom = typeof chatRooms.$inferInsert;
export type InsertChatMessage = typeof chatMessages.$inferInsert;
export type InsertOnlineUser = typeof onlineUsers.$inferInsert;
export type InsertCertificateTemplate = typeof certificateTemplates.$inferInsert;

// General Alert Insert Type
export type InsertAlert = typeof alerts.$inferInsert;

// Traffic Monitoring Insert Types
export type InsertTrafficAnalyticsHistory = typeof trafficAnalyticsHistory.$inferInsert;
export type InsertTrafficPrediction = typeof trafficPredictions.$inferInsert;
export type InsertTrafficAlert = typeof trafficAlerts.$inferInsert;
export type InsertObserverRouteOptimization = typeof observerRouteOptimization.$inferInsert;
export type InsertEmergencyRoutePlanning = typeof emergencyRoutePlanning.$inferInsert;
export type InsertTrafficHeatMapData = typeof trafficHeatMapData.$inferInsert;
export type InsertCriticalPathAnalysis = typeof criticalPathAnalysis.$inferInsert;

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

// Re-exporting Zod for use in other files if needed, or can be imported directly
export { z as zod };
