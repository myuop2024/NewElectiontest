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
  phone: text("phone"),
  trn: text("trn"), // Tax Registration Number (Jamaica)
  parishId: integer("parish_id"),
  address: text("address"), // Full Jamaican address
  community: text("community"), // Community/District within parish
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  role: text("role").notNull().default("observer"), // observer, admin, coordinator
  status: text("status").notNull().default("pending"), // pending, active, suspended
  deviceId: text("device_id"),
  lastLogin: timestamp("last_login"),
  kycStatus: text("kyc_status").notNull().default("pending"), // pending, verified, rejected
  trainingStatus: text("training_status").notNull().default("incomplete"), // incomplete, completed, certified
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

// Training courses and progress
export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  role: text("role").notNull(), // indoor_agent, roving_observer, parish_coordinator
  content: json("content"), // Course modules and materials
  duration: integer("duration"), // in minutes
  passingScore: integer("passing_score").notNull().default(80),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
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

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  assignments: many(assignments),
  checkIns: many(checkIns),
  reports: many(reports),
  documents: many(documents),
  sentMessages: many(messages, { relationName: "sender" }),
  receivedMessages: many(messages, { relationName: "recipient" }),
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

// Types
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
