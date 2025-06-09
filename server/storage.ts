import {
  users, parishes, pollingStations, assignments, checkIns, reports, documents, messages,
  courses, enrollments, faqs, news, auditLogs, settings,
  type User, type InsertUser, type Parish, type InsertParish, type PollingStation, type InsertPollingStation,
  type Assignment, type InsertAssignment, type CheckIn, type InsertCheckIn, type Report, type InsertReport,
  type Document, type InsertDocument, type Message, type InsertMessage, type Course, type InsertCourse,
  type Enrollment, type InsertEnrollment, type FAQ, type InsertFAQ, type News, type InsertNews,
  type AuditLog, type InsertAuditLog, type Setting, type InsertSetting
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, like, count, sql } from "drizzle-orm";
import crypto from "crypto";

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByObserverId(observerId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;
  getUsersByRole(role: string): Promise<User[]>;
  
  // Observer ID generation
  generateObserverId(): Promise<string>;
  
  // Parishes
  getParishes(): Promise<Parish[]>;
  createParish(parish: InsertParish): Promise<Parish>;
  
  // Polling stations
  getPollingStations(): Promise<PollingStation[]>;
  getPollingStationsByParish(parishId: number): Promise<PollingStation[]>;
  createPollingStation(station: InsertPollingStation): Promise<PollingStation>;
  updatePollingStation(id: number, updates: Partial<PollingStation>): Promise<PollingStation>;
  
  // Assignments
  getAssignments(): Promise<Assignment[]>;
  getAssignmentsByUser(userId: number): Promise<Assignment[]>;
  createAssignment(assignment: InsertAssignment): Promise<Assignment>;
  
  // Check-ins
  getCheckInsByUser(userId: number): Promise<CheckIn[]>;
  createCheckIn(checkIn: InsertCheckIn): Promise<CheckIn>;
  getLatestCheckInByUser(userId: number): Promise<CheckIn | undefined>;
  
  // Reports
  getReports(): Promise<Report[]>;
  getReportsByUser(userId: number): Promise<Report[]>;
  getReportsByStation(stationId: number): Promise<Report[]>;
  createReport(report: InsertReport): Promise<Report>;
  updateReport(id: number, updates: Partial<Report>): Promise<Report>;
  
  // Documents
  getDocuments(): Promise<Document[]>;
  getDocumentsByReport(reportId: number): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, updates: Partial<Document>): Promise<Document>;
  
  // Messages
  getMessages(): Promise<Message[]>;
  getMessagesByRoom(roomId: string): Promise<Message[]>;
  getMessagesBetweenUsers(userId1: number, userId2: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(id: number): Promise<Message>;
  
  // Training
  getCourses(): Promise<Course[]>;
  getCoursesByRole(role: string): Promise<Course[]>;
  createCourse(course: InsertCourse): Promise<Course>;
  getEnrollmentsByUser(userId: number): Promise<Enrollment[]>;
  createEnrollment(enrollment: InsertEnrollment): Promise<Enrollment>;
  updateEnrollment(id: number, updates: Partial<Enrollment>): Promise<Enrollment>;
  
  // FAQ
  getFAQs(): Promise<FAQ[]>;
  getFAQsByCategory(category: string): Promise<FAQ[]>;
  createFAQ(faq: InsertFAQ): Promise<FAQ>;
  updateFAQ(id: number, updates: Partial<FAQ>): Promise<FAQ>;
  
  // News
  getNews(): Promise<News[]>;
  getPublishedNews(): Promise<News[]>;
  createNews(news: InsertNews): Promise<News>;
  updateNews(id: number, updates: Partial<News>): Promise<News>;
  
  // Audit logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(): Promise<AuditLog[]>;
  
  // Settings
  getSettings(): Promise<Setting[]>;
  getSettingByKey(key: string): Promise<Setting | undefined>;
  createSetting(setting: InsertSetting): Promise<Setting>;
  updateSetting(key: string, value: string, updatedBy?: number): Promise<Setting>;
  
  // Analytics
  getDashboardStats(): Promise<{
    totalStations: number;
    activeObservers: number;
    reportsSubmitted: number;
    pendingAlerts: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async generateObserverId(): Promise<string> {
    let observerId: string;
    let exists: User | undefined;
    
    do {
      // Generate 6-digit numeric ID
      observerId = Math.floor(100000 + Math.random() * 900000).toString();
      exists = await this.getUserByObserverId(observerId);
    } while (exists);
    
    return observerId;
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByObserverId(observerId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.observerId, observerId));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const observerId = await this.generateObserverId();
    const [user] = await db
      .insert(users)
      .values({ ...insertUser, observerId })
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role));
  }

  async getParishes(): Promise<Parish[]> {
    return await db.select().from(parishes).orderBy(parishes.name);
  }

  async createParish(parish: InsertParish): Promise<Parish> {
    const [newParish] = await db.insert(parishes).values(parish).returning();
    return newParish;
  }

  async getPollingStations(): Promise<PollingStation[]> {
    return await db.select().from(pollingStations).orderBy(pollingStations.stationCode);
  }

  async getPollingStationsByParish(parishId: number): Promise<PollingStation[]> {
    return await db.select().from(pollingStations).where(eq(pollingStations.parishId, parishId));
  }

  async createPollingStation(station: InsertPollingStation): Promise<PollingStation> {
    const [newStation] = await db.insert(pollingStations).values(station).returning();
    return newStation;
  }

  async updatePollingStation(id: number, updates: Partial<PollingStation>): Promise<PollingStation> {
    const [station] = await db
      .update(pollingStations)
      .set(updates)
      .where(eq(pollingStations.id, id))
      .returning();
    return station;
  }

  async getAssignments(): Promise<Assignment[]> {
    return await db.select().from(assignments).orderBy(desc(assignments.createdAt));
  }

  async getAssignmentsByUser(userId: number): Promise<Assignment[]> {
    return await db.select().from(assignments).where(eq(assignments.userId, userId));
  }

  async createAssignment(assignment: InsertAssignment): Promise<Assignment> {
    const [newAssignment] = await db.insert(assignments).values(assignment).returning();
    return newAssignment;
  }

  async updateAssignment(id: number, updates: Partial<Assignment>): Promise<Assignment> {
    const [assignment] = await db
      .update(assignments)
      .set(updates)
      .where(eq(assignments.id, id))
      .returning();
    return assignment;
  }

  async getCheckInsByUser(userId: number): Promise<CheckIn[]> {
    return await db.select().from(checkIns).where(eq(checkIns.userId, userId)).orderBy(desc(checkIns.timestamp));
  }

  async createCheckIn(checkIn: InsertCheckIn): Promise<CheckIn> {
    const [newCheckIn] = await db.insert(checkIns).values(checkIn).returning();
    return newCheckIn;
  }

  async getLatestCheckInByUser(userId: number): Promise<CheckIn | undefined> {
    const [checkIn] = await db
      .select()
      .from(checkIns)
      .where(eq(checkIns.userId, userId))
      .orderBy(desc(checkIns.timestamp))
      .limit(1);
    return checkIn || undefined;
  }

  async getReports(): Promise<Report[]> {
    return await db.select().from(reports).orderBy(desc(reports.createdAt));
  }

  async getReportsByUser(userId: number): Promise<Report[]> {
    return await db.select().from(reports).where(eq(reports.userId, userId)).orderBy(desc(reports.createdAt));
  }

  async getReportsByStation(stationId: number): Promise<Report[]> {
    return await db.select().from(reports).where(eq(reports.stationId, stationId)).orderBy(desc(reports.createdAt));
  }

  async createReport(report: InsertReport): Promise<Report> {
    const [newReport] = await db.insert(reports).values(report).returning();
    return newReport;
  }

  async updateReport(id: number, updates: Partial<Report>): Promise<Report> {
    const [report] = await db
      .update(reports)
      .set(updates)
      .where(eq(reports.id, id))
      .returning();
    return report;
  }

  async getDocuments(): Promise<Document[]> {
    return await db.select().from(documents).orderBy(desc(documents.createdAt));
  }

  async getDocumentsByReport(reportId: number): Promise<Document[]> {
    return await db.select().from(documents).where(eq(documents.reportId, reportId));
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const [newDocument] = await db.insert(documents).values(document).returning();
    return newDocument;
  }

  async updateDocument(id: number, updates: Partial<Document>): Promise<Document> {
    const [document] = await db
      .update(documents)
      .set(updates)
      .where(eq(documents.id, id))
      .returning();
    return document;
  }

  async getMessages(): Promise<Message[]> {
    return await db.select().from(messages).orderBy(desc(messages.createdAt));
  }

  async getMessagesByRoom(roomId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.roomId, roomId))
      .orderBy(messages.createdAt);
  }

  async getMessagesBetweenUsers(userId1: number, userId2: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(
        or(
          and(eq(messages.senderId, userId1), eq(messages.recipientId, userId2)),
          and(eq(messages.senderId, userId2), eq(messages.recipientId, userId1))
        )
      )
      .orderBy(messages.createdAt);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }

  async markMessageAsRead(id: number): Promise<Message> {
    const [message] = await db
      .update(messages)
      .set({ isRead: true })
      .where(eq(messages.id, id))
      .returning();
    return message;
  }

  async getCourses(): Promise<Course[]> {
    return await db.select().from(courses).where(eq(courses.isActive, true));
  }

  async getCoursesByRole(role: string): Promise<Course[]> {
    return await db.select().from(courses).where(and(eq(courses.role, role), eq(courses.isActive, true)));
  }

  async createCourse(course: InsertCourse): Promise<Course> {
    const [newCourse] = await db.insert(courses).values(course).returning();
    return newCourse;
  }

  async getEnrollmentsByUser(userId: number): Promise<Enrollment[]> {
    return await db.select().from(enrollments).where(eq(enrollments.userId, userId));
  }

  async createEnrollment(enrollment: InsertEnrollment): Promise<Enrollment> {
    const [newEnrollment] = await db.insert(enrollments).values(enrollment).returning();
    return newEnrollment;
  }

  async updateEnrollment(id: number, updates: Partial<Enrollment>): Promise<Enrollment> {
    const [enrollment] = await db
      .update(enrollments)
      .set(updates)
      .where(eq(enrollments.id, id))
      .returning();
    return enrollment;
  }

  async getFAQs(): Promise<FAQ[]> {
    return await db.select().from(faqs).where(eq(faqs.isActive, true));
  }

  async getFAQsByCategory(category: string): Promise<FAQ[]> {
    return await db.select().from(faqs).where(and(eq(faqs.category, category), eq(faqs.isActive, true)));
  }

  async createFAQ(faq: InsertFAQ): Promise<FAQ> {
    const [newFAQ] = await db.insert(faqs).values(faq).returning();
    return newFAQ;
  }

  async updateFAQ(id: number, updates: Partial<FAQ>): Promise<FAQ> {
    const [faq] = await db
      .update(faqs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(faqs.id, id))
      .returning();
    return faq;
  }

  async getNews(): Promise<News[]> {
    return await db.select().from(news).orderBy(desc(news.createdAt));
  }

  async getPublishedNews(): Promise<News[]> {
    return await db.select().from(news).where(eq(news.isPublished, true)).orderBy(desc(news.publishedAt));
  }

  async createNews(newsItem: InsertNews): Promise<News> {
    const [newNews] = await db.insert(news).values(newsItem).returning();
    return newNews;
  }

  async updateNews(id: number, updates: Partial<News>): Promise<News> {
    const [newsItem] = await db
      .update(news)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(news.id, id))
      .returning();
    return newsItem;
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [auditLog] = await db.insert(auditLogs).values(log).returning();
    return auditLog;
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    return await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(1000);
  }

  async getSettings(): Promise<Setting[]> {
    return await db.select().from(settings);
  }

  async getSettingByKey(key: string): Promise<Setting | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting || undefined;
  }

  async createSetting(setting: InsertSetting): Promise<Setting> {
    const [newSetting] = await db.insert(settings).values(setting).returning();
    return newSetting;
  }

  async updateSetting(key: string, value: string, updatedBy?: number): Promise<Setting> {
    // Try to update existing setting first
    const [setting] = await db
      .update(settings)
      .set({ value, updatedBy, updatedAt: new Date() })
      .where(eq(settings.key, key))
      .returning();
    
    // If no setting was updated, create a new one
    if (!setting) {
      return await this.createSetting({
        key,
        value,
        category: "api",
        description: `API configuration for ${key}`,
        updatedBy
      });
    }
    
    return setting;
  }

  async getDashboardStats(): Promise<{
    totalStations: number;
    activeObservers: number;
    reportsSubmitted: number;
    pendingAlerts: number;
  }> {
    const [stationsCount] = await db.select({ count: count() }).from(pollingStations);
    const [observersCount] = await db.select({ count: count() }).from(users).where(eq(users.status, "active"));
    const [reportsCount] = await db.select({ count: count() }).from(reports);
    const [alertsCount] = await db.select({ count: count() }).from(reports).where(eq(reports.priority, "critical"));

    return {
      totalStations: stationsCount.count,
      activeObservers: observersCount.count,
      reportsSubmitted: reportsCount.count,
      pendingAlerts: alertsCount.count,
    };
  }
}

export const storage = new DatabaseStorage();
